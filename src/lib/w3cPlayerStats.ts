import type { RowDataPacket } from "mysql2";
import type { Pool } from "mysql2/promise";
import { getDatabasePool } from "./database";
import { iconPathForUnit } from "./unitIcons";
import { displayNameForUnit } from "./unitOverrides";
import { normalizeBattleTag } from "./playerElo";
import { unitTooltipDetail, unitTooltipDetailById } from "./unitTooltipDetails";

const w3ChampionsBaseUrl = "https://website-backend.w3champions.com";
const w3ChampionsProfileBaseUrl = "https://www.w3champions.com/player";
const w3ChampionsGateway = 20;
const w3ChampionsLegion4v4Mode = 202;
const profileFreshMs = 5 * 60 * 1000;
const historicalSeasonFreshMs = 7 * 24 * 60 * 60 * 1000;
const cronDefaultLimit = 36;
const fetchTimeoutMs = 12_000;
const profileSchemaVersion = 2;
const legionSeasonWindowModes = [202, 205, 203, 204];
const w3cPlayerMatchPageSize = 50;
const w3cRelationshipSeasonLimit = 5;

const legionGameModeLabels = new Map<number, string>([
  [202, "Legion 4v4"],
  [203, "Legion 1v1"],
  [204, "Legion 4v4 AT"],
  [205, "Legion 2v2"]
]);

const raceLabels = new Map<number, string>([
  [0, "Random"],
  [1, "Human"],
  [2, "Orc"],
  [4, "Night Elf"],
  [8, "Undead"],
  [16, "Total"],
  [32, "Special"],
  [64, "Starter"]
]);

export type PlayerModeStat = {
  gameMode: number;
  label: string;
  mmr: number | null;
  rank: number | null;
  rankingPoints: number | null;
  topPercent: number | null;
  wins: number;
  losses: number;
  games: number;
  winrate: number | null;
};

export type PlayerRaceStat = {
  race: number;
  label: string;
  wins: number;
  losses: number;
  games: number;
  winrate: number | null;
};

export type UnitPreference = {
  unitType: string;
  unitName: string;
  iconPath: string;
  count: number;
  seen?: number;
  metric?: "roll-pick" | "opening-pick";
  percent: number | null;
};

export type LocalModeStat = {
  mode: string;
  gameMode: string;
  games: number;
  wins: number;
  losses: number;
  winrate: number | null;
};

export type RecentGamePlayer = {
  id: number;
  battleTag: string;
  name: string;
  isProfilePlayer: boolean;
};

export type RecentGameTeam = {
  id: number;
  result: "win" | "loss" | "unknown";
  players: RecentGamePlayer[];
};

export type RecentGame = {
  id: number;
  matchId: string;
  startedAt: string;
  duration: string;
  mode: string;
  gameMode: string;
  result: "win" | "loss" | "unknown";
  profileTeamId: number;
  teams: RecentGameTeam[];
  teammates: string[];
  opponents: string[];
};

export type PlayerRivalry = {
  battleTag: string;
  name: string;
  games: number;
  wins: number;
  losses: number;
  winrate: number | null;
};

export type PlayerRivalryGroup = {
  matchCount?: number;
  mostPlayed: PlayerRivalry[];
  mostDefeated: PlayerRivalry[];
  bestWinrate: PlayerRivalry[];
  toughest: PlayerRivalry[];
  teammatesMostPlayed: PlayerRivalry[];
  teammatesBestWinrate: PlayerRivalry[];
};

export type PlayerRivalryMode = PlayerRivalryGroup & {
  gameMode: number;
  label: string;
};

export type PlayerRivalries = PlayerRivalryGroup & {
  source?: "w3champions";
  seasons: number[];
  startedAt: string | null;
  endedAt: string | null;
  modes?: PlayerRivalryMode[];
};

const emptyPlayerRivalries = (source?: "w3champions"): PlayerRivalries => ({
  source,
  seasons: [],
  startedAt: null,
  endedAt: null,
  matchCount: 0,
  modes: [],
  mostPlayed: [],
  mostDefeated: [],
  bestWinrate: [],
  toughest: [],
  teammatesMostPlayed: [],
  teammatesBestWinrate: []
});

export type LocalPlayerProfileStats = {
  games: number;
  wins: number;
  losses: number;
  winrate: number | null;
  lastGameAt: string | null;
  averageValue: number | null;
  averageIncome: number | null;
  averageLeak: number | null;
  modes: LocalModeStat[];
  favoriteRolls: UnitPreference[];
  favoriteOpeners: UnitPreference[];
  recentGames: RecentGame[];
};

export type PlayerProfileSeason = {
  schemaVersion: number;
  season: number;
  label: string;
  startedAt: string | null;
  endedAt: string | null;
  current: PlayerModeStat | null;
  modes: PlayerModeStat[];
  races: PlayerRaceStat[];
  local: LocalPlayerProfileStats;
  fetchError: string | null;
  refreshedAt: string;
};

export type PlayerProfilePayload = {
  schemaVersion: number;
  source: "database+w3champions";
  battleTag: string;
  normalizedBattleTag: string;
  name: string;
  refreshedAt: string;
  cacheStatus: "hit" | "refreshed" | "stale";
  fetchError: string | null;
  w3cProfileUrl: string;
  selectedSeason: number | null;
  seasons: PlayerProfileSeason[];
  w3c: {
    available: boolean;
    season: number | null;
    gateway: number;
    current: PlayerModeStat | null;
    modes: PlayerModeStat[];
    races: PlayerRaceStat[];
    allTime: {
      wins: number;
      losses: number;
      games: number;
      winrate: number | null;
    } | null;
    participatedSeasons: number[];
    country: string | null;
  };
  local: LocalPlayerProfileStats;
  rivalries: PlayerRivalries;
};

type CachedProfileRow = RowDataPacket & {
  profilePayloadJson: string | null;
};

type CachedSeasonProfileRow = RowDataPacket & {
  season: number;
  seasonPayloadJson: string | null;
  fetchedAt: string;
};

type ResolveBattleTagRow = RowDataPacket & {
  battleTag: string;
  games: number;
};

type RefreshCandidateRow = RowDataPacket & {
  battleTag: string;
};

type SummaryRow = RowDataPacket & {
  games: number;
  wins: number | null;
  losses: number | null;
  lastGameAt: string | null;
};

type PerformanceRow = RowDataPacket & {
  averageValue: string | number | null;
  averageIncome: string | number | null;
  averageLeak: string | number | null;
};

type ModeRow = RowDataPacket & {
  mode: string;
  gameMode: string;
  games: number;
  wins: number | null;
  losses: number | null;
};

type FavoriteRollRow = RowDataPacket & {
  unitType: string;
  seen: number | string;
  built: number | string;
};

type OpenerRow = RowDataPacket & {
  unitType: string;
  seen: number | string;
  opened: number | string;
};

type UnitNameRow = RowDataPacket & {
  unitType: string;
  unitName: string | null;
};

type RecentGameRow = RowDataPacket & {
  id: number;
  matchId: string;
  startedAt: string;
  finishedAt: string;
  winningTeamId: number | null;
  gameMode: string | null;
  playerId: number;
  playerCount: number;
};

type RecentGamePlayerRow = RowDataPacket & {
  matchId: number;
  playerId: number;
  battleTag: string;
};

type W3ChampionsSeason = {
  id?: number | string | null;
};

type W3ChampionsMatchPlayer = {
  battleTag?: string | null;
  name?: string | null;
  won?: boolean | null;
};

type W3ChampionsMatchTeam = {
  won?: boolean | null;
  players?: W3ChampionsMatchPlayer[];
};

type W3ChampionsMatch = {
  id?: string | null;
  gameMode?: number | string | null;
  startTime?: string | null;
  endTime?: string | null;
  season?: number | string | null;
  teams?: W3ChampionsMatchTeam[];
};

type W3ChampionsMatchSearch = {
  count?: number | string | null;
  matches?: W3ChampionsMatch[];
};

type W3ChampionsProfile = {
  battleTag?: string | null;
  name?: string | null;
  participatedInSeasons?: W3ChampionsSeason[];
  winLosses?: Array<{
    race?: number | string | null;
    wins?: number | string | null;
    losses?: number | string | null;
    games?: number | string | null;
    winrate?: number | string | null;
  }>;
  playerAkaData?: {
    country?: string | null;
  } | null;
};

type W3ChampionsGameModeStat = {
  gameMode?: number | string | null;
  mmr?: number | string | null;
  rank?: number | string | null;
  rankNumber?: number | string | null;
  rankingPoints?: number | string | null;
  quantile?: number | string | null;
  wins?: number | string | null;
  losses?: number | string | null;
  games?: number | string | null;
  winrate?: number | string | null;
};

type W3ChampionsRaceStat = {
  race?: number | string | null;
  wins?: number | string | null;
  losses?: number | string | null;
  games?: number | string | null;
  winrate?: number | string | null;
};

type SeasonWindow = {
  startedAt: string | null;
  endedAt: string | null;
  matchCount: number;
};

type W3ChampionsSeasonStats = {
  season: number;
  gameModeStats: W3ChampionsGameModeStat[];
  raceStats: W3ChampionsRaceStat[];
  window: SeasonWindow;
  errors: string[];
};

let w3cPlayerStatsTableReady: Promise<void> | null = null;
let latestSeasonCache: { loadedAt: number; season: number | null; seasonIds: number[] } | null = null;

