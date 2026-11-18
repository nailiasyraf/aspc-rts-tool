import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { CodeChallengeMethod } from "google-auth-library";
import { cookieOptions, FLOW_COOKIE, googleConfig, GOOGLE_SHEET_SCOPE, isSameOrigin, oauthClient, seal } from "@/lib/google-auth";

export async function POST(request: Request) {
  const config = googleConfig();
  if (!config) return NextResponse.json({ error: "Google sign-in has not been configured." }, { status: 503 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Open the tool at its configured address before signing in." }, { status: 403 });
  const client = oauthClient();
  const state = randomBytes(32).toString("base64url");
  const { codeVerifier, codeChallenge } = await client.generateCodeVerifierAsync();
  (await cookies()).set(FLOW_COOKIE, seal({ state, codeVerifier, expiresAt: Date.now() + 10 * 60 * 1000 }, config.key), cookieOptions(600));
  const url = client.generateAuthUrl({ access_type: "offline", prompt: "consent", scope: ["openid", "email", GOOGLE_SHEET_SCOPE], state, code_challenge: codeChallenge, code_challenge_method: CodeChallengeMethod.S256 });
  return NextResponse.redirect(url, 303);
}
