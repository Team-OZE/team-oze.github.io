import type { RowDataPacket } from "mysql2";
import { getDatabasePool } from "./database";
import {
  cachedW3ChampionsMmrForMode,
  getCachedW3ChampionsBattleTagsInMmrRange,
  getCachedW3ChampionsMmrByModeMap,
  normalizeBattleTag,
  w3ChampionsGameModeForTeamSize
} from "./playerElo";
import {
  type EloRange,
  type GameModeOption,
  type GamesPage,
  type Player,
  type PlayerSearchGroup,
  type Replay,
  type Team
} from "./replayTypes";

type GamesPageArgs = {
  page?: number;
  pageSize?: number;
  mode?: string | null;
  gameMode?: string | null;
  player?: string | null;
  eloMin?: number | null;
  eloMax?: number | null;
  groupPages?: Record<string, number>;
};

type MatchRow = RowDataPacket & {
  id: number;
  mmId: string;
  startedAt: string;
  finishedAt: string;
  winningTeamId: number | null;
  mapVersion: string;
  gameMode: string | null;
  kingSpell: string | null;
};

type PlayerRow = RowDataPacket & {
  matchId: number;
  playerId: number;
  battleTag: string;
};

type OptionRow = RowDataPacket & {
  label: string;
  count: number;
};

type CountRow = RowDataPacket & {
  count: number;
};

type EloRangePlayerRow = RowDataPacket & {
  battleTag: string;
};

type PlayerSearchGroupRow = RowDataPacket & {
  mode: string;
  gameMode: string;
  count: number;
};

const sourceName = "database";
const defaultPageSize = 8;
const maxPageSize = 50;
const minPlayerSearchLength = 3;
const playerCountJoin = `LEFT JOIN (
       SELECT match_id, COUNT(*) AS player_count
       FROM players
       WHERE battle_tag <> '' AND battle_tag <> 'FLO'
       GROUP BY match_id
     ) pc ON pc.match_id = m.id`;
const gameInitJoin = `LEFT JOIN (
       SELECT a.match_id, r.king_spell, r.map_version
       FROM records_game_init r
       INNER JOIN actions a ON a.id = r.action_id
     ) gi ON gi.match_id = m.id`;
const teamSizeExpression = "GREATEST(1, CEIL(COALESCE(pc.player_count, 0) / 2))";
const modeExpression = `CONCAT('Legion TD ', ${teamSizeExpression}, 'v', ${teamSizeExpression})`;
const gameModeExpression = "COALESCE(m.gamemode, 'Unknown')";
const playerSearchTeamSizeExpression = "GREATEST(1, CEIL(COALESCE(search_matches.player_count, 0) / 2))";
const playerSearchModeExpression = `CONCAT('Legion TD ', ${playerSearchTeamSizeExpression}, 'v', ${playerSearchTeamSizeExpression})`;