export async function getPlayerProfile(
  battleTagInput: string,
  options: { allowRefresh?: boolean; forceRefresh?: boolean; maxAgeMs?: number } = {}
): Promise<PlayerProfilePayload> {
  const pool = await getDatabasePool();

  if (!pool) {
    throw new Error("Replay database is not configured or does not contain the replay tables");
  }

  await ensureW3cPlayerStatsTable(pool);

  const battleTag = await resolvePlayerBattleTag(pool, battleTagInput);
  const cached = await loadCachedProfile(pool, battleTag);
  const maxAgeMs = options.maxAgeMs ?? profileFreshMs;

  if (!options.allowRefresh) {
    if (cached) {
      return withPlayerRivalries(pool, { ...cached, cacheStatus: isFresh(cached.refreshedAt, maxAgeMs) ? "hit" : "stale" });
    }

    return buildDatabaseOnlyProfile(pool, battleTag);
  }

  if (!options.forceRefresh && cached && isFresh(cached.refreshedAt, maxAgeMs)) {
    return withPlayerRivalries(pool, { ...cached, cacheStatus: "hit" });
  }

  return refreshPlayerProfile(pool, battleTag, cached ? "stale" : "refreshed");
}

async function buildDatabaseOnlyProfile(pool: Pool, battleTag: string): Promise<PlayerProfilePayload> {
  const cachedSeasonProfiles = await loadCachedSeasonProfiles(pool, battleTag);
  const seasons = [...cachedSeasonProfiles.values()].sort((a, b) => b.season - a.season);
  const activeSeason = seasons[0] ?? null;
  const local = activeSeason?.local ?? (await loadLocalPlayerStats(pool, battleTag));
  const current = activeSeason?.current ?? null;
  const modes = activeSeason?.modes ?? [];
  const races = activeSeason?.races ?? [];
  const normalizedBattleTag = normalizeBattleTag(battleTag);
  const refreshedAt = activeSeason?.refreshedAt ?? new Date().toISOString();

  const profile: PlayerProfilePayload = {
    schemaVersion: profileSchemaVersion,
    source: "database+w3champions",
    battleTag,
    normalizedBattleTag,
    name: playerName(battleTag),
    refreshedAt,
    cacheStatus: "stale",
    fetchError: null,
    w3cProfileUrl: `${w3ChampionsProfileBaseUrl}/${encodeURIComponent(battleTag)}/statistics`,
    selectedSeason: activeSeason?.season ?? null,
    seasons,
    w3c: {
      available: seasons.length > 0,
      season: activeSeason?.season ?? null,
      gateway: w3ChampionsGateway,
      current,
      modes,
      races,
      allTime: null,
      participatedSeasons: seasons.map((season) => season.season),
      country: null
    },
    local,
    rivalries: emptyPlayerRivalries()
  };

  return withPlayerRivalries(pool, profile);
}

export async function refreshW3cPlayerStats(limit = cronDefaultLimit) {
  const pool = await getDatabasePool();

  if (!pool) {
    throw new Error("Replay database is not configured or does not contain the replay tables");
  }

  await ensureW3cPlayerStatsTable(pool);

  const battleTags = await loadRefreshCandidates(pool, normalizeLimit(limit));
  const results: Array<{ battleTag: string; ok: boolean; error?: string }> = [];

  for (const battleTag of battleTags) {
    try {
      await refreshPlayerProfile(pool, battleTag, "refreshed");
      results.push({ battleTag, ok: true });
    } catch (error) {
      results.push({
        battleTag,
        ok: false,
        error: error instanceof Error ? error.message : "Unable to refresh profile"
      });
    }
  }

  return {
    attempted: battleTags.length,
    refreshed: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
    results
  };
}

async function ensureW3cPlayerStatsTable(pool: Pool) {
  if (!w3cPlayerStatsTableReady) {
    w3cPlayerStatsTableReady = pool
      .query(
        `CREATE TABLE IF NOT EXISTS w3c_player_stats (
          battle_tag VARCHAR(64) NOT NULL,
          normalized_battle_tag VARCHAR(64) NOT NULL,
          player_name VARCHAR(64) NULL,
          w3c_season SMALLINT UNSIGNED NULL,
          w3c_gateway SMALLINT UNSIGNED NULL,
          legion_4v4_mmr SMALLINT UNSIGNED NULL,
          legion_4v4_rank INT UNSIGNED NULL,
          legion_4v4_wins INT UNSIGNED NULL,
          legion_4v4_losses INT UNSIGNED NULL,
          legion_4v4_games INT UNSIGNED NULL,
          legion_4v4_winrate DECIMAL(7,6) NULL,
          local_games INT UNSIGNED NOT NULL DEFAULT 0,
          local_wins INT UNSIGNED NOT NULL DEFAULT 0,
          local_losses INT UNSIGNED NOT NULL DEFAULT 0,
          local_last_game_at DATETIME NULL,
          profile_payload_json LONGTEXT NULL,
          w3c_profile_json LONGTEXT NULL,
          w3c_game_mode_stats_json LONGTEXT NULL,
          w3c_race_stats_json LONGTEXT NULL,
          local_stats_json LONGTEXT NULL,
          fetch_error VARCHAR(255) NULL,
          fetched_at DATETIME NOT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (battle_tag),
          UNIQUE KEY idx_w3c_player_stats_normalized (normalized_battle_tag),
          KEY idx_w3c_player_stats_fetched_at (fetched_at),
          KEY idx_w3c_player_stats_local_last_game_at (local_last_game_at)
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      )
      .then(() =>
        pool.query(
          `CREATE TABLE IF NOT EXISTS w3c_player_season_stats (
            battle_tag VARCHAR(64) NOT NULL,
            normalized_battle_tag VARCHAR(64) NOT NULL,
            season SMALLINT UNSIGNED NOT NULL,
            player_name VARCHAR(64) NULL,
            w3c_gateway SMALLINT UNSIGNED NULL,
            season_started_at DATETIME NULL,
            season_ended_at DATETIME NULL,
            legion_4v4_mmr SMALLINT UNSIGNED NULL,
            legion_4v4_rank INT UNSIGNED NULL,
            legion_4v4_wins INT UNSIGNED NULL,
            legion_4v4_losses INT UNSIGNED NULL,
            legion_4v4_games INT UNSIGNED NULL,
            legion_4v4_winrate DECIMAL(7,6) NULL,
            local_games INT UNSIGNED NOT NULL DEFAULT 0,
            local_wins INT UNSIGNED NOT NULL DEFAULT 0,
            local_losses INT UNSIGNED NOT NULL DEFAULT 0,
            local_last_game_at DATETIME NULL,
            season_payload_json LONGTEXT NULL,
            w3c_game_mode_stats_json LONGTEXT NULL,
            w3c_race_stats_json LONGTEXT NULL,
            season_window_json LONGTEXT NULL,
            fetch_error VARCHAR(255) NULL,
            fetched_at DATETIME NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (normalized_battle_tag, season),
            KEY idx_w3c_player_season_stats_battle_tag (battle_tag),
            KEY idx_w3c_player_season_stats_fetched_at (fetched_at),
            KEY idx_w3c_player_season_stats_window (season_started_at, season_ended_at)
          ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
        )
      )
      .then(() => undefined)
      .catch((error) => {
        w3cPlayerStatsTableReady = null;
        throw error;
      });
  }

  return w3cPlayerStatsTableReady;
}

async function loadCachedProfile(pool: Pool, battleTag: string) {
  const [rows] = await pool.query<CachedProfileRow[]>(
    `SELECT
       profile_payload_json AS profilePayloadJson
     FROM w3c_player_stats
     WHERE normalized_battle_tag = ?
     LIMIT 1`,
    [normalizeBattleTag(battleTag)]
  );
  const payload = parseJson<PlayerProfilePayload>(rows[0]?.profilePayloadJson);

  if (payload?.schemaVersion !== profileSchemaVersion || !Array.isArray(payload.seasons) || payload.seasons.length === 0) {
    return null;
  }

  return payload;
}

async function loadCachedSeasonProfiles(pool: Pool, battleTag: string) {
  const [rows] = await pool.query<CachedSeasonProfileRow[]>(
    `SELECT
       season,
       season_payload_json AS seasonPayloadJson,
       DATE_FORMAT(fetched_at, '%Y-%m-%d %H:%i:%s') AS fetchedAt
     FROM w3c_player_season_stats
     WHERE normalized_battle_tag = ?
     ORDER BY season DESC`,
    [normalizeBattleTag(battleTag)]
  );
  const seasons = new Map<number, PlayerProfileSeason>();

  for (const row of rows) {
    const season = Number(row.season);
    const payload = parseJson<PlayerProfileSeason>(row.seasonPayloadJson);

    if (Number.isFinite(season) && payload?.schemaVersion === profileSchemaVersion) {
      seasons.set(season, payload);
    }
  }

  return seasons;
}

