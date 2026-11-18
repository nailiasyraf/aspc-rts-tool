import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { cookieOptions, FLOW_COOKIE, googleConfig, GOOGLE_SHEET_SCOPE, oauthClient, saveGoogleSession, unseal } from "@/lib/google-auth";

export async function GET(request: Request) {
  const config = googleConfig();
  if (!config) return NextResponse.json({ error: "Google sign-in has not been configured." }, { status: 503 });
  const jar = await cookies();
  const flowCookie = jar.get(FLOW_COOKIE)?.value;
  jar.set(FLOW_COOKIE, "", cookieOptions(0));
  const failure = () => NextResponse.redirect(`${config.origin}/?google=failed`);
  try {
    if (!flowCookie) return failure();
    const flow = z.object({ state: z.string(), codeVerifier: z.string(), expiresAt: z.number() }).parse(unseal(flowCookie, config.key));
    const params = new URL(request.url).searchParams;
    const state = params.get("state") ?? "";
    if (flow.expiresAt < Date.now() || state.length !== flow.state.length || !timingSafeEqual(Buffer.from(state), Buffer.from(flow.state)) || params.has("error")) return failure();
    const code = params.get("code");
    if (!code) return failure();
    const client = oauthClient();
    const { tokens } = await client.getToken({ code, codeVerifier: flow.codeVerifier });
    if (!tokens.access_token || !tokens.id_token || !tokens.scope?.split(" ").includes(GOOGLE_SHEET_SCOPE)) return failure();
    const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: config.clientId });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email || !payload.email_verified) return failure();
    await saveGoogleSession({ user: { id: payload.sub, email: payload.email }, accessToken: tokens.access_token, refreshToken: tokens.refresh_token ?? undefined, expiresAt: tokens.expiry_date ?? Date.now() + 3600000, validUntil: Date.now() + 7 * 86400000 });
    return NextResponse.redirect(`${config.origin}/?google=connected`);
  } catch {
    // Never log authorization codes, tokens or upstream OAuth error payloads.
    return failure();
  }
}
