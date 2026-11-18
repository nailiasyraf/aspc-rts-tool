import { NextResponse } from "next/server";
import { googleConfig, readGoogleSession } from "@/lib/google-auth";

export async function GET() {
  const session = await readGoogleSession();
  return NextResponse.json({ configured: Boolean(googleConfig()), connected: Boolean(session), user: session?.user }, { headers: { "Cache-Control": "no-store" } });
}