async function refreshPlayerProfile(pool: Pool, battleTag: string, cacheStatus: "refreshed" | "stale") {
  const [w3cData, cachedSeasonProfiles] = await Promise.all([
    loadW3ChampionsData(battleTag),
    loadCachedSeasonProfiles(pool, battleTag)
  ]);
  const canonicalBattleTag = w3cData.profile?.battleTag || battleTag;
  const name = w3cData.profile?.name || playerName(canonicalBattleTag);
  const seasonResult = await loadPlayerSeasonProfiles(pool, canonicalBattleTag, name, w3cData.seasonIds, cachedSeasonProfiles);
  const seasonProfiles = seasonResult.profiles;
  const selectedSeasonProfile = seasonProfiles[0] ?? null;
  const modes = selectedSeasonProfile?.modes ?? [];
  const current = selectedSeasonProfile?.current ?? null;
  const races = selectedSeasonProfile?.races ?? [];
  const local = selectedSeasonProfile?.local ?? (await loadLocalPlayerStats(pool, canonicalBattleTag));
  const allTime = allTimeStatsFromProfile(w3cData.profile);
  const refreshedAt = new Date().toISOString();
  const seasonErrors = seasonProfiles.map((season) => season.fetchError).filter(Boolean) as string[];
  const rivalryResult = await loadW3ChampionsPlayerRivalries(canonicalBattleTag, seasonProfiles);
  const allErrors = [...w3cData.errors, ...seasonErrors, ...rivalryResult.errors];
  const fetchError = allErrors.length > 0 ? allErrors.join("; ").slice(0, 255) : null;
  const profileWithoutRivalries: PlayerProfilePayload = {
    schemaVersion: profileSchemaVersion,
    source: "database+w3champions",
    battleTag: canonicalBattleTag,
    normalizedBattleTag: normalizeBattleTag(canonicalBattleTag),
    name,
    refreshedAt,
    cacheStatus,
    fetchError,
    w3cProfileUrl: `${w3ChampionsProfileBaseUrl}/${encodeURIComponent(canonicalBattleTag)}/statistics`,
    selectedSeason: selectedSeasonProfile?.season ?? w3cData.latestSeason,
    seasons: seasonProfiles,
    w3c: {
      available: Boolean(w3cData.profile || modes.length > 0 || races.length > 0),
      season: selectedSeasonProfile?.season ?? w3cData.latestSeason,
      gateway: w3ChampionsGateway,
      current,
      modes,
      races,
      allTime,
      participatedSeasons: participatedSeasonsFromProfile(w3cData.profile),
      country: w3cData.profile?.playerAkaData?.country ?? null
    },
    local,
    rivalries: rivalryResult.rivalries
  };
  const profile = await withPlayerRivalries(pool, profileWithoutRivalries);

  await saveProfile(pool, profile, {
    rawProfile: w3cData.profile,
    rawSeasons: seasonResult.rawSeasons
  });

  return profile;
}

async function resolvePlayerBattleTag(pool: Pool, input: string) {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new Error("Player is required");
  }

  const normalized = normalizeBattleTag(trimmed);
  const nameOnly = normalized.split("#")[0];
  const [rows] = await pool.query<ResolveBattleTagRow[]>(
    `SELECT p.battle_tag AS battleTag, COUNT(*) AS games
     FROM players p
     WHERE p.battle_tag <> ''
       AND p.battle_tag <> 'FLO'
       AND (LOWER(p.battle_tag) = ? OR LOWER(SUBSTRING_INDEX(p.battle_tag, '#', 1)) = ?)
     GROUP BY p.battle_tag
     ORDER BY LOWER(p.battle_tag) = ? DESC, games DESC, p.battle_tag
     LIMIT 1`,
    [normalized, nameOnly, normalized]
  );

  return rows[0]?.battleTag ?? trimmed;
}

async function loadW3ChampionsData(battleTag: string) {
  const errors: string[] = [];
  const profileUrl = `${w3ChampionsBaseUrl}/api/players/${encodeURIComponent(battleTag)}`;
  const [profileResult, globalSeasonIdsResult] = await Promise.allSettled([
    fetchJson<W3ChampionsProfile>(profileUrl, { allow404: true }),
    getW3ChampionsSeasonIds()
  ]);
  const profile = settledValue(profileResult, errors, "profile");
  const globalSeasonIds = settledValue(globalSeasonIdsResult, errors, "seasons") ?? [];
  const participatedSeasonIds = participatedSeasonsFromProfile(profile);
  const latestSeason = globalSeasonIds[0] ?? participatedSeasonIds[0] ?? null;
  const seasonIds = uniqueSeasonIds([...participatedSeasonIds, latestSeason].filter((season): season is number => season !== null));

  return {
    profile: profile ?? null,
    latestSeason,
    seasonIds,
    seasons: [] as W3ChampionsSeasonStats[],
    errors
  };
}

async function loadPlayerSeasonProfiles(
  pool: Pool,
  battleTag: string,
  name: string,
  seasonIds: number[],
  cachedSeasonProfiles: Map<number, PlayerProfileSeason>
) {
  const latestSeason = seasonIds[0] ?? null;
  const rawSeasons: W3ChampionsSeasonStats[] = [];
  const profiles = await mapLimit(seasonIds, 4, async (season) => {
    const cached = cachedSeasonProfiles.get(season);

    if (cached && season !== latestSeason && isFresh(cached.refreshedAt, historicalSeasonFreshMs)) {
      return cached;
    }

    const seasonStats = await loadW3ChampionsSeasonStats(battleTag, season);
    rawSeasons.push(seasonStats);

    const modes = seasonStats.gameModeStats.map(gameModeStatFromW3c).filter(isPlayerModeStat);
    const races = seasonStats.raceStats.map(raceStatFromW3c).filter(isPlayerRaceStat);
    const current = modes.find((mode) => mode.gameMode === w3ChampionsLegion4v4Mode) ?? modes[0] ?? null;
    const local = await loadLocalPlayerStats(pool, battleTag, seasonStats.window);
    const fetchError = seasonStats.errors.length > 0 ? `Season ${season}: ${seasonStats.errors.join("; ")}`.slice(0, 255) : null;

    return {
      schemaVersion: profileSchemaVersion,
      season,
      label: `Season ${season}`,
      startedAt: seasonStats.window.startedAt,
      endedAt: seasonStats.window.endedAt,
      current,
      modes,
      races,
      local,
      fetchError,
      refreshedAt: new Date().toISOString()
    };
  });

  return {
    profiles: profiles
      .filter((profile) => profile.modes.length > 0 || profile.local.games > 0 || profile.season === latestSeason)
      .sort((a, b) => b.season - a.season),
    rawSeasons
  };
}

async function loadW3ChampionsSeasonStats(battleTag: string, season: number): Promise<W3ChampionsSeasonStats> {
  const errors: string[] = [];
  const profileUrl = `${w3ChampionsBaseUrl}/api/players/${encodeURIComponent(battleTag)}`;
  const [gameModeStatsResult, raceStatsResult, windowResult] = await Promise.allSettled([
    fetchJson<W3ChampionsGameModeStat[]>(
      `${profileUrl}/game-mode-stats?gateWay=${w3ChampionsGateway}&season=${season}`,
      { allow404: true }
    ),
    fetchJson<W3ChampionsRaceStat[]>(`${profileUrl}/race-stats?gateWay=${w3ChampionsGateway}&season=${season}`, {
      allow404: true
    }),
    inferW3ChampionsSeasonWindow(season)
  ]);
  const gameModeStats = settledValue(gameModeStatsResult, errors, `season ${season} game-mode stats`);
  const raceStats = settledValue(raceStatsResult, errors, `season ${season} race stats`);
  const window = settledValue(windowResult, errors, `season ${season} dates`) ?? {
    startedAt: null,
    endedAt: null,
    matchCount: 0
  };

  return {
    season,
    gameModeStats: Array.isArray(gameModeStats) ? gameModeStats : [],
    raceStats: Array.isArray(raceStats) ? raceStats : [],
    window,
    errors
  };
}

async function inferW3ChampionsSeasonWindow(season: number): Promise<SeasonWindow> {
  let startedAt: string | null = null;
  let endedAt: string | null = null;
  let matchCount = 0;

  await Promise.all(legionSeasonWindowModes.map(async (gameMode) => {
    const firstPage = await fetchW3ChampionsSeasonMatchPage(season, gameMode, 0);
    const count = Number(firstPage?.count ?? 0);
    const latestMatch = firstPage?.matches?.[0];

    if (count <= 0 || !latestMatch?.startTime) {
      return;
    }

    const oldestPage = count > 1 ? await fetchW3ChampionsSeasonMatchPage(season, gameMode, count - 1) : firstPage;
    const oldestMatch = oldestPage?.matches?.[0] ?? latestMatch;
    const modeStartedAt = mysqlDateTimeFromIso(oldestMatch.startTime ?? latestMatch.startTime);
    const modeEndedAt = mysqlDateTimeFromIso(latestMatch.endTime ?? latestMatch.startTime);

    matchCount += count;

    if (modeStartedAt && (!startedAt || modeStartedAt < startedAt)) {
      startedAt = modeStartedAt;
    }

    if (modeEndedAt && (!endedAt || modeEndedAt > endedAt)) {
      endedAt = modeEndedAt;
    }
  }));

  return {
    startedAt,
    endedAt,
    matchCount
  };
}

async function fetchW3ChampionsSeasonMatchPage(season: number, gameMode: number, offset: number) {
  const params = new URLSearchParams({
    offset: String(Math.max(0, offset)),
    gateway: String(w3ChampionsGateway),
    pageSize: "1",
    gameMode: String(gameMode),
    mapName: "Overall",
    season: String(season)
  });

  return fetchJson<W3ChampionsMatchSearch>(`${w3ChampionsBaseUrl}/api/matches?${params.toString()}`, { allow404: true });
}

async function getW3ChampionsSeasonIds() {
  if (latestSeasonCache && Date.now() - latestSeasonCache.loadedAt < profileFreshMs) {
    return latestSeasonCache.seasonIds;
  }

  try {
    const seasons = await fetchJson<W3ChampionsSeason[]>(`${w3ChampionsBaseUrl}/api/ladder/seasons`);
    const seasonIds =
      seasons
        ?.map((row) => Number(row.id))
        .filter((id) => Number.isFinite(id))
        .sort((a, b) => b - a) ?? [];
    const season = seasonIds[0] ?? null;

    latestSeasonCache = { loadedAt: Date.now(), season, seasonIds };
    return seasonIds;
  } catch {
    return latestSeasonCache?.seasonIds ?? [];
  }
}