export async function getGamesPage(args: GamesPageArgs = {}): Promise<GamesPage> {
  const pool = await getDatabasePool();

  if (!pool) {
    throw new Error("Replay database is not configured or does not contain the replay tables");
  }

  const modes = await loadModeOptions(pool);
  const requestedMode = args.mode && modes.some((mode) => mode.label === args.mode) ? args.mode : null;
  const mode = requestedMode ?? defaultMode(modes);
  const gameModes = await loadGameModeOptions(pool, mode);
  const requestedGameMode =
    args.gameMode && gameModes.some((gameMode) => gameMode.label === args.gameMode) ? args.gameMode : null;
  const selectedGameMode = requestedGameMode ?? defaultGameMode(gameModes);
  const pageSize = normalizeInteger(args.pageSize ?? defaultPageSize, defaultPageSize, 1, maxPageSize);
  const playerQuery = normalizePlayerSearch(args.player);
  const eloRangeBounds = await loadEloRange(pool, { mode, gameMode: selectedGameMode });
  const selectedEloRange = normalizeEloRange(args.eloMin, args.eloMax, eloRangeBounds);
  const eloFilter = selectedEloRange && isEloRangeActive(selectedEloRange) ? selectedEloRange : null;
  const eloBattleTags = await loadEloBattleTagsForRange(eloFilter, mode);
  const hasEmptyEloFilter = Boolean(eloFilter && eloBattleTags?.length === 0);
  const count = playerQuery || hasEmptyEloFilter ? 0 : await loadFilteredMatchCount(pool, { mode, gameMode: selectedGameMode, eloBattleTags });
  const pageCount = Math.max(1, Math.ceil(count / pageSize));
  const page = normalizeInteger(args.page ?? 1, 1, 1, pageCount);
  const offset = (page - 1) * pageSize;
  const matchRows =
    count > 0 && !playerQuery ? await loadMatchPage(pool, { mode, gameMode: selectedGameMode, eloBattleTags, pageSize, offset }) : [];
  const playersByMatch = await loadPlayersForMatches(
    pool,
    matchRows.map((match) => Number(match.id))
  );
  const playerSearch = playerQuery
    ? await loadPlayerSearch(pool, {
        query: playerQuery,
        preferredMode: mode,
        preferredGameMode: selectedGameMode,
        pageSize,
        eloBattleTags,
        groupPages: args.groupPages ?? {}
      })
    : null;

  return {
    source: sourceName,
    count,
    mode,
    modes,
    gameMode: selectedGameMode,
    gameModes,
    eloRange: selectedEloRange,
    page,
    pageSize,
    pageCount,
    replays: matchRows.map((match) => buildReplay(match, playersByMatch.get(Number(match.id)) ?? [])),
    playerSearch
  };
}

async function loadModeOptions(pool: Awaited<ReturnType<typeof getDatabasePool>>) {
  if (!pool) return [];

  const [rows] = await pool.query<OptionRow[]>(
    `SELECT ${modeExpression} AS label, COUNT(*) AS count
     FROM matches m
     ${playerCountJoin}
     GROUP BY label`
  );

  return rows.map(optionFromRow).sort(sortModeOptions);
}

async function loadGameModeOptions(pool: Awaited<ReturnType<typeof getDatabasePool>>, mode: string | null) {
  if (!pool || !mode) return [];

  const [rows] = await pool.query<OptionRow[]>(
    `SELECT ${gameModeExpression} AS label, COUNT(*) AS count
     FROM matches m
     ${playerCountJoin}
     WHERE ${modeExpression} = ?
     GROUP BY label`,
    [mode]
  );

  return rows.map(optionFromRow).sort(sortGameModeOptions);
}

async function loadEloRange(
  pool: Awaited<ReturnType<typeof getDatabasePool>>,
  filters: { mode: string | null; gameMode: string | null }
): Promise<EloRange | null> {
  if (!pool || !filters.mode || !filters.gameMode) return null;

  const w3cGameMode = w3ChampionsGameModeForTeamSize(extractTeamSize(filters.mode));

  if (w3cGameMode === null) {
    return null;
  }

  try {
    const { where, params } = matchFilter({ ...filters, eloBattleTags: null });
    const [rows] = await pool.query<EloRangePlayerRow[]>(
      `SELECT DISTINCT LOWER(p.battle_tag) AS battleTag
       FROM matches m
       ${playerCountJoin}
       INNER JOIN players p
         ON p.match_id = m.id
        AND p.battle_tag <> ''
        AND p.battle_tag <> 'FLO'
       ${where}`,
      params
    );
    const mmrByBattleTag = await getCachedW3ChampionsMmrByModeMap(rows.map((row) => row.battleTag));
    const values = rows
      .map((row) => mmrByBattleTag.get(normalizeBattleTag(row.battleTag))?.get(w3cGameMode))
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    const minElo = Math.min(...values);
    const maxElo = Math.max(...values);

    if (!Number.isFinite(minElo) || !Number.isFinite(maxElo)) {
      return null;
    }

    const min = Math.floor(minElo / 100) * 100;
    const max = Math.ceil(maxElo / 100) * 100;

    if (min >= max) {
      const rounded = Math.round(minElo / 100) * 100;

      return {
        min: rounded - 100,
        max: rounded + 100,
        selectedMin: rounded - 100,
        selectedMax: rounded + 100
      };
    }

    return {
      min,
      max,
      selectedMin: min,
      selectedMax: max
    };
  } catch {
    return null;
  }
}

