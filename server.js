const http = require("http");
const next = require("next");

const port = Number(process.env.PORT || 3000);
const hostname = process.env.HOSTNAME || "0.0.0.0";
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

function startW3cStatsInterval() {
  if (process.env.W3C_PLAYER_STATS_INTERNAL_CRON === "0") {
    return;
  }

  const intervalMs = Number(process.env.W3C_PLAYER_STATS_INTERNAL_CRON_MS || 300000);

  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    return;
  }

  let running = false;
  const refresh = async () => {
    if (running) {
      return;
    }

    running = true;

    try {
      const headers = process.env.CRON_SECRET
        ? { authorization: `Bearer ${process.env.CRON_SECRET}` }
        : undefined;
      const response = await fetch(`http://127.0.0.1:${port}/api/cron/w3c-player-stats`, { headers });

      if (!response.ok) {
        console.error(`W3C stats refresh failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error("W3C stats refresh failed:", error);
    } finally {
      running = false;
    }
  };

  setTimeout(refresh, 30000).unref();
  setInterval(refresh, intervalMs).unref();
}

app.prepare().then(() => {
  http
    .createServer((request, response) => {
      handle(request, response);
    })
    .listen(port, hostname, () => {
      console.log(`Ready on http://${hostname}:${port}`);
      startW3cStatsInterval();
    });
});
