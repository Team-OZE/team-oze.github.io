import type { RowDataPacket } from "mysql2";
import { getW3cStatsDatabasePool } from "./database";

export const w3ChampionsLegion4v4Mode = 202;
export const w3ChampionsLegion1v1Mode = 203;
export const w3ChampionsLegion2v2Mode = 205;

type CachedW3cPlayerRatingRow = RowDataPacket & {
  normalizedBattleTag: string;
  legion4v4Mmr: number | string | null;
  profilePayloadJson: string | null;
  gameModeStatsJson: string | null;
};

type W3cRatingPayload = {
  w3c?: {
    modes?: W3cModeRating[];
  };
};

type W3cModeRating = {
  gameMode?: number | string | null;
  mmr?: number | string | null;
};

export type PlayerMmrByModeMap = Map<string, Map<number, number>>;

export async function getCachedW3ChampionsMmrByModeMap(battleTags: string[]): Promise<PlayerMmrByModeMap> {
  const uniqueBattleTags = [...new Set(battleTags.map(normalizeBattleTag).filter(Boolean))];

  if (uniqueBattleTags.length === 0) {
    return new Map();
  }

  const pool = await getW3cStatsDatabasePool();

  if (!pool) {
    return new Map();
  }

  try {
    const placeholders = uniqueBattleTags.map(() => "?").join(", ");
    const [rows] = await pool.query<CachedW3cPlayerRatingRow[]>(
      `SELECT
         normalized_battle_tag AS normalizedBattleTag,
         legion_4v4_mmr AS legion4v4Mmr,
         profile_payload_json AS profilePayloadJson,
         w3c_game_mode_stats_json AS gameModeStatsJson
       FROM w3c_player_stats
       WHERE normalized_battle_tag IN (${placeholders})`,
      uniqueBattleTags
    );
    const mmrByBattleTag: PlayerMmrByModeMap = new Map();

    for (const row of rows) {
      const normalizedBattleTag = normalizeBattleTag(row.normalizedBattleTag);
      const mmrByMode = mmrByModeFromCachedRow(row);

      if (normalizedBattleTag && mmrByMode.size > 0) {
        mmrByBattleTag.set(normalizedBattleTag, mmrByMode);
      }
    }

    return mmrByBattleTag;
  } catch {
    return new Map();
  }
}

export async function getCachedW3ChampionsBattleTagsInMmrRange(gameMode: number, min: number, max: number) {
  const lower = Math.min(min, max);
  const upper = Math.max(min, max);
  const pool = await getW3cStatsDatabasePool();

  if (!pool || !Number.isFinite(lower) || !Number.isFinite(upper)) {
    return [];
  }

  try {
    const [rows] = await pool.query<CachedW3cPlayerRatingRow[]>(
      `SELECT
         normalized_battle_tag AS normalizedBattleTag,
         legion_4v4_mmr AS legion4v4Mmr,
         profile_payload_json AS profilePayloadJson,
         w3c_game_mode_stats_json AS gameModeStatsJson
       FROM w3c_player_stats
       WHERE normalized_battle_tag <> ''`
    );

    return rows
      .filter((row) => {
        const mmr = mmrByModeFromCachedRow(row).get(gameMode);
        return typeof mmr === "number" && mmr >= lower && mmr <= upper;
      })
      .map((row) => normalizeBattleTag(row.normalizedBattleTag))
      .filter(Boolean);
  } catch {
    return [];
  }
}

export async function getPlayerEloMap(battleTags: string[] = []) {
  return getCachedW3ChampionsMmrMap(battleTags, w3ChampionsLegion4v4Mode);
}

export async function getW3ChampionsLegion4v4MmrMap(battleTags: string[]) {
  return getCachedW3ChampionsMmrMap(battleTags, w3ChampionsLegion4v4Mode);
}

export async function getCachedW3ChampionsMmrMap(battleTags: string[], gameMode: number) {
  const mmrByMode = await getCachedW3ChampionsMmrByModeMap(battleTags);
  const mmrByBattleTag = new Map<string, number>();

  for (const battleTag of battleTags) {
    const normalizedBattleTag = normalizeBattleTag(battleTag);
    const mmr = mmrByMode.get(normalizedBattleTag)?.get(gameMode);

    if (typeof mmr === "number") {
      mmrByBattleTag.set(normalizedBattleTag, mmr);
    }
  }

  return mmrByBattleTag;
}

export function cachedW3ChampionsMmrForMode(
  mmrByBattleTag: PlayerMmrByModeMap,
  battleTag: string | null | undefined,
  gameMode: number | null
) {
  if (gameMode === null) {
    return null;
  }

  return mmrByBattleTag.get(normalizeBattleTag(battleTag))?.get(gameMode) ?? null;
}

export function w3ChampionsGameModeForTeamSize(teamSize: number) {
  switch (teamSize) {
    case 1:
      return w3ChampionsLegion1v1Mode;
    case 2:
      return w3ChampionsLegion2v2Mode;
    case 4:
      return w3ChampionsLegion4v4Mode;
    default:
      return null;
  }
}

export function normalizeBattleTag(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function mmrByModeFromCachedRow(row: CachedW3cPlayerRatingRow) {
  const mmrByMode = new Map<number, number>();
  const profilePayload = parseJson<W3cRatingPayload>(row.profilePayloadJson);

  addModeRatings(mmrByMode, profilePayload?.w3c?.modes);
  addModeRatings(mmrByMode, parseJson<W3cModeRating[]>(row.gameModeStatsJson));

  const legion4v4Mmr = nullableRoundedNumber(row.legion4v4Mmr);

  if (legion4v4Mmr !== null && !mmrByMode.has(w3ChampionsLegion4v4Mode)) {
    mmrByMode.set(w3ChampionsLegion4v4Mode, legion4v4Mmr);
  }

  return mmrByMode;
}

function addModeRatings(mmrByMode: Map<number, number>, modes: W3cModeRating[] | undefined | null) {
  if (!Array.isArray(modes)) {
    return;
  }

  for (const mode of modes) {
    const gameMode = nullableRoundedNumber(mode.gameMode);
    const mmr = nullableRoundedNumber(mode.mmr);

    if (gameMode !== null && mmr !== null) {
      mmrByMode.set(gameMode, mmr);
    }
  }
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

function nullableRoundedNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : null;
}
