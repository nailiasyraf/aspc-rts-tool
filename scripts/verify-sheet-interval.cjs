/* eslint-disable @typescript-eslint/no-require-imports -- Standalone CommonJS check supports a supplied Playwright runtime. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.clock.install();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    let calls = 0, hold = false, release;
    const sheetId = 'interval_test_sheet';
    await page.route('**/api/google/status', route => route.fulfill({ json: { configured: true, connected: true, user: { id: 'interval-test', email: 'demo@example.com' } } }));
    await page.route('**/api/google/sheet', async route => {
      calls++;
      if (hold) await new Promise(resolve => { release = resolve; });
      await route.fulfill({ json: { spreadsheetId: sheetId, title: 'Demo interval sheet', checkedAt: new Date().toISOString(), builds: [], tiktokProducts: [], warnings: [] } });
    });
    const interval = page.getByLabel('Check for changes every', { exact: true });
    const summary = page.locator('summary').filter({ hasText: 'Google Sheets' });
    const idle = () => page.waitForFunction(() => [...document.querySelectorAll('summary')].some(el => el.textContent.includes('Connected · checks every')));
    async function advanceToCheck(ms) {
      const response = page.waitForResponse('**/api/google/sheet');
      await page.clock.fastForward(ms); await response; await idle();
    }
    await page.goto(process.env.RTS_TEST_URL || 'http://127.0.0.1:3010');
    await summary.click(); await interval.waitFor();
    assert.equal(await interval.inputValue(), '2');
    assert.deepEqual(await interval.locator('option').evaluateAll(options => options.map(o => o.value)), ['2', '5', '10', '15', '30', '60']);
    await page.getByLabel('Google Sheet link', { exact: true }).fill(`https://docs.google.com/spreadsheets/d/${sheetId}/edit`);
    await page.getByRole('button', { name: 'Connect sheet', exact: true }).click(); await idle();
    assert.equal(calls, 1);
    if (process.env.INTERVAL_CAPTURE_DIR) {
      await page.screenshot({ path: path.join(process.env.INTERVAL_CAPTURE_DIR, 'sheet-interval-desktop.png') });
      await page.setViewportSize({ width: 390, height: 844 });
      await interval.scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(process.env.INTERVAL_CAPTURE_DIR, 'sheet-interval-mobile.png') });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.setViewportSize({ width: 1440, height: 1000 });
    }
    await page.clock.fastForward(119000); assert.equal(calls, 1);
    await advanceToCheck(1100); assert.equal(calls, 2, 'Default interval is two minutes');
    await interval.selectOption('10');
    await page.clock.fastForward(599000); assert.equal(calls, 2, 'Old two-minute timer was cancelled');
    await advanceToCheck(1100); assert.equal(calls, 3);
    await interval.selectOption('30'); await interval.selectOption('2');
    await advanceToCheck(120100); assert.equal(calls, 4, 'Shorter interval replaces the longer timer');
    await interval.selectOption('5');
    const reloadResponse = page.waitForResponse('**/api/google/sheet');
    await page.reload(); await reloadResponse; await idle(); await summary.click();
    assert.equal(await interval.inputValue(), '5', 'Preference survives reload');
    assert.equal(calls, 5);
    await page.clock.fastForward(299000); assert.equal(calls, 5);
    await advanceToCheck(1100); assert.equal(calls, 6, 'Restored preference schedules correctly');
    await page.getByRole('button', { name: 'Pause checks', exact: true }).click();
    await interval.selectOption('2'); await page.clock.fastForward(600000); assert.equal(calls, 6, 'Changing paused interval does not resume');
    hold = true;
    const pendingRequest = page.waitForRequest('**/api/google/sheet');
    await page.getByRole('button', { name: 'Connect sheet', exact: true }).click();
    await pendingRequest;
    await interval.selectOption('5'); await page.clock.fastForward(600000); assert.equal(calls, 7, 'Pending request cannot overlap');
    hold = false; release(); await idle();
    await page.clock.fastForward(299000); assert.equal(calls, 7);
    await advanceToCheck(1100); assert.equal(calls, 8, 'Latest interval applies after in-flight completion');
    await page.getByRole('button', { name: 'Pause checks', exact: true }).click();
    await page.evaluate(() => localStorage.setItem('aspc-sheets-check-minutes-v1', 'invalid'));
    await page.reload(); await summary.click(); await interval.waitFor();
    assert.equal(await interval.inputValue(), '2', 'Invalid saved preference uses default');
    await page.evaluate(() => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) { if (key === 'aspc-sheets-check-minutes-v1') throw new Error('Storage unavailable'); return original.call(this, key, value); };
    });
    await interval.selectOption('10');
    await page.getByText('The check interval applies for this session, but couldn’t be saved in this browser.').waitFor();
    assert.equal(await interval.inputValue(), '10');
    assert.deepEqual(errors, []);
    console.log('PASS: default 2 minutes, all options, longer/shorter rescheduling, saved preference, paused state, in-flight change without overlap, invalid/storage fallback and mobile fit.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
