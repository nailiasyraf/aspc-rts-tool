import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { clearGoogleSession, cookieOptions, FLOW_COOKIE, isSameOrigin } from "@/lib/google-auth";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  await clearGoogleSession();
  (await cookies()).set(FLOW_COOKIE, "", cookieOptions(0));
  return NextResponse.json({ disconnected: true }, { headers: { "Cache-Control": "no-store" } });
}
