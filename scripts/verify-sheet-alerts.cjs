/* eslint-disable @typescript-eslint/no-require-imports -- Standalone CommonJS browser check supports a supplied Playwright runtime. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const id = 'notification_test_sheet';
const captureDir = process.env.ALERT_CAPTURE_DIR;
function snapshot(version) {
  const build = { id: 'demo', name: 'Demo PC / CPU A + GPU A', cpu: 'CPU A', gpu: 'GPU A', ram: [], storage: [], fans: [], notes: [], salePrice: 1000 + version * 100, sheetName: 'Marketing', raw: {}, warnings: [] };
  return { spreadsheetId: id, title: 'Demo Google Sheet', checkedAt: new Date().toISOString(), builds: version ? [build, { ...build, id: 'new', name: 'New Demo PC / CPU B + GPU B' }] : [build], tiktokProducts: [], warnings: [] };
}
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const mode of ['granted', 'denied', 'unsupported', 'throws']) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(mode => {
        window.sentAlerts = []; window.permissionRequests = 0;
        if (mode === 'unsupported') { delete window.Notification; return; }
        window.Notification = class {
          static permission = 'default';
          static async requestPermission() { window.permissionRequests++; this.permission = mode === 'denied' ? 'denied' : 'granted'; return this.permission; }
          constructor(title, options) { if (mode === 'throws') throw new Error('Unavailable'); window.sentAlerts.push({ title, ...options }); }
          close() {}
        };
      }, mode);
      let version = 0, failure = false, calls = 0;
      await page.route('**/api/google/status', route => route.fulfill({ json: { configured: true, connected: true, user: { id: 'alert-test', email: 'demo@example.com' } } }));
      await page.route('**/api/google/sheet', route => { calls++; return route.fulfill(failure ? { status: 502, json: { error: 'Test refresh failed' } } : { json: snapshot(version) }); });
      await page.clock.install();
      await page.goto(process.env.RTS_TEST_URL || 'http://127.0.0.1:3010');
      const panel = page.getByRole('dialog', { name: 'Google Sheets', exact: true });
      const openSettings = () => page.getByRole('button', { name: 'Google Sheets settings', exact: true }).click();
      const closePanel = () => page.getByRole('button', { name: 'Close Google Sheets panel', exact: true }).click();
      await openSettings();
      const enable = page.getByRole('button', { name: 'Enable browser notifications', exact: true });
      await enable.waitFor();
      assert.equal(await page.evaluate(() => window.permissionRequests), 0, 'Never prompt automatically');
      if (mode === 'unsupported') assert.equal(await enable.isDisabled(), true);
      else await enable.click();
      await page.getByLabel('Google Sheet link', { exact: true }).fill(`https://docs.google.com/spreadsheets/d/${id}/edit`);
      await page.getByRole('button', { name: 'Connect sheet', exact: true }).click();
      const check = page.getByRole('button', { name: 'Check now', exact: true });
      await closePanel(); await check.waitFor();
      const notice = page.getByRole('complementary', { name: 'Build change notification' });
      assert.equal(await notice.count(), 0, 'Initial baseline stays quiet');
      version = 1;
      await page.clock.fastForward(2 * 60 * 1000 + 100);
      await notice.waitFor();
      assert.match(await notice.innerText(), /1 added · 1 updated/);
      assert.equal(calls, 2);
      assert.equal(await page.evaluate(() => window.sentAlerts.length), mode === 'granted' ? 1 : 0);
      if (captureDir && mode === 'granted') {
        await page.screenshot({ path: path.join(captureDir, 'sheet-alert-desktop.png') });
        await page.setViewportSize({ width: 390, height: 844 });
        await page.screenshot({ path: path.join(captureDir, 'sheet-alert-mobile.png') });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        await page.setViewportSize({ width: 1440, height: 1000 });
      }
      await notice.getByRole('button', { name: 'View changes' }).click();
      assert.equal(await notice.count(), 0);
      assert.equal(await panel.getAttribute('open'), '');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'sheet-history-heading');
      await closePanel(); await check.click();
      await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent === 'Check now' && !b.disabled));
      assert.equal(await notice.count(), 0, 'Unchanged checks do not re-alert');
      if (mode === 'granted') {
        await openSettings();
        await page.getByRole('button', { name: 'Turn off browser notifications' }).click();
        await closePanel();
        version = 2; await check.click(); await notice.waitFor();
        assert.equal(await page.evaluate(() => window.sentAlerts.length), 1, 'Opt-out stops browser alerts');
        await notice.getByRole('button', { name: 'Dismiss' }).click();
        failure = true; await check.click(); await page.getByRole('alert').filter({ hasText: 'Test refresh failed' }).waitFor();
        assert.equal(await notice.count(), 0, 'Failed fetch does not notify');
        failure = false; version = 3; await check.click(); await notice.waitFor();
        await openSettings();
        await page.getByRole('button', { name: 'Pause checks' }).click();
        assert.equal(await notice.count(), 0, 'Pause clears stale alert');
        const before = calls; await page.clock.fastForward(16 * 60 * 1000); assert.equal(calls, before);
      }
      assert.deepEqual(errors, []);
      await context.close();
    }
    console.log('PASS: additions/updates, collapsed-panel popup, 2-minute polling, history focus, baseline/unchanged/error silence, permission opt-in/denial/unsupported/failure, opt-out, pause, desktop/mobile fit.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
