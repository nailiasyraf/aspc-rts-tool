/* eslint-disable @typescript-eslint/no-require-imports -- Standalone CommonJS check supports a supplied Playwright runtime. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const teamId = 'team_sheet_test_12345';
const customId = 'custom_sheet_test_12345';
const base = process.env.RTS_TEST_URL || 'http://127.0.0.1:3010';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const mode of ['fresh', 'signed-out', 'custom', 'paused', 'new-sign-in', 'denied', 'no-storage', 'no-default', 'invalid-default', 'upload-race']) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
      await page.clock.install();
      const errors = []; const reads = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(({ mode, customId }) => {
        if (mode === 'custom') localStorage.setItem('aspc-sheets-active-v1:colleague', customId);
        if (mode === 'paused' || mode === 'new-sign-in') localStorage.setItem('aspc-sheets-active-v1:colleague', 'paused');
        if (mode === 'no-storage') {
          Storage.prototype.getItem = () => { throw new Error('Unavailable'); };
          Storage.prototype.setItem = () => { throw new Error('Unavailable'); };
        }
      }, { mode, customId });
      let releaseStatus;
      const statusGate = new Promise(resolve => { releaseStatus = resolve; });
      await page.route('**/api/google/status', async route => {
        if (mode === 'upload-race') await statusGate;
        await route.fulfill({ json: { configured: true, connected: mode !== 'signed-out', user: mode === 'signed-out' ? undefined : { id: 'colleague', email: 'colleague@example.com' }, hasDefaultSheet: mode !== 'no-default', defaultSheetId: mode === 'signed-out' || mode === 'no-default' ? undefined : mode === 'invalid-default' ? 'invalid' : teamId } });
      });
      await page.route('**/api/google/sheet', route => {
        const body = route.request().postDataJSON(); reads.push(body.spreadsheetId);
        assert.equal(body.accountId, 'colleague');
        return route.fulfill(mode === 'denied' ? { status: 403, json: { error: 'This Google account cannot read that sheet. Check the link and sharing permissions.' } } : { json: { spreadsheetId: body.spreadsheetId, title: 'Demo team sheet', checkedAt: new Date().toISOString(), builds: [], tiktokProducts: [], warnings: [] } });
      });
      await page.goto(base + (mode === 'new-sign-in' ? '/?google=connected' : ''));
      if (mode === 'upload-race') {
        await page.locator('input[type=file]').first().setInputFiles(path.join(__dirname, '../sample-optimal-builds.xlsx'));
        await page.getByText(/sample-optimal-builds.xlsx/).first().waitFor(); releaseStatus();
      }
      const openSettings = () => page.getByRole('button', { name: 'Google Sheets settings', exact: true }).click();
      const idle = () => page.waitForFunction(() => document.querySelector('section[aria-label="Google Sheets connection"] [role=status]')?.textContent === 'Connected');
      await openSettings();
      if (mode === 'signed-out') {
        await page.getByRole('button', { name: 'Sign in with Google', exact: true }).waitFor();
        await page.getByText(/team sheet will connect automatically/).waitFor();
        assert.deepEqual(reads, []);
      } else if (['paused', 'no-default', 'invalid-default', 'upload-race'].includes(mode)) {
        await page.getByRole('button', { name: 'Sign out', exact: true }).waitFor();
        await page.clock.fastForward(3 * 60 * 1000); assert.deepEqual(reads, [], mode);
        if (mode === 'paused') assert.equal(await page.getByLabel('Google Sheet link', { exact: true }).inputValue(), `https://docs.google.com/spreadsheets/d/${teamId}/edit`);
        if (mode === 'upload-race') assert.equal(await page.evaluate(() => localStorage.getItem('aspc-sheets-active-v1:colleague')), 'paused');
      } else if (mode === 'denied') {
        await page.getByRole('alert').filter({ hasText: 'cannot read' }).waitFor();
        assert.deepEqual(reads, [teamId]);
        assert.equal(await page.getByLabel('Google Sheet link', { exact: true }).inputValue(), `https://docs.google.com/spreadsheets/d/${teamId}/edit`);
        await page.clock.fastForward(3 * 60 * 1000); assert.equal(reads.length, 1, 'Access denied must not retry repeatedly');
      } else {
        await idle();
        assert.deepEqual(reads, [mode === 'custom' ? customId : teamId]);
        assert.equal(await page.getByRole('complementary', { name: 'Build change notification' }).count(), 0);
        if (mode === 'fresh') {
          if (process.env.DEFAULT_SHEET_CAPTURE_DIR) {
            await page.screenshot({ path: path.join(process.env.DEFAULT_SHEET_CAPTURE_DIR, 'default-sheet-desktop.png') });
            await page.setViewportSize({ width: 390, height: 844 });
            await page.screenshot({ path: path.join(process.env.DEFAULT_SHEET_CAPTURE_DIR, 'default-sheet-mobile.png') });
            assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
          }
          await page.getByRole('button', { name: 'Pause checks', exact: true }).click();
          await page.reload(); await openSettings();
          await page.getByRole('button', { name: 'Sign out', exact: true }).waitFor();
          await page.clock.fastForward(3 * 60 * 1000); assert.equal(reads.length, 1, 'Pause survives reload');
          await page.getByRole('button', { name: 'Connect sheet', exact: true }).click();
          await idle(); assert.equal(reads.length, 2, 'Manual reconnect resumes');
        }
      }
      assert.deepEqual(errors, []); await page.close();
    }
    console.log('PASS: automatic team connection, sign-in resume, saved custom priority, paused reload, manual reconnect, signed-out/no-default/invalid fallback, denied access, storage fallback, upload/status race and mobile fit.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