async function loadFilteredMatchCount(
  pool: Awaited<ReturnType<typeof getDatabasePool>>,
  filters: { mode: string | null; gameMode: string | null; eloBattleTags: string[] | null }
) {
  if (!pool || !filters.mode || !filters.gameMode) return 0;

  const { where, params } = matchFilter(filters);
  const [rows] = await pool.query<CountRow[]>(
    `SELECT COUNT(*) AS count
     FROM matches m
     ${playerCountJoin}
     ${where}`,
    params
  );

  return Number(rows[0]?.count ?? 0);
}

async function loadMatchPage(
  pool: Awaited<ReturnType<typeof getDatabasePool>>,
  filters: { mode: string | null; gameMode: string | null; eloBattleTags: string[] | null; pageSize: number; offset: number }
) {
  if (!pool || !filters.mode || !filters.gameMode) return [];

  const { where, params } = matchFilter(filters);
  const [matchRows] = await pool.query<MatchRow[]>(
    `SELECT
       m.id,
       m.mm_id AS mmId,
       DATE_FORMAT(m.started_at, '%Y-%m-%d %H:%i:%s') AS startedAt,
       DATE_FORMAT(m.finished_at, '%Y-%m-%d %H:%i:%s') AS finishedAt,
       m.winning_team_id AS winningTeamId,
       COALESCE(gi.map_version, m.map_version) AS mapVersion,
       ${gameModeExpression} AS gameMode,
       gi.king_spell AS kingSpell
     FROM matches m
     ${playerCountJoin}
     ${gameInitJoin}
     ${where}
     ORDER BY m.started_at DESC, m.id DESC
     LIMIT ? OFFSET ?`,
    [...params, filters.pageSize, filters.offset]
  );

  return matchRows;
}

async function loadPlayerSearchMatchPage(
  pool: Awaited<ReturnType<typeof getDatabasePool>>,
  filters: { mode: string | null; gameMode: string | null; eloBattleTags: string[] | null; pageSize: number; offset: number; player: string }
) {
  if (!pool || !filters.mode || !filters.gameMode) return [];

  const gameModeFilter = gameModeWhere(filters.gameMode);
  const eloFilter = eloBattleTagsWhere(filters.eloBattleTags);
  const [matchRows] = await pool.query<MatchRow[]>(
    `SELECT
       m.id,
       m.mm_id AS mmId,
       DATE_FORMAT(m.started_at, '%Y-%m-%d %H:%i:%s') AS startedAt,
       DATE_FORMAT(m.finished_at, '%Y-%m-%d %H:%i:%s') AS finishedAt,
       m.winning_team_id AS winningTeamId,
       COALESCE(gi.map_version, m.map_version) AS mapVersion,
       ${gameModeExpression} AS gameMode,
       gi.king_spell AS kingSpell
     FROM ${playerSearchMatchesFrom()}
     ${gameInitJoin}
     WHERE ${playerSearchModeExpression} = ?
       AND ${gameModeFilter.sql}
       ${eloFilter.sql ? `AND ${eloFilter.sql}` : ""}
     ORDER BY m.started_at DESC, m.id DESC
     LIMIT ? OFFSET ?`,
    [
      ...playerSearchParams(filters.player),
      filters.mode,
      ...gameModeFilter.params,
      ...eloFilter.params,
      filters.pageSize,
      filters.offset
    ]
  );

  return matchRows;
}

