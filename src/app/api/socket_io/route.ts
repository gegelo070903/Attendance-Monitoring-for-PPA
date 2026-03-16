import { NextResponse } from "next/server";
import { getIO } from "@/lib/socketServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    socketInitialized: Boolean(getIO()),
  });
}