async function fetchJson<T>(url: string, options: { allow404?: boolean } = {}): Promise<T | null> {
  const response = await fetch(url, {
    headers: { accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(fetchTimeoutMs)
  });

  if (response.status === 404 && options.allow404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }

  return (await response.json()) as T;
}

function settledValue<T>(result: PromiseSettledResult<T | null>, errors: string[], label: string) {
  if (result.status === "fulfilled") {
    return result.value;
  }

  errors.push(`${label}: ${result.reason instanceof Error ? result.reason.message : "request failed"}`);
  return null;
}

async function loadLocalPlayerStats(pool: Pool, battleTag: string, scope?: Pick<SeasonWindow, "startedAt" | "endedAt">): Promise<LocalPlayerProfileStats> {
  const normalized = normalizeBattleTag(battleTag);
  const [summaryRows, performanceRows, modes, favoriteRolls, favoriteOpeners, recentGames] = await Promise.all([
    loadLocalSummary(pool, normalized, scope),
    loadLocalPerformance(pool, normalized, scope),
    loadLocalModes(pool, normalized, scope),
    loadFavoriteRolls(pool, normalized, scope),
    loadFavoriteOpeners(pool, normalized, scope),
    loadRecentGames(pool, normalized, scope)
  ]);
  const summary = summaryRows[0];
  const performance = performanceRows[0];
  const games = Number(summary?.games ?? 0);
  const wins = Number(summary?.wins ?? 0);
  const losses = Number(summary?.losses ?? 0);

  return {
    games,
    wins,
    losses,
    winrate: ratio(wins, wins + losses),
    lastGameAt: summary?.lastGameAt ?? null,
    averageValue: nullableRoundedNumber(performance?.averageValue),
    averageIncome: nullableRoundedNumber(performance?.averageIncome),
    averageLeak: nullableRoundedNumber(performance?.averageLeak),
    modes,
    favoriteRolls,
    favoriteOpeners,
    recentGames
  };
}

async function loadLocalSummary(pool: Pool, normalizedBattleTag: string, scope?: Pick<SeasonWindow, "startedAt" | "endedAt">) {
  const dateScope = matchDateScope("m", scope);

  return (
    await pool.query<SummaryRow[]>(
      `SELECT
         COUNT(*) AS games,
         SUM(CASE WHEN m.winning_team_id IS NOT NULL AND m.winning_team_id = CASE WHEN p.player_id <= CEIL(pc.player_count / 2) THEN 0 ELSE 1 END THEN 1 ELSE 0 END) AS wins,
         SUM(CASE WHEN m.winning_team_id IS NOT NULL AND m.winning_team_id <> CASE WHEN p.player_id <= CEIL(pc.player_count / 2) THEN 0 ELSE 1 END THEN 1 ELSE 0 END) AS losses,
         DATE_FORMAT(MAX(m.started_at), '%Y-%m-%d %H:%i:%s') AS lastGameAt
       FROM players p
       INNER JOIN matches m ON m.id = p.match_id
       INNER JOIN (
         SELECT match_id, COUNT(*) AS player_count
         FROM players
         WHERE battle_tag <> '' AND battle_tag <> 'FLO'
         GROUP BY match_id
       ) pc ON pc.match_id = m.id
       WHERE p.battle_tag <> ''
         AND p.battle_tag <> 'FLO'
         AND LOWER(p.battle_tag) = ?
         ${dateScope.sql}`,
      [normalizedBattleTag, ...dateScope.params]
    )
  )[0];
}

async function loadLocalPerformance(pool: Pool, normalizedBattleTag: string, scope?: Pick<SeasonWindow, "startedAt" | "endedAt">) {
  const dateScope = matchDateScope("m", scope);

  return (
    await pool.query<PerformanceRow[]>(
      `SELECT
         AVG(s.player_value) AS averageValue,
         AVG(s.player_income) AS averageIncome,
         AVG(s.leaked_amount_cum) AS averageLeak
       FROM players p
       INNER JOIN matches m ON m.id = p.match_id
       INNER JOIN actions a ON a.match_id = p.match_id AND a.player_id = p.player_id
       INNER JOIN records_level_end_player_stats s ON s.action_id = a.id
       INNER JOIN (
         SELECT a2.match_id, a2.player_id, MAX(s2.level_number) AS max_level
         FROM players p2
         INNER JOIN actions a2 ON a2.match_id = p2.match_id AND a2.player_id = p2.player_id
         INNER JOIN records_level_end_player_stats s2 ON s2.action_id = a2.id
         WHERE p2.battle_tag <> ''
           AND p2.battle_tag <> 'FLO'
           AND LOWER(p2.battle_tag) = ?
         GROUP BY a2.match_id, a2.player_id
       ) latest ON latest.match_id = a.match_id
         AND latest.player_id = a.player_id
         AND latest.max_level = s.level_number
       WHERE p.battle_tag <> ''
         AND p.battle_tag <> 'FLO'
         AND LOWER(p.battle_tag) = ?
         ${dateScope.sql}`,
      [normalizedBattleTag, normalizedBattleTag, ...dateScope.params]
    )
  )[0];
}

async function loadLocalModes(
  pool: Pool,
  normalizedBattleTag: string,
  scope?: Pick<SeasonWindow, "startedAt" | "endedAt">
): Promise<LocalModeStat[]> {
  const dateScope = matchDateScope("m", scope);
  const [rows] = await pool.query<ModeRow[]>(
    `SELECT
       CONCAT('Legion TD ', GREATEST(1, CEIL(pc.player_count / 2)), 'v', GREATEST(1, CEIL(pc.player_count / 2))) AS mode,
       COALESCE(m.gamemode, 'Unknown') AS gameMode,
       COUNT(*) AS games,
       SUM(CASE WHEN m.winning_team_id IS NOT NULL AND m.winning_team_id = CASE WHEN p.player_id <= CEIL(pc.player_count / 2) THEN 0 ELSE 1 END THEN 1 ELSE 0 END) AS wins,
       SUM(CASE WHEN m.winning_team_id IS NOT NULL AND m.winning_team_id <> CASE WHEN p.player_id <= CEIL(pc.player_count / 2) THEN 0 ELSE 1 END THEN 1 ELSE 0 END) AS losses
     FROM players p
     INNER JOIN matches m ON m.id = p.match_id
     INNER JOIN (
       SELECT match_id, COUNT(*) AS player_count
       FROM players
       WHERE battle_tag <> '' AND battle_tag <> 'FLO'
       GROUP BY match_id
     ) pc ON pc.match_id = m.id
     WHERE p.battle_tag <> ''
       AND p.battle_tag <> 'FLO'
       AND LOWER(p.battle_tag) = ?
       ${dateScope.sql}
     GROUP BY mode, gameMode
     ORDER BY games DESC, mode, gameMode
     LIMIT 6`,
    [normalizedBattleTag, ...dateScope.params]
  );

  return rows.map((row) => {
    const wins = Number(row.wins ?? 0);
    const losses = Number(row.losses ?? 0);

    return {
      mode: row.mode,
      gameMode: row.gameMode,
      games: Number(row.games ?? 0),
      wins,
      losses,
      winrate: ratio(wins, wins + losses)
    };
  });
}

async function loadFavoriteRolls(
  pool: Pool,
  normalizedBattleTag: string,
  scope?: Pick<SeasonWindow, "startedAt" | "endedAt">
): Promise<UnitPreference[]> {
  const rollDateScope = matchDateScope("m", scope);
  const buildDateScope = matchDateScope("bm", scope);
  const rollUnitSelects = [
    "SELECT action_id, unit_1 AS unitType FROM records_player_roll",
    "SELECT action_id, unit_2 AS unitType FROM records_player_roll",
    "SELECT action_id, unit_3 AS unitType FROM records_player_roll",
    "SELECT action_id, unit_4 AS unitType FROM records_player_roll",
    "SELECT action_id, unit_5 AS unitType FROM records_player_roll",
    "SELECT action_id, unit_6 AS unitType FROM records_player_roll"
  ].join(" UNION ALL ");
  const buildUnitSelects = [
    "SELECT action_id, unit_type AS unitType FROM records_unit_build",
    "SELECT action_id, unit_type AS unitType FROM records_unit_upgrade"
  ].join(" UNION ALL ");
  const unitMetaSelect = `
    SELECT
      id,
      MIN(NULLIF(upgrade_group, '')) AS upgrade_group,
      MAX(CASE WHEN gold_cost > 0 THEN 1 ELSE 0 END) AS is_buildable
    FROM data_units
    GROUP BY id
  `;
  const [rows] = await pool.query<FavoriteRollRow[]>(
    `SELECT
       roll_stats.unitType,
       roll_stats.seen,
       roll_stats.built
     FROM (
       SELECT
         rolled.unitType,
         COUNT(*) AS seen,
         SUM(CASE WHEN built.familyKey IS NULL THEN 0 ELSE 1 END) AS built
       FROM (
         SELECT DISTINCT
           p.match_id AS matchId,
           p.player_id AS playerId,
           roll_units.unitType,
           COALESCE(unit_meta.upgrade_group, roll_units.unitType) AS familyKey
         FROM players p
         INNER JOIN matches m ON m.id = p.match_id
         INNER JOIN actions a ON a.match_id = p.match_id AND a.player_id = p.player_id AND a.type = 'PLAYER_ROLL'
         INNER JOIN (${rollUnitSelects}) roll_units ON roll_units.action_id = a.id
         INNER JOIN (${unitMetaSelect}) unit_meta ON unit_meta.id = roll_units.unitType AND unit_meta.is_buildable = 1
         WHERE p.battle_tag <> ''
           AND p.battle_tag <> 'FLO'
           AND LOWER(p.battle_tag) = ?
           ${rollDateScope.sql}
       ) rolled
       LEFT JOIN (
         SELECT DISTINCT
           p.match_id AS matchId,
           p.player_id AS playerId,
           COALESCE(unit_meta.upgrade_group, built_units.unitType) AS familyKey
         FROM players p
         INNER JOIN matches bm ON bm.id = p.match_id
         INNER JOIN actions a ON a.match_id = p.match_id AND a.player_id = p.player_id AND a.type IN ('UNIT_BUILD', 'UNIT_UPGRADE')
         INNER JOIN (${buildUnitSelects}) built_units ON built_units.action_id = a.id
         INNER JOIN (${unitMetaSelect}) unit_meta ON unit_meta.id = built_units.unitType AND unit_meta.is_buildable = 1
         WHERE p.battle_tag <> ''
           AND p.battle_tag <> 'FLO'
           AND LOWER(p.battle_tag) = ?
           ${buildDateScope.sql}
       ) built ON built.matchId = rolled.matchId
         AND built.playerId = rolled.playerId
         AND built.familyKey = rolled.familyKey
       GROUP BY rolled.unitType
     ) roll_stats
     WHERE roll_stats.built > 0`,
    [normalizedBattleTag, ...rollDateScope.params, normalizedBattleTag, ...buildDateScope.params]
  );

  return favoriteRollPreferences(pool, rows, 6);
}

async function loadFavoriteOpeners(
  pool: Pool,
  normalizedBattleTag: string,
  scope?: Pick<SeasonWindow, "startedAt" | "endedAt">
): Promise<UnitPreference[]> {
  const rollDateScope = matchDateScope("m", scope);
  const buildDateScope = matchDateScope("bm", scope);
  const rollUnitSelects = [
    "SELECT action_id, unit_1 AS unitType FROM records_player_roll",
    "SELECT action_id, unit_2 AS unitType FROM records_player_roll",
    "SELECT action_id, unit_3 AS unitType FROM records_player_roll",
    "SELECT action_id, unit_4 AS unitType FROM records_player_roll",
    "SELECT action_id, unit_5 AS unitType FROM records_player_roll",
    "SELECT action_id, unit_6 AS unitType FROM records_player_roll"
  ].join(" UNION ALL ");
  const unitMetaSelect = `
    SELECT
      id,
      MIN(NULLIF(upgrade_group, '')) AS upgrade_group,
      MAX(CASE WHEN gold_cost > 0 THEN 1 ELSE 0 END) AS is_buildable
    FROM data_units
    GROUP BY id
  `;
  const [rows] = await pool.query<OpenerRow[]>(
    `SELECT
       opening_stats.unitType,
       opening_stats.seen,
       opening_stats.opened
     FROM (
       SELECT
         opening.unitType,
         COUNT(*) AS seen,
         SUM(CASE WHEN first_build.familyKey = opening.familyKey THEN 1 ELSE 0 END) AS opened
       FROM (
         SELECT DISTINCT
           first_roll.matchId,
           first_roll.playerId,
           roll_units.unitType,
           COALESCE(unit_meta.upgrade_group, roll_units.unitType) AS familyKey
         FROM (
           SELECT
             p.match_id AS matchId,
             p.player_id AS playerId,
             MIN(a.id) AS firstRollActionId
           FROM players p
           INNER JOIN matches m ON m.id = p.match_id
           INNER JOIN actions a ON a.match_id = p.match_id AND a.player_id = p.player_id AND a.type = 'PLAYER_ROLL'
           WHERE p.battle_tag <> ''
             AND p.battle_tag <> 'FLO'
             AND LOWER(p.battle_tag) = ?
             ${rollDateScope.sql}
           GROUP BY p.match_id, p.player_id
         ) first_roll
         INNER JOIN (${rollUnitSelects}) roll_units ON roll_units.action_id = first_roll.firstRollActionId
         INNER JOIN (${unitMetaSelect}) unit_meta ON unit_meta.id = roll_units.unitType AND unit_meta.is_buildable = 1
       ) opening
       LEFT JOIN (
         SELECT
           first_build.matchId,
           first_build.playerId,
           COALESCE(unit_meta.upgrade_group, b.unit_type) AS familyKey
         FROM (
           SELECT
             p.match_id AS matchId,
             p.player_id AS playerId,
             MIN(a.id) AS firstBuildActionId
           FROM players p
           INNER JOIN matches bm ON bm.id = p.match_id
           INNER JOIN actions a ON a.match_id = p.match_id AND a.player_id = p.player_id AND a.type = 'UNIT_BUILD'
           INNER JOIN records_unit_build b ON b.action_id = a.id
           WHERE p.battle_tag <> ''
             AND p.battle_tag <> 'FLO'
             AND LOWER(p.battle_tag) = ?
             ${buildDateScope.sql}
           GROUP BY p.match_id, p.player_id
         ) first_build
         INNER JOIN records_unit_build b ON b.action_id = first_build.firstBuildActionId
         INNER JOIN (${unitMetaSelect}) unit_meta ON unit_meta.id = b.unit_type AND unit_meta.is_buildable = 1
       ) first_build ON first_build.matchId = opening.matchId
         AND first_build.playerId = opening.playerId
       GROUP BY opening.unitType
     ) opening_stats
     WHERE opening_stats.opened > 0`,
    [normalizedBattleTag, ...rollDateScope.params, normalizedBattleTag, ...buildDateScope.params]
  );

  return openingUnitPreferences(pool, rows, 6);
}

async function unitPreferences(pool: Pool, counts: Map<string, number>, total: number, limit: number): Promise<UnitPreference[]> {
  const topUnits = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit);
  const unitNames = await loadUnitNames(
    pool,
    topUnits.map(([unitType]) => unitType)
  );

  return topUnits.map(([unitType, count]) => ({
    unitType,
    unitName: displayNameForUnit(unitType, unitNames.get(unitType)),
    iconPath: iconPathForUnit(unitType),
    count,
    percent: ratio(count, total)
  }));
}