async function loadPlayerSearch(
  pool: Awaited<ReturnType<typeof getDatabasePool>>,
  args: {
    query: string;
    preferredMode: string | null;
    preferredGameMode: string | null;
    pageSize: number;
    eloBattleTags: string[] | null;
    groupPages: Record<string, number>;
  }
) {
  if (!pool) {
    return null;
  }

  const eloFilter = eloBattleTagsWhere(args.eloBattleTags);
  const [groupRows] = await pool.query<PlayerSearchGroupRow[]>(
    `SELECT
       ${playerSearchModeExpression} AS mode,
       ${gameModeExpression} AS gameMode,
       COUNT(*) AS count
     FROM ${playerSearchMatchesFrom()}
     ${eloFilter.sql ? `WHERE ${eloFilter.sql}` : ""}
     GROUP BY mode, gameMode`,
    [...playerSearchParams(args.query), ...eloFilter.params]
  );
  const groups = groupRows
    .map((row) => ({
      id: playerSearchGroupId(String(row.mode), String(row.gameMode)),
      mode: String(row.mode),
      gameMode: String(row.gameMode),
      count: Number(row.count)
    }))
    .sort((a, b) => sortPlayerSearchGroups(a, b, args.preferredMode, args.preferredGameMode));
  const hydratedGroups: PlayerSearchGroup[] = [];

  for (const group of groups) {
    const pageCount = Math.max(1, Math.ceil(group.count / args.pageSize));
    const page = normalizeInteger(args.groupPages[group.id] ?? 1, 1, 1, pageCount);
    const offset = (page - 1) * args.pageSize;
    const groupRows = await loadPlayerSearchMatchPage(pool, {
      mode: group.mode,
      gameMode: group.gameMode,
      eloBattleTags: args.eloBattleTags,
      pageSize: args.pageSize,
      offset,
      player: args.query
    });
    const playersByMatch = await loadPlayersForMatches(
      pool,
      groupRows.map((match) => Number(match.id))
    );

    hydratedGroups.push({
      ...group,
      page,
      pageSize: args.pageSize,
      pageCount,
      replays: groupRows.map((match) => buildReplay(match, playersByMatch.get(Number(match.id)) ?? []))
    });
  }

  return {
    query: args.query,
    count: groups.reduce((total, group) => total + group.count, 0),
    groups: hydratedGroups
  };
}

async function loadPlayersForMatches(pool: Awaited<ReturnType<typeof getDatabasePool>>, matchIds: number[]) {
  const playersByMatch = new Map<number, Player[]>();

  if (!pool || matchIds.length === 0) {
    return playersByMatch;
  }

  const placeholders = matchIds.map(() => "?").join(", ");
  const [playerRows] = await pool.query<PlayerRow[]>(
    `SELECT match_id AS matchId, player_id AS playerId, battle_tag AS battleTag
     FROM players
     WHERE battle_tag <> '' AND battle_tag <> 'FLO'
       AND match_id IN (${placeholders})
     ORDER BY match_id, player_id`,
    matchIds
  );
  const playerMmrByBattleTag = await getCachedW3ChampionsMmrByModeMap(playerRows.map((row) => row.battleTag));
  const playerCountsByMatch = new Map<number, number>();

  for (const row of playerRows) {
    const matchId = Number(row.matchId);
    playerCountsByMatch.set(matchId, (playerCountsByMatch.get(matchId) ?? 0) + 1);
  }

  for (const row of playerRows) {
    const matchId = Number(row.matchId);
    const players = playersByMatch.get(matchId) ?? [];
    const teamSize = Math.ceil((playerCountsByMatch.get(matchId) ?? 0) / 2);
    const w3cGameMode = w3ChampionsGameModeForTeamSize(teamSize);

    players.push({
      id: Number(row.playerId),
      battleTag: row.battleTag,
      name: playerName(row.battleTag),
      elo: cachedW3ChampionsMmrForMode(playerMmrByBattleTag, row.battleTag, w3cGameMode)
    });
    playersByMatch.set(matchId, players);
  }

  return playersByMatch;
}

function matchFilter(filters: { mode: string | null; gameMode: string | null; eloBattleTags?: string[] | null }) {
  const clauses: string[] = [];
  const params: Array<number | string> = [];

  if (filters.mode) {
    clauses.push(`${modeExpression} = ?`);
    params.push(filters.mode);
  }

  if (filters.gameMode) {
    const gameModeFilter = gameModeWhere(filters.gameMode);
    clauses.push(gameModeFilter.sql);
    params.push(...gameModeFilter.params);
  }

  const eloFilter = eloBattleTagsWhere(filters.eloBattleTags ?? null);

  if (eloFilter.sql) {
    clauses.push(eloFilter.sql);
    params.push(...eloFilter.params);
  }

  return {
    where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    params
  };
}

