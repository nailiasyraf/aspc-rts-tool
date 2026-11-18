import { NextResponse } from "next/server";
import { defaultGoogleSheetId, googleConfig, readGoogleSession } from "@/lib/google-auth";

export async function GET() {
  const session = await readGoogleSession();
  const defaultSheetId = defaultGoogleSheetId();
  return NextResponse.json({ configured: Boolean(googleConfig()), connected: Boolean(session), user: session?.user,
    hasDefaultSheet: Boolean(defaultSheetId), defaultSheetId: session ? defaultSheetId : undefined,
  }, { headers: { "Cache-Control": "no-store" } });
}