async function favoriteRollPreferences(pool: Pool, rows: FavoriteRollRow[], limit: number): Promise<UnitPreference[]> {
  const unitNames = await loadUnitNames(
    pool,
    rows.map((row) => row.unitType)
  );
  const preferences: UnitPreference[] = [];

  for (const row of rows) {
    const unitType = row.unitType;
    const unitName = displayNameForUnit(unitType, unitNames.get(unitType));
    const seen = Number(row.seen ?? 0);
    const built = Number(row.built ?? 0);

    if (!unitType || !Number.isFinite(seen) || !Number.isFinite(built) || seen <= 0 || built <= 0) {
      continue;
    }

    if (isAuraUnit(unitType, unitName)) {
      continue;
    }

    preferences.push({
      unitType,
        unitName,
        iconPath: iconPathForUnit(unitType),
        count: built,
        metric: "roll-pick",
        seen,
        percent: ratio(built, seen)
      });
  }

  preferences.sort(
    (a, b) =>
      b.count - a.count ||
      (b.percent ?? 0) - (a.percent ?? 0) ||
      (b.seen ?? 0) - (a.seen ?? 0) ||
      a.unitName.localeCompare(b.unitName) ||
      a.unitType.localeCompare(b.unitType)
  );

  return preferences.slice(0, limit);
}

async function openingUnitPreferences(pool: Pool, rows: OpenerRow[], limit: number): Promise<UnitPreference[]> {
  const unitNames = await loadUnitNames(
    pool,
    rows.map((row) => row.unitType)
  );
  const maxSeen = rows.reduce((max, row) => Math.max(max, Number(row.seen ?? 0)), 0);
  const preferences: Array<UnitPreference & { score: number }> = [];

  for (const row of rows) {
    const unitType = row.unitType;
    const unitName = displayNameForUnit(unitType, unitNames.get(unitType));
    const seen = Number(row.seen ?? 0);
    const opened = Number(row.opened ?? 0);

    if (!unitType || !Number.isFinite(seen) || !Number.isFinite(opened) || seen <= 0 || opened <= 0) {
      continue;
    }

    if (isAuraUnit(unitType, unitName)) {
      continue;
    }

    preferences.push({
      unitType,
      unitName,
      iconPath: iconPathForUnit(unitType),
      count: opened,
      metric: "opening-pick",
      seen,
      percent: ratio(opened, seen),
      score: confidenceWinrateScore(opened, seen - opened, maxSeen)
    });
  }

  preferences.sort(
    (a, b) =>
      b.score - a.score ||
      (b.percent ?? 0) - (a.percent ?? 0) ||
      b.count - a.count ||
      (b.seen ?? 0) - (a.seen ?? 0) ||
      a.unitName.localeCompare(b.unitName) ||
      a.unitType.localeCompare(b.unitType)
  );

  return preferences.slice(0, limit).map(({ score: _score, ...preference }) => preference);
}

function isAuraUnit(unitType: string, unitName: string) {
  const detail = unitTooltipDetailById(unitType) ?? unitTooltipDetail(unitName);

  return /\baura\b/i.test(detail?.description ?? "");
}

async function loadUnitNames(pool: Pool, unitTypes: string[]) {
  const unitNames = new Map<string, string | null>();

  if (unitTypes.length === 0) {
    return unitNames;
  }

  const placeholders = unitTypes.map(() => "?").join(", ");
  const [rows] = await pool.query<UnitNameRow[]>(
    `SELECT id AS unitType, MIN(name) AS unitName
     FROM data_units
     WHERE id IN (${placeholders})
     GROUP BY id`,
    unitTypes
  );

  for (const row of rows) {
    unitNames.set(row.unitType, row.unitName);
  }

  return unitNames;
}