async function loadEloBattleTagsForRange(range: EloRange | null, mode: string | null) {
  if (!range) {
    return null;
  }

  const gameMode = w3ChampionsGameModeForTeamSize(extractTeamSize(mode ?? ""));

  if (gameMode === null) {
    return [];
  }

  return getCachedW3ChampionsBattleTagsInMmrRange(gameMode, range.selectedMin, range.selectedMax);
}

function normalizeEloRange(rawMin: number | null | undefined, rawMax: number | null | undefined, bounds: EloRange | null) {
  if (!bounds) {
    return null;
  }

  const lower = normalizeEloBound(rawMin, bounds.min, bounds);
  const upper = normalizeEloBound(rawMax, bounds.max, bounds);
  const selectedMin = Math.min(lower, upper);
  const selectedMax = Math.max(lower, upper);

  return {
    ...bounds,
    selectedMin,
    selectedMax
  };
}

function normalizeEloBound(value: number | null | undefined, fallback: number, bounds: EloRange) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  const rounded = Math.round(value / 100) * 100;

  return Math.min(bounds.max, Math.max(bounds.min, rounded));
}

function isEloRangeActive(range: EloRange) {
  return range.selectedMin > range.min || range.selectedMax < range.max;
}

function eloBattleTagsWhere(battleTags: string[] | null) {
  if (!battleTags) {
    return { sql: "", params: [] as string[] };
  }

  const uniqueBattleTags = [...new Set(battleTags.map(normalizeBattleTag).filter(Boolean))];

  if (uniqueBattleTags.length === 0) {
    return { sql: "0 = 1", params: [] as string[] };
  }

  return {
    sql: `EXISTS (
       SELECT 1
       FROM players elo_player
       WHERE elo_player.match_id = m.id
         AND elo_player.battle_tag <> ''
         AND elo_player.battle_tag <> 'FLO'
         AND LOWER(elo_player.battle_tag) IN (${uniqueBattleTags.map(() => "?").join(", ")})
     )`,
    params: uniqueBattleTags
  };
}

function gameModeWhere(gameMode: string | null) {
  if (!gameMode) {
    return { sql: "1 = 1", params: [] as string[] };
  }

  if (gameMode === "Unknown") {
    return { sql: "m.gamemode IS NULL", params: [] as string[] };
  }

  return { sql: "m.gamemode = ?", params: [gameMode] };
}

