import { NextResponse } from "next/server";
import { refreshW3cPlayerStats } from "../../../../lib/w3cPlayerStats";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const unauthorized = authorizeCron(request);

  if (unauthorized) {
    return unauthorized;
  }

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? process.env.W3C_PLAYER_STATS_CRON_LIMIT ?? "36");

  try {
    return NextResponse.json(await refreshW3cPlayerStats(limit));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to refresh W3Champions player stats";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function authorizeCron(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return null;
  }

  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : "";

  if (token === secret) {
    return null;
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
