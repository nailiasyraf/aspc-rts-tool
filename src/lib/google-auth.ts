import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { cookies } from "next/headers";
import { z } from "zod";

export const SESSION_COOKIE = "aspc_google_session";
export const FLOW_COOKIE = "aspc_google_flow";
export const GOOGLE_SHEET_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";
const sessionSchema = z.object({ user: z.object({ id: z.string(), email: z.string() }), accessToken: z.string(), refreshToken: z.string().optional(), expiresAt: z.number(), validUntil: z.number() });
export type GoogleSession = z.infer<typeof sessionSchema>;

export function defaultGoogleSheetId(): string | undefined {
  const id = process.env.GOOGLE_DEFAULT_SHEET_ID?.trim();
  return id && /^[A-Za-z0-9_-]{10,200}$/.test(id) ? id : undefined;
}

export function googleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const secret = process.env.GOOGLE_SESSION_SECRET;
  const appUrl = process.env.GOOGLE_APP_URL;
  if (!clientId || !clientSecret || !secret || !appUrl) return null;
  const key = Buffer.from(secret, "base64");
  if (key.length !== 32) return null;
  try {
    const url = new URL(appUrl);
    if ((url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) || url.pathname !== "/" || url.search || url.hash || url.username || url.password) return null;
    return { clientId, clientSecret, key, origin: url.origin, redirectUri: `${url.origin}/api/google/callback` };
  } catch { return null; }
}

export function seal(value: unknown, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}
export function unseal(value: string, key: Buffer): unknown {
  const data = Buffer.from(value, "base64url");
  const decipher = createDecipheriv("aes-256-gcm", key, data.subarray(0, 12));
  decipher.setAuthTag(data.subarray(12, 28));
  return JSON.parse(Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString("utf8"));
}
export function oauthClient() {
  const config = googleConfig();
  if (!config) throw new Error("Google sign-in has not been configured.");
  return new OAuth2Client({ clientId: config.clientId, clientSecret: config.clientSecret, redirectUri: config.redirectUri, transporterOptions: { timeout: 25000 } });
}
export function cookieOptions(maxAge: number) {
  return { httpOnly: true, sameSite: "lax" as const, secure: googleConfig()?.origin.startsWith("https:") ?? true, path: "/api/google", maxAge };
}
export async function readGoogleSession(): Promise<GoogleSession | null> {
  const config = googleConfig();
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!config || !value) return null;
  try {
    const session = sessionSchema.parse(unseal(value, config.key));
    return session.validUntil > Date.now() ? session : null;
  } catch { return null; }
}
export async function saveGoogleSession(session: GoogleSession) {
  const config = googleConfig();
  if (!config) throw new Error("Google sign-in has not been configured.");
  const encrypted = seal(session, config.key);
  if (encrypted.length > 3800) throw new Error("Google session is too large.");
  (await cookies()).set(SESSION_COOKIE, encrypted, cookieOptions(Math.max(0, Math.floor((session.validUntil - Date.now()) / 1000))));
}
export async function clearGoogleSession() {
  (await cookies()).set(SESSION_COOKIE, "", cookieOptions(0));
}
export function isSameOrigin(request: Request): boolean {
  return Boolean(googleConfig() && request.headers.get("origin") === googleConfig()?.origin);
}
