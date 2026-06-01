import { NextResponse } from "next/server";
import { getLevelOneGuideData } from "../../../../lib/levelOneGuideData";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json(await getLevelOneGuideData());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load level 1 guide data";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
