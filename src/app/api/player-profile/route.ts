import { NextResponse } from "next/server";
import { getPlayerProfile } from "../../../lib/w3cPlayerStats";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const battleTag = url.searchParams.get("battleTag") ?? url.searchParams.get("player") ?? "";

  try {
    return NextResponse.json(await getPlayerProfile(battleTag));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load player profile";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
