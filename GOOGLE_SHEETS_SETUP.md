# Google Sheets setup

The feature is implemented, but real sign-in requires a Google OAuth web client owned by you or your organization. No spreadsheet link or credential is committed to this repo.

## One-time Google Cloud configuration

1. Open [Google Cloud Console](https://console.cloud.google.com/) and choose or create a project.
2. Enable **Google Sheets API** in APIs & Services.
3. Configure the Google Auth Platform consent screen. Choose Internal only if this is an eligible Google Workspace organization app; otherwise choose External. In Testing, add the Google accounts that will use the tool as test users.
4. Configure these scopes: `openid`, `email`, and `https://www.googleapis.com/auth/spreadsheets.readonly`. The read-only scope covers the signed-in account's spreadsheets because users paste arbitrary sheet links. The application reads only the connected sheet's Marketing and TikTok Price tabs and has no sheet-writing endpoints.
5. Create an OAuth client of type **Web application**. Add this exact authorized redirect URI for the local launcher:

   `http://127.0.0.1:3010/api/google/callback`

   For a hosted copy, add `https://YOUR-HOST/api/google/callback` instead (or in addition), and configure the matching origin below. You do not need a Google Picker API key.

## Local configuration

Create `.env.local` in this repository. Keep credentials in this ignored file, never in chat or Git:

```dotenv
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_SESSION_SECRET=your-random-base64-key
GOOGLE_APP_URL=http://127.0.0.1:3010
GOOGLE_DEFAULT_SHEET_ID=optional-team-spreadsheet-id
```

Generate `GOOGLE_SESSION_SECRET` in your own terminal with:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Restart the launcher after saving. Open exactly the configured origin: `127.0.0.1` and `localhost` are different OAuth origins. If port 3010 is busy with another app, stop that app or choose another port and update both `GOOGLE_APP_URL` and Google's registered redirect URI. For the hosted copy, set the four required Google variables and optional `GOOGLE_DEFAULT_SHEET_ID` in the hosting provider and redeploy; do not prefix them with `NEXT_PUBLIC_`. The default ID is the part between `/d/` and `/edit` in a Google Sheets URL. It is returned only after sign-in. This setting does not grant access: each colleague needs permission to read the team sheet through their own Google account.

## Using the feature

1. Click **Connect** in the Google Sheets status bar above the catalog and click **Sign in with Google**.
2. Complete Google's sign-in and permission screen yourself.
3. If a team sheet is configured, it connects automatically after sign-in on first use. An existing saved custom sheet takes priority. Open **Settings** to paste another URL in **Google Sheet link** and click **Connect sheet**. Without a configured team sheet, paste a link as before. If access is denied, the link stays filled so you can retry after the sheet owner grants access.
4. The first successful read establishes the baseline and fills the existing desktop and laptop pricing views. Subsequent successful reads update them automatically and preserve the selected desktop model when it still exists.
5. Checks run every **2 minutes** by default while this page is open. In **Settings**, **Check for changes every** offers **2, 5, 10, 15, 30 or 60 minutes**, saved in this browser across reloads. Changing it restarts the countdown from now; if a read is already running, the new interval starts when it finishes. Changing the interval does not resume paused checks. **Check now** runs immediately. A sleeping computer or throttled browser may delay a check; returning to the tab runs any overdue check. Nothing runs after the page is closed.
6. Click **History** in the status bar to open the history panel without moving the brochure. **Change history** shows previous/current values, additions and removals, grouped by detection time. Filter the latest hour, 24 hours, 7 days or all saved history. It tracks the fields this tool uses, not every spreadsheet cell, formatting edit or editor identity. Renamed products appear as removed/added. Edits made and reverted between checks are not captured.
7. Use **Pause checks** in **Settings**, or upload an XLSX from the app header, to stop automatic updates, including automatic connection on reload. Click **Connect sheet** in **Settings** to resume. **Sign out** also removes this tool's Google session; completing a fresh sign-in reconnects the configured team sheet. Pause state is saved separately per Google account in this browser when storage is available.
8. Added, updated or removed products trigger an in-app popup, including changes to TikTok prices. **View changes** opens the history; **Dismiss** closes the popup. The initial baseline, unchanged checks and failed checks do not trigger alerts. A later successful check that detects changes replaces the popup with its latest summary; full details remain in history.
9. For desktop alerts, open **Settings > Notifications**, click **Enable browser notifications** and allow the browser prompt. This optional preference is saved for this browser; **Turn off browser notifications** disables it. Browser/OS settings may suppress notifications. Unsupported or blocked browsers still show the in-app popup. Alerts run only while the tool is open and follow the selected check interval or **Check now**; they are not background push notifications after closing the tool.

The latest snapshot and newest 1,000 field changes are stored in this browser's local storage, separately for each Google account and spreadsheet. Closing and reopening the same origin retains history; clearing site data removes it. Tokens are never written to local storage. Browser storage errors are displayed and do not block current-session refreshes. On reconnect, the tool compares the latest sheet against the saved baseline, so a detected change may have happened while the tool was closed.

The server session contains encrypted access/refresh tokens in an HttpOnly, SameSite cookie, uses HTTPS-only cookies on hosted origins, and expires after seven days. Refresh tokens are used only during requests from the open tool. External Google OAuth apps left in Testing can require renewed consent after seven days; Google can also revoke access sooner. The tool then pauses and asks you to sign in again. Sign out clears the local session; you can revoke the application's Google grant separately in your Google Account permissions.

Errors keep the last successful data visible and identify the failure. Missing optional TikTok data clears previous TikTok prices on a successful read. Missing Marketing is allowed when a TikTok Price tab is present. Neither tab present, incomplete responses or unrecognizable nonempty layouts are rejected.

## Validation

Run `npx tsx scripts/verify-google-sheets.mts`, `npm run lint`, and `npm run build`. Browser integration uses mocked Google responses to test polling, refreshes, history and failures without private credentials. Real Google consent and access to your private spreadsheet must be verified after configuring your OAuth client.

For the status bar and panel regression checks, run `node scripts/verify-sheet-layout.cjs` with the app running at `http://127.0.0.1:3010`, Chrome installed and the `playwright` module available. Set `RTS_TEST_URL` for another app address, `PLAYWRIGHT_MODULE` for another Playwright module location, or `SHEET_LAYOUT_CAPTURE_DIR` to save screenshots. These checks use mocked Google responses and do not verify real OAuth.

References: [Google web-server OAuth](https://developers.google.com/identity/protocols/oauth2/web-server), [Sheets scopes](https://developers.google.com/workspace/sheets/api/scopes), [Reading sheet values](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/batchGet).