async function loadRecentGames(
  pool: Pool,
  normalizedBattleTag: string,
  scope?: Pick<SeasonWindow, "startedAt" | "endedAt">
): Promise<RecentGame[]> {
  const dateScope = matchDateScope("m", scope);
  const [rows] = await pool.query<RecentGameRow[]>(
    `SELECT
       m.id,
       m.mm_id AS matchId,
       DATE_FORMAT(m.started_at, '%Y-%m-%d %H:%i:%s') AS startedAt,
       DATE_FORMAT(m.finished_at, '%Y-%m-%d %H:%i:%s') AS finishedAt,
       m.winning_team_id AS winningTeamId,
       COALESCE(m.gamemode, 'Unknown') AS gameMode,
       p.player_id AS playerId,
       pc.player_count AS playerCount
     FROM players p
     INNER JOIN matches m ON m.id = p.match_id
     INNER JOIN (
       SELECT match_id, COUNT(*) AS player_count
       FROM players
       WHERE battle_tag <> '' AND battle_tag <> 'FLO'
       GROUP BY match_id
     ) pc ON pc.match_id = m.id
     WHERE p.battle_tag <> ''
       AND p.battle_tag <> 'FLO'
       AND LOWER(p.battle_tag) = ?
       ${dateScope.sql}
     ORDER BY m.started_at DESC, m.id DESC
     LIMIT 5`,
    [normalizedBattleTag, ...dateScope.params]
  );

  if (rows.length === 0) {
    return [];
  }

  const matchIds = rows.map((row) => Number(row.id));
  const placeholders = matchIds.map(() => "?").join(", ");
  const [playerRows] = await pool.query<RecentGamePlayerRow[]>(
    `SELECT match_id AS matchId, player_id AS playerId, battle_tag AS battleTag
     FROM players
     WHERE battle_tag <> ''
       AND battle_tag <> 'FLO'
       AND match_id IN (${placeholders})
     ORDER BY match_id, player_id`,
    matchIds
  );
  const playersByMatch = new Map<number, RecentGamePlayerRow[]>();

  for (const player of playerRows) {
    const players = playersByMatch.get(Number(player.matchId)) ?? [];
    players.push(player);
    playersByMatch.set(Number(player.matchId), players);
  }

  return rows.map((row) => {
    const roster = [...(playersByMatch.get(Number(row.id)) ?? [])].sort((a, b) => Number(a.playerId) - Number(b.playerId));
    const playerCount = roster.length || Number(row.playerCount ?? 0);
    const splitAt = Math.max(1, Math.ceil(playerCount / 2));
    const playerTeamIds = new Map<number, number>();

    roster.forEach((player, index) => {
      playerTeamIds.set(Number(player.playerId), index < splitAt ? 0 : 1);
    });

    const teamId = playerTeamIds.get(Number(row.playerId)) ?? (Number(row.playerId) <= splitAt ? 0 : 1);
    const resultForTeam = (id: number) =>
      row.winningTeamId === null ? "unknown" : Number(row.winningTeamId) === id ? "win" : "loss";
    const teams: RecentGameTeam[] = [0, 1].map((id) => ({
      id,
      result: resultForTeam(id),
      players: roster
        .filter((player) => playerTeamIds.get(Number(player.playerId)) === id)
        .map((player) => ({
          id: Number(player.playerId),
          battleTag: player.battleTag,
          name: playerName(player.battleTag),
          isProfilePlayer: normalizeBattleTag(player.battleTag) === normalizedBattleTag
        }))
    }));
    const teammates = roster
      .filter((player) => playerTeamIds.get(Number(player.playerId)) === teamId)
      .filter((player) => normalizeBattleTag(player.battleTag) !== normalizedBattleTag)
      .map((player) => playerName(player.battleTag));
    const opponents = roster
      .filter((player) => playerTeamIds.get(Number(player.playerId)) !== teamId)
      .map((player) => playerName(player.battleTag));
    const result = resultForTeam(teamId);
    const teamSize = Math.max(1, Math.max(teams[0].players.length, teams[1].players.length));

    return {
      id: Number(row.id),
      matchId: row.matchId,
      startedAt: row.startedAt,
      duration: formatDuration(secondsBetween(row.startedAt, row.finishedAt)),
      mode: `Legion TD ${teamSize}v${teamSize}`,
      gameMode: row.gameMode ?? "Unknown",
      result,
      profileTeamId: teamId,
      teams,
      teammates,
      opponents
    };
  });
}

async function withPlayerRivalries(_pool: Pool, profile: PlayerProfilePayload): Promise<PlayerProfilePayload> {
  const rivalries =
    profile.rivalries?.source === "w3champions" ? profile.rivalries : emptyPlayerRivalries("w3champions");

  return {
    ...profile,
    rivalries
  };
}

async function loadW3ChampionsPlayerRivalries(
  battleTag: string,
  seasons: PlayerProfileSeason[]
): Promise<{ rivalries: PlayerRivalries; errors: string[] }> {
  const scope = rivalrySeasonScope(seasons);
  const errors: string[] = [];

  if (!scope || scope.seasons.length === 0) {
    return { rivalries: emptyPlayerRivalries("w3champions"), errors };
  }

  const normalized = normalizeBattleTag(battleTag);
  const aggregateMaps = createRelationshipMaps();
  const mapsByMode = new Map<number, RelationshipMaps>();

  for (const season of scope.seasons) {
    try {
      const matches = await fetchW3ChampionsPlayerSeasonMatches(battleTag, season);

      for (const match of matches) {
        if (!applyW3ChampionsMatchRelationships(match, normalized, aggregateMaps)) {
          continue;
        }

        const gameMode = Number(match.gameMode);
        const modeMaps = mapsByMode.get(gameMode) ?? createRelationshipMaps();
        applyW3ChampionsMatchRelationships(match, normalized, modeMaps);
        mapsByMode.set(gameMode, modeMaps);
      }
    } catch (error) {
      errors.push(`season ${season} W3C matches: ${error instanceof Error ? error.message : "request failed"}`);
    }
  }

  return {
    rivalries: relationshipStatsFromMaps(scope, aggregateMaps, mapsByMode),
    errors
  };
}

async function fetchW3ChampionsPlayerSeasonMatches(battleTag: string, season: number) {
  const firstPage = await fetchW3ChampionsPlayerMatchPage(battleTag, season, 0);
  const count = Number(firstPage?.count ?? firstPage?.matches?.length ?? 0);
  const matches = [...(firstPage?.matches ?? [])];
  const offsets: number[] = [];

  for (let offset = w3cPlayerMatchPageSize; offset < count; offset += w3cPlayerMatchPageSize) {
    offsets.push(offset);
  }

  const pages = await mapLimit(offsets, 3, (offset) => fetchW3ChampionsPlayerMatchPage(battleTag, season, offset));

  for (const page of pages) {
    matches.push(...(page?.matches ?? []));
  }

  return matches.filter((match) => legionGameModeLabels.has(Number(match.gameMode)));
}

async function fetchW3ChampionsPlayerMatchPage(battleTag: string, season: number, offset: number) {
  const params = new URLSearchParams({
    playerId: battleTag,
    gateway: String(w3ChampionsGateway),
    offset: String(Math.max(0, offset)),
    pageSize: String(w3cPlayerMatchPageSize),
    season: String(season)
  });

  return fetchJson<W3ChampionsMatchSearch>(`${w3ChampionsBaseUrl}/api/matches/search?${params.toString()}`, {
    allow404: true
  });
}

function applyW3ChampionsMatchRelationships(
  match: W3ChampionsMatch,
  normalizedBattleTag: string,
  relationshipMaps: RelationshipMaps
) {
  const gameMode = Number(match.gameMode);

  if (!legionGameModeLabels.has(gameMode) || !Array.isArray(match.teams) || match.teams.length < 2) {
    return false;
  }

  const profileTeam = match.teams.find((team) =>
    (team.players ?? []).some((player) => normalizeBattleTag(player.battleTag) === normalizedBattleTag)
  );

  if (!profileTeam) {
    return false;
  }

  const profilePlayer = (profileTeam.players ?? []).find((player) => normalizeBattleTag(player.battleTag) === normalizedBattleTag);
  const profileWon = typeof profileTeam.won === "boolean" ? profileTeam.won : profilePlayer?.won;
  const result = typeof profileWon === "boolean" ? (profileWon ? "win" : "loss") : "unknown";

  for (const team of match.teams) {
    const targetMap = team === profileTeam ? relationshipMaps.teammateByBattleTag : relationshipMaps.opponentByBattleTag;

    for (const player of team.players ?? []) {
      const normalizedPlayer = normalizeBattleTag(player.battleTag);

      if (!normalizedPlayer || normalizedPlayer === normalizedBattleTag) {
        continue;
      }

      updateRelationshipStats(targetMap, normalizedPlayer, player.battleTag ?? player.name ?? normalizedPlayer, result, player.name);
    }
  }

  relationshipMaps.matchIds.add(String(match.id ?? `${gameMode}:${match.startTime ?? relationshipMaps.matchIds.size}`));
  return true;
}

type RelationshipMaps = {
  opponentByBattleTag: Map<string, PlayerRivalry>;
  teammateByBattleTag: Map<string, PlayerRivalry>;
  matchIds: Set<string>;
};

function createRelationshipMaps(): RelationshipMaps {
  return {
    opponentByBattleTag: new Map(),
    teammateByBattleTag: new Map(),
    matchIds: new Set()
  };
}

function relationshipStatsFromMaps(
  scope: NonNullable<ReturnType<typeof rivalrySeasonScope>>,
  aggregateMaps: RelationshipMaps,
  mapsByMode: Map<number, RelationshipMaps>
): PlayerRivalries {
  const aggregate = relationshipGroupFromMaps(aggregateMaps);
  const modes = legionSeasonWindowModes
    .map((gameMode) => {
      const maps = mapsByMode.get(gameMode);

      if (!maps || maps.matchIds.size === 0) {
        return null;
      }

      return {
        gameMode,
        label: legionGameModeLabels.get(gameMode) ?? `Game mode ${gameMode}`,
        ...relationshipGroupFromMaps(maps)
      };
    })
    .filter((mode): mode is PlayerRivalryMode => mode !== null);

  return {
    source: "w3champions",
    seasons: scope.seasons,
    startedAt: scope.startedAt,
    endedAt: scope.endedAt,
    modes,
    ...aggregate
  };
}

