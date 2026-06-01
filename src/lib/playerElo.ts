const playerEloUrl = "https://www.lgnw3.com/api/all-players?mode=all";
const w3ChampionsBaseUrl = "https://website-backend.w3champions.com";
const w3ChampionsGateway = 20;
const w3ChampionsLegion4v4Mode = 202;
const playerEloCacheMs = 10 * 60 * 1000;
const w3ChampionsMmrCacheMs = 10 * 60 * 1000;
const w3ChampionsConcurrency = 6;

type LgnPlayer = {
  player_name?: string;
  elo?: number | string | null;
};

let playerEloCache: { loadedAt: number; eloByBattleTag: Map<string, number> } | null = null;
let w3ChampionsSeasonCache: { loadedAt: number; season: number } | null = null;
let w3ChampionsMmrCache: { loadedAt: number; mmrByBattleTag: Map<string, number | null>; season: number } | null = null;

export async function getPlayerEloMap() {
  if (playerEloCache && Date.now() - playerEloCache.loadedAt < playerEloCacheMs) {
    return playerEloCache.eloByBattleTag;
  }

  try {
    const response = await fetch(playerEloUrl, {
      headers: { accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(12_000)
    });

    if (!response.ok) {
      throw new Error(`LGN ELO request failed with ${response.status}`);
    }

    const payload: unknown = await response.json();
    const players = Array.isArray(payload)
      ? payload
      : payload && typeof payload === "object" && Array.isArray((payload as { players?: unknown }).players)
        ? (payload as { players: unknown[] }).players
        : [];

    if (players.length === 0) {
      throw new Error("LGN ELO response did not include players");
    }
    const eloByBattleTag = new Map<string, number>();

    for (const player of players) {
      const row = player as LgnPlayer;
      const battleTag = normalizeBattleTag(row.player_name);
      const elo = Number(row.elo);
      if (battleTag && Number.isFinite(elo)) {
        eloByBattleTag.set(battleTag, Math.round(elo));
      }
    }

    playerEloCache = { loadedAt: Date.now(), eloByBattleTag };
    return eloByBattleTag;
  } catch {
    return playerEloCache?.eloByBattleTag ?? new Map<string, number>();
  }
}

export async function getW3ChampionsLegion4v4MmrMap(battleTags: string[]) {
  const season = await getLatestW3ChampionsSeason();

  if (!season) {
    return new Map<string, number>();
  }

  if (
    !w3ChampionsMmrCache ||
    w3ChampionsMmrCache.season !== season ||
    Date.now() - w3ChampionsMmrCache.loadedAt >= w3ChampionsMmrCacheMs
  ) {
    w3ChampionsMmrCache = { loadedAt: Date.now(), mmrByBattleTag: new Map(), season };
  }

  const uniqueBattleTags = [...new Set(battleTags.map(normalizeBattleTag).filter(Boolean))];
  const missingBattleTags = uniqueBattleTags.filter((battleTag) => !w3ChampionsMmrCache?.mmrByBattleTag.has(battleTag));

  for (let index = 0; index < missingBattleTags.length; index += w3ChampionsConcurrency) {
    const chunk = missingBattleTags.slice(index, index + w3ChampionsConcurrency);
    await Promise.all(
      chunk.map(async (battleTag) => {
        const mmr = await fetchW3ChampionsLegion4v4Mmr(battleTag, season);
        w3ChampionsMmrCache?.mmrByBattleTag.set(battleTag, mmr);
      })
    );
  }

  const mmrByBattleTag = new Map<string, number>();

  for (const battleTag of uniqueBattleTags) {
    const mmr = w3ChampionsMmrCache.mmrByBattleTag.get(battleTag);
    if (typeof mmr === "number") {
      mmrByBattleTag.set(battleTag, mmr);
    }
  }

  return mmrByBattleTag;
}

async function getLatestW3ChampionsSeason() {
  if (w3ChampionsSeasonCache && Date.now() - w3ChampionsSeasonCache.loadedAt < w3ChampionsMmrCacheMs) {
    return w3ChampionsSeasonCache.season;
  }

  try {
    const response = await fetch(`${w3ChampionsBaseUrl}/api/ladder/seasons`, {
      headers: { accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(12_000)
    });

    if (!response.ok) {
      throw new Error(`W3Champions seasons request failed with ${response.status}`);
    }

    const payload: unknown = await response.json();
    const seasons = Array.isArray(payload) ? payload : [];
    const latestSeason = seasons
      .map((season) => Number((season as { id?: unknown }).id))
      .filter((season) => Number.isFinite(season))
      .sort((a, b) => b - a)[0];

    if (!Number.isFinite(latestSeason)) {
      return null;
    }

    w3ChampionsSeasonCache = { loadedAt: Date.now(), season: latestSeason };
    return latestSeason;
  } catch {
    return w3ChampionsSeasonCache?.season ?? null;
  }
}

async function fetchW3ChampionsLegion4v4Mmr(battleTag: string, season: number) {
  try {
    const url = new URL(`${w3ChampionsBaseUrl}/api/ladder/search`);
    url.searchParams.set("gateWay", String(w3ChampionsGateway));
    url.searchParams.set("searchFor", battleTag);
    url.searchParams.set("season", String(season));
    url.searchParams.set("gameMode", String(w3ChampionsLegion4v4Mode));

    const response = await fetch(url, {
      headers: { accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(12_000)
    });

    if (!response.ok) {
      return null;
    }

    const payload: unknown = await response.json();
    const rows = Array.isArray(payload) ? payload : [];
    const exactRow = rows.find((row) => rowContainsBattleTag(row, battleTag));
    const mmr = Number((exactRow as W3ChampionsLadderRow | undefined)?.player?.mmr);

    return Number.isFinite(mmr) ? Math.round(mmr) : null;
  } catch {
    return null;
  }
}

type W3ChampionsLadderRow = {
  player1Id?: string | null;
  player?: {
    mmr?: number | string | null;
    playerIds?: Array<{
      battleTag?: string | null;
    }>;
  } | null;
};

function rowContainsBattleTag(row: unknown, battleTag: string) {
  const normalizedBattleTag = normalizeBattleTag(battleTag);
  const ladderRow = row as W3ChampionsLadderRow;

  if (normalizeBattleTag(ladderRow.player1Id) === normalizedBattleTag) {
    return true;
  }

  return Boolean(
    ladderRow.player?.playerIds?.some((playerId) => normalizeBattleTag(playerId.battleTag) === normalizedBattleTag)
  );
}

export function normalizeBattleTag(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}
