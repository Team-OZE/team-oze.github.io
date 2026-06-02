export async function register() {
  if (process.env.NEXT_RUNTIME === "edge" || process.env.NEXT_PHASE === "phase-production-build") {
    return;
  }

  const { startW3cPlayerStatsRefreshInterval } = await import("./lib/w3cPlayerStatsInterval");
  startW3cPlayerStatsRefreshInterval();
}
