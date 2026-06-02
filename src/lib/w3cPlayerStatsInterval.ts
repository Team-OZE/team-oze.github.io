import { refreshW3cPlayerStats } from "./w3cPlayerStats";

type W3cRefreshGlobal = typeof globalThis & {
  __teamOzeW3cPlayerStatsInterval?: NodeJS.Timeout;
  __teamOzeW3cPlayerStatsRunning?: boolean;
};

const defaultIntervalMs = 5 * 60 * 1000;
const defaultStartupDelayMs = 10_000;

export function startW3cPlayerStatsRefreshInterval() {
  const state = globalThis as W3cRefreshGlobal;

  if (!intervalEnabled() || state.__teamOzeW3cPlayerStatsInterval) {
    return;
  }

  const intervalMs = positiveInteger(process.env.W3C_PLAYER_STATS_INTERVAL_MS, defaultIntervalMs);
  const startupDelayMs = positiveInteger(process.env.W3C_PLAYER_STATS_INTERVAL_STARTUP_DELAY_MS, defaultStartupDelayMs);
  const limit = positiveInteger(process.env.W3C_PLAYER_STATS_CRON_LIMIT, 36);
  const run = async () => {
    if (state.__teamOzeW3cPlayerStatsRunning) {
      return;
    }

    state.__teamOzeW3cPlayerStatsRunning = true;

    try {
      const result = await refreshW3cPlayerStats(limit);
      console.log(
        `[w3c-player-stats] refreshed ${result.refreshed}/${result.attempted}; failed ${result.failed}`
      );
    } catch (error) {
      console.error("[w3c-player-stats] refresh failed", error);
    } finally {
      state.__teamOzeW3cPlayerStatsRunning = false;
    }
  };

  const startupTimer = setTimeout(run, startupDelayMs);
  state.__teamOzeW3cPlayerStatsInterval = setInterval(run, intervalMs);
  startupTimer.unref?.();
  state.__teamOzeW3cPlayerStatsInterval.unref?.();
}

function intervalEnabled() {
  const value = process.env.W3C_PLAYER_STATS_INTERVAL_ENABLED;

  return value !== "0" && value !== "false" && value !== "no";
}

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}
