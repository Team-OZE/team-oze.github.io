import { NextResponse } from "next/server";
import { getReplayViewerData } from "../../../../lib/replayViewerData";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  try {
    const replay = await getReplayViewerData(id);

    if (!replay) {
      return NextResponse.json({ error: "Replay not found" }, { status: 404 });
    }

    return NextResponse.json(replay);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load replay";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
