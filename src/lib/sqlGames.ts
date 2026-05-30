import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

type SqlValue = string | number | null;

export type Player = {
  id: number;
  battleTag: string;
  name: string;
};

export type Team = {
  id: number;
  result: "win" | "loss" | "unknown";
  players: Player[];
};

export type Replay = {
  id: number;
  matchId: string;
  startedAt: string;
  finishedAt: string;
  duration: string;
  durationSeconds: number;
  mode: string;
  gameMode: string;
  subMode: string;
  mapVersion: string;
  kingSpell: string | null;
  winningTeamId: number | null;
  replayUrl: string | null;
  teams: Team[];
};

export type GamesPage = {
  source: string;
  count: number;
  mode: string | null;
  modes: GameModeOption[];
  gameMode: string | null;
  gameModes: GameModeOption[];
  page: number;
  pageSize: number;
  pageCount: number;
  replays: Replay[];
};

export type GameModeOption = {
  label: string;
  count: number;
};

type MatchRecord = {
  id: number;
  mmId: string;
  startedAt: string;
  finishedAt: string;
  winningTeamId: number | null;
  mapVersion: string;
  gameMode: string;
};

type GameInitRecord = {
  kingSpell: string | null;
  mapVersion: string;
};

const sourceFile = "dump-test.sql";
const sqlPath = join(process.cwd(), sourceFile);
const defaultPageSize = 8;
const maxPageSize = 50;

let cache: { mtimeMs: number; replays: Replay[] } | null = null;

export function getGamesPage({
  page: pageInput = 1,
  pageSize: pageSizeInput = defaultPageSize,
  mode: requestedMode,
  gameMode: requestedGameMode
}: {
  page?: number;
  pageSize?: number;
  mode?: string | null;
  gameMode?: string | null;
} = {}): GamesPage {
  const replays = loadReplays();
  const modes = getModeOptions(replays);
  const gameModes = getGameModeOptions(replays);
  const mode = resolveMode(requestedMode, modes);
  const gameMode = resolveGameMode(requestedGameMode, gameModes);
  const filteredReplays = replays.filter((replay) => {
    const matchesMode = mode ? replay.mode === mode : true;
    const matchesGameMode = gameMode ? replay.gameMode === gameMode : true;
    return matchesMode && matchesGameMode;
  });
  const pageSize = normalizeInteger(pageSizeInput, defaultPageSize, 1, maxPageSize);
  const pageCount = Math.max(1, Math.ceil(filteredReplays.length / pageSize));
  const page = normalizeInteger(pageInput, 1, 1, pageCount);
  const offset = (page - 1) * pageSize;

  return {
    source: sourceFile,
    count: filteredReplays.length,
    mode,
    modes,
    gameMode,
    gameModes,
    page,
    pageSize,
    pageCount,
    replays: filteredReplays.slice(offset, offset + pageSize)
  };
}

function loadReplays() {
  const stats = statSync(sqlPath);

  if (cache && cache.mtimeMs === stats.mtimeMs) {
    return cache.replays;
  }

  const sql = readFileSync(sqlPath, "utf8");
  const replays = buildReplays(sql);
  cache = { mtimeMs: stats.mtimeMs, replays };
  return replays;
}

function buildReplays(sql: string) {
  const matches = parseTable(sql, "matches").map((row): MatchRecord => ({
    id: toNumber(row[0]),
    mmId: toStringValue(row[1]),
    startedAt: toStringValue(row[2]),
    finishedAt: toStringValue(row[3]),
    winningTeamId: toNullableNumber(row[5]),
    mapVersion: toStringValue(row[6]),
    gameMode: toStringValue(row[7])
  }));

  const playersByMatch = new Map<number, Player[]>();
  for (const row of parseTable(sql, "players")) {
    const matchId = toNumber(row[0]);
    const playerId = toNumber(row[1]);
    const battleTag = toStringValue(row[2]);

    if (!battleTag || battleTag === "FLO") {
      continue;
    }

    const players = playersByMatch.get(matchId) ?? [];
    players.push({
      id: playerId,
      battleTag,
      name: playerName(battleTag)
    });
    playersByMatch.set(matchId, players);
  }

  const actionsById = new Map<number, { matchId: number }>();
  for (const row of parseTable(sql, "actions")) {
    actionsById.set(toNumber(row[0]), {
      matchId: toNumber(row[1])
    });
  }

  const gameInitByMatch = new Map<number, GameInitRecord>();
  for (const row of parseTable(sql, "records_game_init")) {
    const action = actionsById.get(toNumber(row[0]));
    if (!action) {
      continue;
    }

    gameInitByMatch.set(action.matchId, {
      kingSpell: toNullableString(row[1]),
      mapVersion: toStringValue(row[2])
    });
  }

  return matches
    .map((match) => {
      const players = [...(playersByMatch.get(match.id) ?? [])].sort((a, b) => a.id - b.id);
      const splitAt = Math.ceil(players.length / 2);
      const teams: Team[] = [
        {
          id: 0,
          result: match.winningTeamId === null ? "unknown" : match.winningTeamId === 0 ? "win" : "loss",
          players: players.slice(0, splitAt)
        },
        {
          id: 1,
          result: match.winningTeamId === null ? "unknown" : match.winningTeamId === 1 ? "win" : "loss",
          players: players.slice(splitAt)
        }
      ];
      const teamSize = Math.max(1, Math.max(teams[0].players.length, teams[1].players.length));
      const durationSeconds = secondsBetween(match.startedAt, match.finishedAt);
      const init = gameInitByMatch.get(match.id);

      return {
        id: match.id,
        matchId: match.mmId,
        startedAt: match.startedAt,
        finishedAt: match.finishedAt,
        duration: formatDuration(durationSeconds),
        durationSeconds,
        mode: `Legion TD ${teamSize}v${teamSize}`,
        gameMode: match.gameMode || "Unknown",
        subMode: match.gameMode ? `Legion TD: ${match.gameMode}` : "Legion TD",
        mapVersion: init?.mapVersion ?? match.mapVersion,
        kingSpell: init?.kingSpell ?? null,
        winningTeamId: match.winningTeamId,
        replayUrl: null,
        teams
      };
    })
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

function extractInsertBlocks(sql: string, tableName: string) {
  const marker = `INSERT INTO \`${tableName}\` VALUES`;
  const blocks: string[] = [];
  let offset = 0;

  while (offset < sql.length) {
    const start = sql.indexOf(marker, offset);
    if (start === -1) {
      break;
    }

    const valuesStart = start + marker.length;
    const lineEnd = sql.indexOf(";\n", valuesStart);
    const fallbackEnd = sql.indexOf(";", valuesStart);
    const end = lineEnd === -1 ? fallbackEnd : lineEnd;

    if (end === -1) {
      break;
    }

    blocks.push(sql.slice(valuesStart, end));
    offset = end + 1;
  }

  return blocks;
}

function splitRows(block: string) {
  const rows: string[] = [];
  let depth = 0;
  let inString = false;
  let escaped = false;
  let rowStart = -1;

  for (let index = 0; index < block.length; index += 1) {
    const char = block[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "'") {
        if (block[index + 1] === "'") {
          index += 1;
        } else {
          inString = false;
        }
      }
      continue;
    }

    if (char === "'") {
      inString = true;
      continue;
    }

    if (char === "(") {
      if (depth === 0) {
        rowStart = index + 1;
      }
      depth += 1;
      continue;
    }

    if (char === ")") {
      depth -= 1;
      if (depth === 0 && rowStart !== -1) {
        rows.push(block.slice(rowStart, index));
        rowStart = -1;
      }
    }
  }

  return rows;
}