function normalizePlayerSearch(value: string | null | undefined) {
  const normalized = String(value ?? "").trim().replace(/\s+/g, " ");

  return normalized.length >= minPlayerSearchLength ? normalized.slice(0, 80) : null;
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

function playerSearchParams(query: string) {
  const pattern = `${escapeLike(query.toLowerCase())}%`;

  return [pattern];
}

function playerSearchMatchesFrom() {
  return `(SELECT matching_matches.match_id, COUNT(count_player.player_id) AS player_count
       FROM (
         SELECT DISTINCT search_player.match_id
         FROM players search_player
         WHERE search_player.battle_tag <> ''
           AND search_player.battle_tag <> 'FLO'
           AND LOWER(search_player.battle_tag) LIKE ? ESCAPE '\\\\'
       ) matching_matches
       INNER JOIN players count_player ON count_player.match_id = matching_matches.match_id
       WHERE count_player.battle_tag <> ''
         AND count_player.battle_tag <> 'FLO'
       GROUP BY matching_matches.match_id
     ) search_matches
     STRAIGHT_JOIN matches m ON m.id = search_matches.match_id`;
}

function playerSearchGroupId(mode: string, gameMode: string) {
  return Buffer.from(JSON.stringify([mode, gameMode])).toString("base64url");
}

function sortPlayerSearchGroups(
  a: Pick<PlayerSearchGroup, "mode" | "gameMode" | "count">,
  b: Pick<PlayerSearchGroup, "mode" | "gameMode" | "count">,
  preferredMode: string | null,
  preferredGameMode: string | null
) {
  const score = (group: Pick<PlayerSearchGroup, "mode" | "gameMode">) => {
    if (preferredMode && preferredGameMode && group.mode === preferredMode && group.gameMode === preferredGameMode) {
      return 0;
    }

    if (preferredMode && group.mode === preferredMode) {
      return 1;
    }

    if (preferredGameMode && group.gameMode === preferredGameMode) {
      return 2;
    }

    return 3;
  };

  return (
    score(a) - score(b) ||
    extractTeamSize(b.mode) - extractTeamSize(a.mode) ||
    b.count - a.count ||
    a.gameMode.localeCompare(b.gameMode)
  );
}

function optionFromRow(row: OptionRow): GameModeOption {
  return {
    label: String(row.label),
    count: Number(row.count)
  };
}

function buildReplay(match: MatchRow, playersInput: Player[]): Replay {
  const players = [...playersInput].sort((a, b) => a.id - b.id);
  const splitAt = Math.ceil(players.length / 2);
  const teams: Team[] = [
    {
      id: 0,
      result: match.winningTeamId === null ? "unknown" : Number(match.winningTeamId) === 0 ? "win" : "loss",
      players: players.slice(0, splitAt)
    },
    {
      id: 1,
      result: match.winningTeamId === null ? "unknown" : Number(match.winningTeamId) === 1 ? "win" : "loss",
      players: players.slice(splitAt)
    }
  ];
  const teamSize = Math.max(1, Math.max(teams[0].players.length, teams[1].players.length));
  const durationSeconds = secondsBetween(match.startedAt, match.finishedAt);
  const gameMode = match.gameMode || "Unknown";

  return {
    id: Number(match.id),
    matchId: match.mmId,
    startedAt: match.startedAt,
    finishedAt: match.finishedAt,
    duration: formatDuration(durationSeconds),
    durationSeconds,
    mode: `Legion TD ${teamSize}v${teamSize}`,
    gameMode,
    subMode: gameMode ? `Legion TD: ${gameMode}` : "Legion TD",
    mapVersion: match.mapVersion,
    kingSpell: match.kingSpell,
    winningTeamId: match.winningTeamId === null ? null : Number(match.winningTeamId),
    teams
  };
}

function defaultMode(modes: GameModeOption[]) {
  if (modes.length === 0) {
    return null;
  }

  return modes.find((mode) => mode.label === "Legion TD 2v2")?.label ?? modes[0].label;
}

function defaultGameMode(gameModes: GameModeOption[]) {
  if (gameModes.length === 0) {
    return null;
  }

  return gameModes.find((gameMode) => gameMode.label === "PRACMI")?.label ?? gameModes[0].label;
}

function extractTeamSize(label: string) {
  const match = label.match(/(\d+)v\d+/);
  return match ? Number(match[1]) : 0;
}

function sortModeOptions(a: GameModeOption, b: GameModeOption) {
  return extractTeamSize(b.label) - extractTeamSize(a.label) || a.label.localeCompare(b.label);
}

function sortGameModeOptions(a: GameModeOption, b: GameModeOption) {
  return b.count - a.count || a.label.localeCompare(b.label);
}

function playerName(battleTag: string) {
  return battleTag.split("#")[0] || battleTag;
}

function secondsBetween(startedAt: string, finishedAt: string) {
  const start = Date.parse(`${startedAt.replace(" ", "T")}Z`);
  const finish = Date.parse(`${finishedAt.replace(" ", "T")}Z`);
  return Math.max(0, Math.round((finish - start) / 1000));
}

function formatDuration(totalSeconds: number) {
  const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = Math.floor(totalMinutes % 60).toString().padStart(2, "0");
  const hours = Math.floor(totalMinutes / 60);

  if (hours > 0) {
    return `${hours}:${minutes}:${seconds}`;
  }

  return `${minutes}:${seconds}`;
}

function normalizeInteger(value: number, fallback: number, min: number, max: number) {
  const integer = Math.floor(value);

  if (!Number.isFinite(integer)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, integer));
}
