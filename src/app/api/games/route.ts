import { NextResponse } from "next/server";
import { getGamesPage } from "../../../lib/sqlGames";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Number(url.searchParams.get("pageSize") ?? "8");
  const mode = url.searchParams.get("mode");
  const gameMode = url.searchParams.get("gameMode");

  try {
    return NextResponse.json(getGamesPage({ page, pageSize, mode, gameMode }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load games";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