function parseSqlValue(value: string): SqlValue {
  const trimmed = value.trim();

  if (trimmed.toUpperCase() === "NULL") {
    return null;
  }

  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed
      .slice(1, -1)
      .replace(/\\\\/g, "\\")
      .replace(/\\'/g, "'")
      .replace(/''/g, "'");
  }

  const numeric = Number(trimmed);
  return Number.isNaN(numeric) ? trimmed : numeric;
}

function parseRow(row: string) {
  const values: SqlValue[] = [];
  let inString = false;
  let escaped = false;
  let token = "";

  for (let index = 0; index < row.length; index += 1) {
    const char = row[index];

    if (inString) {
      token += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "'") {
        if (row[index + 1] === "'") {
          token += row[index + 1];
          index += 1;
        } else {
          inString = false;
        }
      }
      continue;
    }

    if (char === "'") {
      inString = true;
      token += char;
      continue;
    }

    if (char === ",") {
      values.push(parseSqlValue(token));
      token = "";
      continue;
    }

    token += char;
  }

  if (token.length > 0) {
    values.push(parseSqlValue(token));
  }

  return values;
}

function parseTable(sql: string, tableName: string) {
  return extractInsertBlocks(sql, tableName).flatMap((block) => splitRows(block).map(parseRow));
}

function getModeOptions(replays: Replay[]) {
  const counts = new Map<string, number>();

  for (const replay of replays) {
    counts.set(replay.mode, (counts.get(replay.mode) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => extractTeamSize(b.label) - extractTeamSize(a.label) || a.label.localeCompare(b.label));
}

function resolveMode(requestedMode: string | null | undefined, modes: GameModeOption[]) {
  if (modes.length === 0) {
    return null;
  }

  if (requestedMode && modes.some((mode) => mode.label === requestedMode)) {
    return requestedMode;
  }

  return modes.find((mode) => mode.label === "Legion TD 4v4")?.label ?? modes[0].label;
}

function getGameModeOptions(replays: Replay[]) {
  const counts = new Map<string, number>();

  for (const replay of replays) {
    counts.set(replay.gameMode, (counts.get(replay.gameMode) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function resolveGameMode(requestedGameMode: string | null | undefined, gameModes: GameModeOption[]) {
  if (gameModes.length === 0) {
    return null;
  }

  if (requestedGameMode && gameModes.some((gameMode) => gameMode.label === requestedGameMode)) {
    return requestedGameMode;
  }

  return gameModes.find((gameMode) => gameMode.label === "PRACMI")?.label ?? gameModes[0].label;
}

function extractTeamSize(label: string) {
  const match = label.match(/(\d+)v\d+/);
  return match ? Number(match[1]) : 0;
}

function toNumber(value: SqlValue) {
  if (typeof value === "number") {
    return value;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function toNullableNumber(value: SqlValue) {
  return value === null ? null : toNumber(value);
}

function toStringValue(value: SqlValue) {
  return value === null ? "" : String(value);
}

function toNullableString(value: SqlValue) {
  if (value === null) {
    return null;
  }

  const stringValue = String(value);
  return stringValue.length > 0 ? stringValue : null;
}

function normalizeInteger(value: number, fallback: number, min: number, max: number) {
  const integer = Math.floor(value);

  if (!Number.isFinite(integer)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, integer));
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
