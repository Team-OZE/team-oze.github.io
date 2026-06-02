import { NextResponse } from "next/server";
import { getGamesPage } from "../../../lib/gameData";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Number(url.searchParams.get("pageSize") ?? "8");
  const mode = url.searchParams.get("mode");
  const gameMode = url.searchParams.get("gameMode");
  const player = url.searchParams.get("player");
  const eloMin = parseOptionalNumber(url.searchParams.get("eloMin"));
  const eloMax = parseOptionalNumber(url.searchParams.get("eloMax"));
  const groupPages = parseGroupPages(url.searchParams.get("groupPages"));

  try {
    return NextResponse.json(await getGamesPage({ page, pageSize, mode, gameMode, player, eloMin, eloMax, groupPages }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load games";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function parseOptionalNumber(value: string | null) {
  if (value === null || value.trim() === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function parseGroupPages(value: string | null) {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed)
        .map(([key, page]) => [key, Number(page)] as const)
        .filter(([key, page]) => key && Number.isFinite(page))
    );
  } catch {
    return {};
  }
}
