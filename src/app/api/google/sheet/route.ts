import { NextResponse } from "next/server";
import { z } from "zod";
import { clearGoogleSession, isSameOrigin, oauthClient, readGoogleSession, saveGoogleSession } from "@/lib/google-auth";
import { snapshotFromValues } from "@/lib/google-sheet-data";
import { rowLabelToField } from "@/lib/parser/normalizeRowLabel";

const noCache = { "Cache-Control": "no-store" };
function fail(error: string, status: number) { return NextResponse.json({ error }, { status, headers: noCache }); }

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return fail("Open the tool at its configured address.", 403);
  const session = await readGoogleSession();
  if (!session) return fail("Your Google session ended. Sign in again to resume checks.", 401);
  const input = z.object({ spreadsheetId: z.string().regex(/^[A-Za-z0-9_-]{10,200}$/), accountId: z.string() }).safeParse(await request.json().catch(() => null));
  if (!input.success) return fail("Paste a valid Google Sheets link.", 400);
  if (input.data.accountId !== session.user.id) return fail("The Google account changed in another tab. Reload this page before connecting.", 409);
  let accessToken = session.accessToken;
  if (session.expiresAt < Date.now() + 60000) {
    if (!session.refreshToken) return fail("Sign in again to resume automatic checks.", 401);
    try {
      const client = oauthClient();
      client.setCredentials({ refresh_token: session.refreshToken });
      const { credentials } = await client.refreshAccessToken();
      if (!credentials.access_token) return fail("Sign in again to resume automatic checks.", 401);
      accessToken = credentials.access_token;
      await saveGoogleSession({ ...session, accessToken, refreshToken: credentials.refresh_token ?? session.refreshToken, expiresAt: credentials.expiry_date ?? Date.now() + 3600000 });
    } catch (error) {
      const code = (error as { response?: { data?: { error?: string } } }).response?.data?.error;
      if (code === "invalid_grant") { await clearGoogleSession(); return fail("Your Google permission expired. Sign in again to resume checks.", 401); }
      return fail("Google sign-in could not be refreshed. Try checking again.", 503);
    }
  }
  const root = `https://sheets.googleapis.com/v4/spreadsheets/${input.data.spreadsheetId}`;
  async function get(url: string) {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store", signal: AbortSignal.timeout(25000) });
    if (!response.ok) throw Object.assign(new Error("Google request failed"), { status: response.status });
    return response.json();
  }
  try {
    const metadata = z.object({ properties: z.object({ title: z.string() }), sheets: z.array(z.object({ properties: z.object({ title: z.string() }) })) }).parse(await get(`${root}?fields=properties.title,sheets.properties.title`));
    const titles = metadata.sheets.map((sheet) => sheet.properties.title).filter((title) => title === "Marketing" || title.trim().toLowerCase() === "tiktok price");
    if (!titles.length) return fail("This spreadsheet has no Marketing or TikTok Price tab. Check the link and tab names.", 422);
    const query = new URLSearchParams({ valueRenderOption: "UNFORMATTED_VALUE", majorDimension: "ROWS" });
    for (const title of titles) query.append("ranges", `'${title.replace(/'/g, "''")}'`);
    const values = z.object({ valueRanges: z.array(z.object({ values: z.array(z.array(z.union([z.string(), z.number(), z.boolean(), z.null()]))).optional() })) }).parse(await get(`${root}/values:batchGet?${query}`));
    if (values.valueRanges.length !== titles.length) return fail("Google returned incomplete sheet data. Try again.", 502);
    const tabs = titles.map((title, index) => ({ title, values: values.valueRanges[index].values ?? [] }));
    // A renamed/unrecognizable layout must not silently replace good data with zeros.
    for (const tab of tabs) {
      const hasContent = tab.values.some((row) => row.some((value) => value !== null && value !== ""));
      const hasName = tab.values.some((row) => row.slice(0, tab.title === "Marketing" ? 6 : 1).some((value) => tab.title === "Marketing" ? rowLabelToField(value) === "name" : typeof value === "string" && value.trim().toLowerCase() === "name"));
      if (hasContent && !hasName) return fail(`The ${tab.title} tab layout could not be recognized. Existing data has been kept.`, 422);
    }
    return NextResponse.json(snapshotFromValues(input.data.spreadsheetId, metadata.properties.title, tabs), { headers: noCache });
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status === 401) { await clearGoogleSession(); return fail("Your Google permission expired. Sign in again to resume checks.", 401); }
    if (status === 403 || status === 404) return fail("This Google account cannot read that sheet. Check the link, sharing permissions and that the Sheets API is enabled.", 403);
    if (status === 429) return fail("Google is receiving too many requests. Try again later; your current data is unchanged.", 429);
    return fail("Could not read the spreadsheet. Your current data is unchanged. Try again.", 502);
  }
}