function relationshipGroupFromMaps(relationshipMaps: RelationshipMaps): PlayerRivalryGroup {
  const rivalries = [...relationshipMaps.opponentByBattleTag.values()];
  const teammates = [...relationshipMaps.teammateByBattleTag.values()];
  const maxRivalryGames = maxRelationshipGames(rivalries);
  const maxTeammateGames = maxRelationshipGames(teammates);
  const byMostPlayed = (a: PlayerRivalry, b: PlayerRivalry) =>
    b.games - a.games || b.wins + b.losses - (a.wins + a.losses) || a.name.localeCompare(b.name);
  const byMostDefeated = (a: PlayerRivalry, b: PlayerRivalry) =>
    b.wins - a.wins || b.games - a.games || a.name.localeCompare(b.name);
  const byBestWinrate = (a: PlayerRivalry, b: PlayerRivalry) =>
    confidenceWinrateScore(b.wins, b.losses, maxRivalryGames) - confidenceWinrateScore(a.wins, a.losses, maxRivalryGames) ||
    b.games - a.games ||
    a.name.localeCompare(b.name);
  const byToughest = (a: PlayerRivalry, b: PlayerRivalry) =>
    confidenceWinrateScore(b.losses, b.wins, maxRivalryGames) - confidenceWinrateScore(a.losses, a.wins, maxRivalryGames) ||
    b.games - a.games ||
    a.name.localeCompare(b.name);
  const byBestTeammateWinrate = (a: PlayerRivalry, b: PlayerRivalry) =>
    confidenceWinrateScore(b.wins, b.losses, maxTeammateGames) - confidenceWinrateScore(a.wins, a.losses, maxTeammateGames) ||
    b.games - a.games ||
    a.name.localeCompare(b.name);
  const byWinrate = (a: PlayerRivalry, b: PlayerRivalry) =>
    relationshipWinrate(b) - relationshipWinrate(a) || b.games - a.games || a.name.localeCompare(b.name);
  const byLossrate = (a: PlayerRivalry, b: PlayerRivalry) =>
    relationshipLossrate(b) - relationshipLossrate(a) || b.losses - a.losses || b.games - a.games || a.name.localeCompare(b.name);

  return {
    matchCount: relationshipMaps.matchIds.size,
    mostPlayed: rivalries.slice().sort(byMostPlayed).slice(0, 3),
    mostDefeated: rivalries.filter((rivalry) => rivalry.wins > 0).sort(byMostDefeated).slice(0, 3),
    bestWinrate: rivalries
      .filter((rivalry) => hasMeaningfulRelationshipSample(rivalry, maxRivalryGames) && rivalry.wins > rivalry.losses)
      .sort(byBestWinrate)
      .slice(0, 3)
      .sort(byWinrate),
    toughest: rivalries
      .filter((rivalry) => hasMeaningfulRelationshipSample(rivalry, maxRivalryGames) && rivalry.losses > rivalry.wins)
      .sort(byToughest)
      .slice(0, 3)
      .sort(byLossrate),
    teammatesMostPlayed: teammates.slice().sort(byMostPlayed).slice(0, 3),
    teammatesBestWinrate: teammates
      .filter((teammate) => hasMeaningfulRelationshipSample(teammate, maxTeammateGames) && teammate.wins > teammate.losses)
      .sort(byBestTeammateWinrate)
      .slice(0, 3)
      .sort(byWinrate)
  };
}

function relationshipWinrate(relationship: PlayerRivalry) {
  return ratio(relationship.wins, relationship.wins + relationship.losses) ?? 0;
}

function relationshipLossrate(relationship: PlayerRivalry) {
  return ratio(relationship.losses, relationship.wins + relationship.losses) ?? 0;
}

function updateRelationshipStats(
  relationships: Map<string, PlayerRivalry>,
  normalizedBattleTag: string,
  battleTag: string,
  result: "win" | "loss" | "unknown",
  name?: string | null
) {
  const relationship =
    relationships.get(normalizedBattleTag) ??
    ({
      battleTag,
      name: name?.trim() || playerName(battleTag),
      games: 0,
      wins: 0,
      losses: 0,
      winrate: null
    } satisfies PlayerRivalry);

  relationship.games += 1;

  if (result === "win") {
    relationship.wins += 1;
  } else if (result === "loss") {
    relationship.losses += 1;
  }

  relationship.winrate = ratio(relationship.wins, relationship.wins + relationship.losses);
  relationships.set(normalizedBattleTag, relationship);
}

