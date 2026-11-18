/* eslint-disable @typescript-eslint/no-require-imports -- Standalone browser regression check. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const base = process.env.RTS_TEST_URL || 'http://127.0.0.1:3010';
const captureDir = process.env.SHEET_LAYOUT_CAPTURE_DIR;
const id = 'layout_test_sheet';
const names = ['Ren : L5 Intel / Core Ultra 5 250K Plus + RTX 5070', 'Level 0 AMD / Ryzen 5 7500F + RTX 5060', 'GIGABYTE AORUS MASTER 16 Gen 2 / AMD Ryzen 9 9955HX3D + GeForce RTX 5090'];
const builds = names.slice(0, 2).map((name, index) => ({ id: String(index), name, section: 'Ready to ship', cpu: index ? 'AMD Ryzen 5 7500F' : 'Intel Core Ultra 5 250K Plus', gpu: index ? 'GeForce RTX 5060' : 'GeForce RTX 5070', motherboard: 'B860M Wi-Fi', cooler: 'AFTERSHOCK Glacier Mirror 240mm', ram: ['32GB DDR5 6000MHz'], storage: ['1TB Gen4 NVMe SSD'], chassis: 'AFTERSHOCK RAPID', psu: '750W 80+ Gold', fans: ['4 x ARGB fans'], notes: [], salePrice: index ? 1299 : 1999, sheetName: 'Marketing', raw: {}, warnings: [] }));
const snapshot = { spreadsheetId: id, title: 'Upcoming RTS Updates v2', checkedAt: new Date().toISOString(), builds, tiktokProducts: [{ id: 'tiktok-demo', name: names[0], websitePrice: 1999, activatedPrice: 1899, unactivatedPrice: 2099 }], warnings: [] };
const history = { snapshot, batches: [{ detectedAt: new Date().toISOString(), changes: Array.from({ length: 23 }, (_, i) => ({ tab: i % 3 ? 'Marketing' : 'TikTok Price', product: names[i % 3], field: i % 3 ? 'Sale Price' : 'TikTok Price (Activated)', before: '2099', after: '1999' })) }, { detectedAt: new Date(Date.now() - 48 * 3600000).toISOString(), changes: [{ tab: 'Marketing', product: names[1], field: 'Product added', before: 'Not listed', after: 'Listed' }] }] };

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    if (captureDir) fs.mkdirSync(captureDir, { recursive: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(({ id, history }) => localStorage.setItem(`aspc-sheets-v1:layout-test:${id}`, JSON.stringify(history)), { id, history });
    await page.route('**/api/google/status', route => route.fulfill({ json: { configured: true, connected: true, user: { id: 'layout-test', email: 'colleague@example.com' }, hasDefaultSheet: true, defaultSheetId: id } }));
    let holdCheck = false, releaseCheck;
    await page.route('**/api/google/sheet', async route => {
      if (holdCheck) await new Promise(resolve => { releaseCheck = resolve; });
      await route.fulfill({ json: snapshot });
    });
    await page.route('**/api/live-products*', route => route.fulfill({ json: { products: [], fetchedAt: new Date().toISOString() } }));
    const settings = page.getByRole('button', { name: 'Google Sheets settings', exact: true });
    const close = page.getByRole('button', { name: 'Close Google Sheets panel', exact: true });
    const dialog = page.getByRole('dialog', { name: 'Google Sheets', exact: true });
    async function capture(name) {
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      if (captureDir) await page.screenshot({ path: path.join(captureDir, `sheet-layout-${name}.png`) });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name}: page fits viewport`);
      if (await dialog.isVisible()) assert.ok(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1), `${name}: panel fits viewport`);
    }
    await page.goto(base);
    await page.getByRole('button', { name: 'Check now', exact: true }).waitFor();
    await page.getByRole('button', { name: 'BROCHURE VIEW', exact: true }).click();
    const bar = page.getByRole('region', { name: 'Google Sheets connection', exact: true });
    assert.ok((await bar.boundingBox()).height < 90, 'Desktop sync bar stays compact');
    await capture('desktop-workspace');
    const workspacePosition = await page.locator('main').boundingBox();
    await settings.click(); await capture('desktop-settings');
    assert.deepEqual(await page.locator('main').boundingBox(), workspacePosition, 'Panel does not shift the workspace');
    for (let i = 0; i < 18; i++) {
      await page.keyboard.press('Tab');
      // Native dialogs may return focus to browser chrome (body is active then),
      // but must never allow a background app control into the tab sequence.
      assert.ok(await dialog.evaluate(el => el.contains(document.activeElement) || document.activeElement === document.body), 'Background controls stay inert');
    }
    await page.keyboard.press('Escape');
    assert.equal(await dialog.isVisible(), false);
    assert.equal(await settings.evaluate(el => el === document.activeElement), true, 'Escape restores trigger focus');
    await settings.click(); await page.mouse.click(20, 400); assert.equal(await dialog.isVisible(), false, 'Backdrop closes drawer');
    await page.getByRole('button', { name: /^History/ }).click();
    await capture('desktop-history');
    assert.equal(await dialog.locator('ol > li').count(), 20);
    await page.getByRole('button', { name: 'Next', exact: true }).click(); assert.equal(await dialog.locator('ol > li').count(), 4);
    await page.getByLabel('Change history timeframe').selectOption('24'); assert.equal(await dialog.locator('ol > li').count(), 20);
    await close.click();
    for (const [name, width, height] of [['tablet', 768, 1024], ['mobile', 390, 844], ['narrow', 320, 720]]) {
      await page.setViewportSize({ width, height });
      await capture(`${name}-workspace`);
      await settings.click(); await capture(`${name}-settings`);
      await page.getByRole('button', { name: 'Sign out', exact: true }).scrollIntoViewIfNeeded();
      await capture(`${name}-settings-bottom`);
      await page.getByRole('button', { name: 'Change history', exact: true }).click();
      await capture(`${name}-history`); await close.click();
    }
    async function checkActionRow() {
      const boxes = await bar.locator('button').evaluateAll(buttons => buttons.map(button => {
        const box = button.getBoundingClientRect();
        return { y: box.y, height: box.height, fits: button.scrollWidth <= button.clientWidth };
      }));
      assert.ok(boxes.every(box => box.y === boxes[0].y && box.height === boxes[0].height && box.fits), 'Narrow actions have equal heights and fit one row');
    }
    await checkActionRow();
    holdCheck = true;
    const request = page.waitForRequest('**/api/google/sheet');
    await page.getByRole('button', { name: 'Check now', exact: true }).click(); await request;
    await page.getByRole('button', { name: 'Checking…', exact: true }).waitFor();
    await checkActionRow(); await capture('narrow-busy');
    releaseCheck();
    await page.getByRole('button', { name: 'Check now', exact: true }).waitFor();
    assert.deepEqual(errors, []);
    console.log('PASS: compact desktop toolbar, unchanged workspace position, drawer close/backdrop/Escape, focus trap/restoration, history filter/pagination, desktop/tablet/mobile/320px fit and error-free rendering.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