function rivalrySeasonScope(seasons: PlayerProfileSeason[]) {
  const scopedSeasons = seasons
    .slice()
    .sort((a, b) => b.season - a.season)
    .slice(0, 5);

  if (scopedSeasons.length === 0) {
    return null;
  }

  const startedAt = scopedSeasons
    .map((season) => season.startedAt)
    .filter((value): value is string => Boolean(value))
    .sort()[0] ?? null;
  const endedAt = scopedSeasons
    .map((season) => season.endedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? null;

  return {
    seasons: scopedSeasons.map((season) => season.season),
    startedAt,
    endedAt
  };
}

function maxRelationshipGames(relationships: PlayerRivalry[]) {
  return relationships.reduce((max, relationship) => Math.max(max, relationship.wins + relationship.losses), 0);
}

function confidenceWinrateScore(wins: number, losses: number, maxGames: number) {
  const games = wins + losses;

  if (games <= 0) {
    return 0;
  }

  const winrate = wins / games;
  const z = 1.96;
  const z2 = z * z;
  const lowerBound =
    (winrate + z2 / (2 * games) - z * Math.sqrt((winrate * (1 - winrate) + z2 / (4 * games)) / games)) /
    (1 + z2 / games);
  const relativeSampleWeight = maxGames > 0 ? Math.sqrt(games / maxGames) : 1;

  return lowerBound * (0.4 + 0.6 * relativeSampleWeight) * Math.log2(games + 1);
}

function hasMeaningfulRelationshipSample(rivalry: PlayerRivalry, maxGames: number) {
  const games = rivalry.wins + rivalry.losses;

  if (games < 3) {
    return false;
  }

  return maxGames <= 0 || games >= Math.ceil(maxGames * 0.25);
}

async function loadRefreshCandidates(pool: Pool, limit: number) {
  const [rows] = await pool.query<RefreshCandidateRow[]>(
    `SELECT battleTag
     FROM (
       SELECT
         p.battle_tag AS battleTag,
         MAX(m.started_at) AS last_game_at,
         MIN(stats.fetched_at) AS cached_at,
         MAX(
           CASE
             WHEN stats.profile_payload_json IS NULL THEN 1
             WHEN JSON_VALID(stats.profile_payload_json) = 0 THEN 1
             WHEN COALESCE(JSON_UNQUOTE(JSON_EXTRACT(stats.profile_payload_json, '$.rivalries.source')), '') <> 'w3champions' THEN 1
             WHEN JSON_EXTRACT(stats.profile_payload_json, '$.rivalries.matchCount') IS NULL THEN 1
             ELSE 0
           END
         ) AS needs_w3c_rivalries,
         COALESCE(MAX(season_stats.season_count), 0) AS season_rows
       FROM players p
       INNER JOIN matches m ON m.id = p.match_id
       LEFT JOIN w3c_player_stats stats ON stats.normalized_battle_tag = LOWER(p.battle_tag)
       LEFT JOIN (
         SELECT normalized_battle_tag, COUNT(*) AS season_count
         FROM w3c_player_season_stats
         GROUP BY normalized_battle_tag
       ) season_stats ON season_stats.normalized_battle_tag = LOWER(p.battle_tag)
       WHERE p.battle_tag <> ''
         AND p.battle_tag <> 'FLO'
       GROUP BY p.battle_tag
     ) refresh_candidates
     ORDER BY needs_w3c_rivalries DESC,
       CASE WHEN needs_w3c_rivalries = 1 THEN last_game_at END DESC,
       (cached_at IS NOT NULL AND season_rows = 0) DESC,
       cached_at IS NULL DESC,
       cached_at ASC,
       last_game_at DESC
     LIMIT ?`,
    [limit]
  );

  return rows.map((row) => row.battleTag);
}

async function saveProfile(
  pool: Pool,
  profile: PlayerProfilePayload,
  raw: {
    rawProfile: W3ChampionsProfile | null;
    rawSeasons: W3ChampionsSeasonStats[];
  }
) {
  const selectedRawSeason = raw.rawSeasons.find((season) => season.season === profile.w3c.season);

  await pool.query(
    `INSERT INTO w3c_player_stats (
       battle_tag,
       normalized_battle_tag,
       player_name,
       w3c_season,
       w3c_gateway,
       legion_4v4_mmr,
       legion_4v4_rank,
       legion_4v4_wins,
       legion_4v4_losses,
       legion_4v4_games,
       legion_4v4_winrate,
       local_games,
       local_wins,
       local_losses,
       local_last_game_at,
       profile_payload_json,
       w3c_profile_json,
       w3c_game_mode_stats_json,
       w3c_race_stats_json,
       local_stats_json,
       fetch_error,
       fetched_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE
       battle_tag = VALUES(battle_tag),
       normalized_battle_tag = VALUES(normalized_battle_tag),
       player_name = VALUES(player_name),
       w3c_season = VALUES(w3c_season),
       w3c_gateway = VALUES(w3c_gateway),
       legion_4v4_mmr = VALUES(legion_4v4_mmr),
       legion_4v4_rank = VALUES(legion_4v4_rank),
       legion_4v4_wins = VALUES(legion_4v4_wins),
       legion_4v4_losses = VALUES(legion_4v4_losses),
       legion_4v4_games = VALUES(legion_4v4_games),
       legion_4v4_winrate = VALUES(legion_4v4_winrate),
       local_games = VALUES(local_games),
       local_wins = VALUES(local_wins),
       local_losses = VALUES(local_losses),
       local_last_game_at = VALUES(local_last_game_at),
       profile_payload_json = VALUES(profile_payload_json),
       w3c_profile_json = VALUES(w3c_profile_json),
       w3c_game_mode_stats_json = VALUES(w3c_game_mode_stats_json),
       w3c_race_stats_json = VALUES(w3c_race_stats_json),
       local_stats_json = VALUES(local_stats_json),
       fetch_error = VALUES(fetch_error),
       fetched_at = VALUES(fetched_at)`,
    [
      profile.battleTag,
      profile.normalizedBattleTag,
      profile.name,
      profile.w3c.season,
      profile.w3c.gateway,
      profile.w3c.current?.mmr,
      profile.w3c.current?.rank,
      profile.w3c.current?.wins,
      profile.w3c.current?.losses,
      profile.w3c.current?.games,
      profile.w3c.current?.winrate,
      profile.local.games,
      profile.local.wins,
      profile.local.losses,
      profile.local.lastGameAt,
      JSON.stringify(profile),
      JSON.stringify(raw.rawProfile),
      JSON.stringify(selectedRawSeason?.gameModeStats ?? []),
      JSON.stringify(selectedRawSeason?.raceStats ?? []),
      JSON.stringify(profile.local),
      profile.fetchError
    ]
  );

  for (const seasonProfile of profile.seasons) {
    const rawSeason = raw.rawSeasons.find((season) => season.season === seasonProfile.season);

    await saveSeasonProfile(pool, profile, seasonProfile, rawSeason);
  }
}

async function saveSeasonProfile(
  pool: Pool,
  profile: PlayerProfilePayload,
  seasonProfile: PlayerProfileSeason,
  rawSeason: W3ChampionsSeasonStats | undefined
) {
  await pool.query(
    `INSERT INTO w3c_player_season_stats (
       battle_tag,
       normalized_battle_tag,
       season,
       player_name,
       w3c_gateway,
       season_started_at,
       season_ended_at,
       legion_4v4_mmr,
       legion_4v4_rank,
       legion_4v4_wins,
       legion_4v4_losses,
       legion_4v4_games,
       legion_4v4_winrate,
       local_games,
       local_wins,
       local_losses,
       local_last_game_at,
       season_payload_json,
       w3c_game_mode_stats_json,
       w3c_race_stats_json,
       season_window_json,
       fetch_error,
       fetched_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE
       battle_tag = VALUES(battle_tag),
       player_name = VALUES(player_name),
       w3c_gateway = VALUES(w3c_gateway),
       season_started_at = VALUES(season_started_at),
       season_ended_at = VALUES(season_ended_at),
       legion_4v4_mmr = VALUES(legion_4v4_mmr),
       legion_4v4_rank = VALUES(legion_4v4_rank),
       legion_4v4_wins = VALUES(legion_4v4_wins),
       legion_4v4_losses = VALUES(legion_4v4_losses),
       legion_4v4_games = VALUES(legion_4v4_games),
       legion_4v4_winrate = VALUES(legion_4v4_winrate),
       local_games = VALUES(local_games),
       local_wins = VALUES(local_wins),
       local_losses = VALUES(local_losses),
       local_last_game_at = VALUES(local_last_game_at),
       season_payload_json = VALUES(season_payload_json),
       w3c_game_mode_stats_json = VALUES(w3c_game_mode_stats_json),
       w3c_race_stats_json = VALUES(w3c_race_stats_json),
       season_window_json = VALUES(season_window_json),
       fetch_error = VALUES(fetch_error),
       fetched_at = VALUES(fetched_at)`,
    [
      profile.battleTag,
      profile.normalizedBattleTag,
      seasonProfile.season,
      profile.name,
      profile.w3c.gateway,
      seasonProfile.startedAt,
      seasonProfile.endedAt,
      seasonProfile.current?.mmr,
      seasonProfile.current?.rank,
      seasonProfile.current?.wins,
      seasonProfile.current?.losses,
      seasonProfile.current?.games,
      seasonProfile.current?.winrate,
      seasonProfile.local.games,
      seasonProfile.local.wins,
      seasonProfile.local.losses,
      seasonProfile.local.lastGameAt,
      JSON.stringify(seasonProfile),
      JSON.stringify(rawSeason?.gameModeStats ?? []),
      JSON.stringify(rawSeason?.raceStats ?? []),
      JSON.stringify(rawSeason?.window ?? {
        startedAt: seasonProfile.startedAt,
        endedAt: seasonProfile.endedAt,
        matchCount: 0
      }),
      seasonProfile.fetchError
    ]
  );
}

function gameModeStatFromW3c(row: W3ChampionsGameModeStat): PlayerModeStat | null {
  const gameMode = nullableNumber(row.gameMode);

  if (gameMode === null || !legionGameModeLabels.has(gameMode)) {
    return null;
  }

  const wins = Number(row.wins ?? 0);
  const losses = Number(row.losses ?? 0);
  const games = Number(row.games ?? wins + losses);
  const quantile = nullableNumber(row.quantile);
  const topPercent = quantile === null ? null : Math.max(0, (1 - quantile) * 100);

  return {
    gameMode,
    label: legionGameModeLabels.get(gameMode) ?? `Game mode ${gameMode}`,
    mmr: nullableRoundedNumber(row.mmr),
    rank: nullableRoundedNumber(row.rank ?? row.rankNumber),
    rankingPoints: nullableRoundedNumber(row.rankingPoints),
    topPercent,
    wins,
    losses,
    games,
    winrate: nullableNumber(row.winrate) ?? ratio(wins, wins + losses)
  };
}

function raceStatFromW3c(row: W3ChampionsRaceStat): PlayerRaceStat | null {
  const race = nullableNumber(row.race);

  if (race === null) {
    return null;
  }

  const wins = Number(row.wins ?? 0);
  const losses = Number(row.losses ?? 0);
  const games = Number(row.games ?? wins + losses);

  return {
    race,
    label: raceLabels.get(race) ?? `Race ${race}`,
    wins,
    losses,
    games,
    winrate: nullableNumber(row.winrate) ?? ratio(wins, wins + losses)
  };
}

function isPlayerModeStat(value: PlayerModeStat | null): value is PlayerModeStat {
  return value !== null;
}

function isPlayerRaceStat(value: PlayerRaceStat | null): value is PlayerRaceStat {
  return value !== null;
}

function allTimeStatsFromProfile(profile: W3ChampionsProfile | null) {
  if (!profile?.winLosses?.length) {
    return null;
  }

  const totalRow = profile.winLosses.find((row) => Number(row.race) === 16);
  const rows = totalRow ? [totalRow] : profile.winLosses;
  const wins = rows.reduce((sum, row) => sum + Number(row.wins ?? 0), 0);
  const losses = rows.reduce((sum, row) => sum + Number(row.losses ?? 0), 0);
  const games = rows.reduce((sum, row) => sum + Number(row.games ?? Number(row.wins ?? 0) + Number(row.losses ?? 0)), 0);

  return {
    wins,
    losses,
    games,
    winrate: ratio(wins, wins + losses)
  };
}

function participatedSeasonsFromProfile(profile: W3ChampionsProfile | null) {
  return [...new Set((profile?.participatedInSeasons ?? []).map((season) => Number(season.id)).filter(Number.isFinite))].sort(
    (a, b) => b - a
  );
}

function parseJson<T>(value: string | null | undefined): T | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function uniqueSeasonIds(values: number[]) {
  return [...new Set(values.filter((value) => Number.isFinite(value) && value >= 0))].sort((a, b) => b - a);
}

async function mapLimit<T, R>(items: T[], limit: number, callback: (item: T, index: number) => Promise<R>) {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await callback(items[currentIndex], currentIndex);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function matchDateScope(alias: string, scope?: Pick<SeasonWindow, "startedAt" | "endedAt">) {
  const clauses: string[] = [];
  const params: string[] = [];

  if (scope?.startedAt) {
    clauses.push(`${alias}.started_at >= ?`);
    params.push(scope.startedAt);
  }

  if (scope?.endedAt) {
    clauses.push(`${alias}.started_at <= ?`);
    params.push(scope.endedAt);
  }

  return {
    sql: clauses.length > 0 ? `AND ${clauses.join(" AND ")}` : "",
    params
  };
}

function isFresh(isoDate: string, maxAgeMs: number) {
  const loadedAt = Date.parse(isoDate);

  return Number.isFinite(loadedAt) && Date.now() - loadedAt < maxAgeMs;
}

function normalizeLimit(limit: number) {
  if (!Number.isFinite(limit)) {
    return cronDefaultLimit;
  }

  return Math.max(1, Math.min(100, Math.floor(limit)));
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function nullableRoundedNumber(value: unknown) {
  const number = nullableNumber(value);

  return number === null ? null : Math.round(number);
}

function ratio(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : null;
}

function playerName(battleTag: string) {
  return battleTag.split("#")[0] || battleTag;
}

function secondsBetween(startedAt: string, finishedAt: string) {
  const start = Date.parse(`${startedAt.replace(" ", "T")}Z`);
  const finish = Date.parse(`${finishedAt.replace(" ", "T")}Z`);
  return Math.max(0, Math.round((finish - start) / 1000));
}

function mysqlDateTimeFromIso(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 19).replace("T", " ");
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
