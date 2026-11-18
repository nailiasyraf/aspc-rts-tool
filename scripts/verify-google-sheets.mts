/** Run: npx tsx scripts/verify-google-sheets.mts */
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { compareSnapshots, HISTORY_CHANGE_LIMIT, snapshotFromValues, spreadsheetIdFromLink, updateSheetHistory } from "../src/lib/google-sheet-data";
import { defaultGoogleSheetId, googleConfig, isSameOrigin, seal, unseal } from "../src/lib/google-auth";

const id = "example_sheet_12345";
assert.equal(spreadsheetIdFromLink(`https://docs.google.com/spreadsheets/d/${id}/edit?gid=0#gid=0`), id);
for (const url of ["https://evil.example/spreadsheets/d/example_sheet_12345/edit", "http://docs.google.com/spreadsheets/d/example_sheet_12345/edit", "https://docs.google.com.evil.example/spreadsheets/d/example_sheet_12345/edit", "https://user@docs.google.com/spreadsheets/d/example_sheet_12345/edit", "garbage"]) assert.throws(() => spreadsheetIdFromLink(url));
const marketing = [["Name", "Demo / CPU A + GPU A", "Other"], ["CPU", "CPU A", "CPU B"], ["GPU", "GPU A", "GPU B"], ["Sale Price", 1000.25, 900]];
const tiktok = [["Name", "Demo / CPU A + GPU A"], [".com Selling Price (Unactivated)", 1000.25], ["TikTok Price (Activated)", 950.35], ["TikTok Price (Unactivated)", 850.45]];
const original = snapshotFromValues(id, "Demo sheet", [{ title: "Marketing", values: marketing }, { title: "TikTok Price", values: tiktok }], "2026-11-18T01:00:00.000Z");
assert.equal(original.builds.length, 2);
assert.equal(original.tiktokProducts[0].activatedPrice, 950.35);
const changedMarketing = structuredClone(marketing); changedMarketing[3][1] = 1100.75;
const changedTikTok = structuredClone(tiktok); changedTikTok[2][1] = 975.65;
const changed = snapshotFromValues(id, "Demo sheet", [{ title: "Marketing", values: changedMarketing }, { title: "TikTok Price", values: changedTikTok }], "2026-11-18T01:15:00.000Z");
assert.deepEqual(compareSnapshots(original, changed).map(({ field, before, after }) => ({ field, before, after })), [
  { field: "Sale Price", before: "1000.25", after: "1100.75" },
  { field: "TikTok Price (Activated)", before: "950.35", after: "975.65" },
]);
const reordered = snapshotFromValues(id, "Demo sheet", [{ title: "Marketing", values: marketing.map((row) => [row[0], row[2], row[1]]) }, { title: "TikTok Price", values: tiktok }]);
assert.deepEqual(compareSnapshots(original, reordered), [], "Moving columns must not look like product changes");
const empty = snapshotFromValues(id, "Demo sheet", [{ title: "Marketing", values: [] }]);
assert.equal(compareSnapshots(original, empty).filter((item) => item.field === "Product removed").length, 3);
assert.equal(compareSnapshots(empty, original).filter((item) => item.field === "Product added").length, 3);
assert.deepEqual(compareSnapshots(original, { ...changed, spreadsheetId: "another_sheet" }), []);
let history = updateSheetHistory(null, original);
assert.equal(history.batches.length, 0, "First check establishes baseline");
history = updateSheetHistory(history, changed);
assert.equal(history.batches.length, 1);
assert.equal(history.batches[0].detectedAt, changed.checkedAt);
history = updateSheetHistory(history, changed);
assert.equal(history.batches.length, 1, "Unchanged checks must not create history noise");
history = updateSheetHistory({ snapshot: original, batches: [{ detectedAt: original.checkedAt, changes: Array.from({ length: 1100 }, () => ({ tab: "Marketing", product: "Demo", field: "CPU", before: "a", after: "b" })) }] }, changed);
assert.equal(history.batches.reduce((n, batch) => n + batch.changes.length, 0), HISTORY_CHANGE_LIMIT);
assert.equal(history.batches[0].changes[0].after, "1100.75", "Keep newest changes");

const key = randomBytes(32);
const payload = { token: "secret-test-value", state: "state-test-value" };
const encrypted = seal(payload, key);
assert.ok(!encrypted.includes(payload.token));
assert.deepEqual(unseal(encrypted, key), payload);
const tampered = Buffer.from(encrypted, "base64url"); tampered[tampered.length - 1] ^= 1;
assert.throws(() => unseal(tampered.toString("base64url"), key));
assert.throws(() => unseal(encrypted, randomBytes(32)));
const oldEnv = { ...process.env };
try {
  delete process.env.GOOGLE_DEFAULT_SHEET_ID;
  assert.equal(defaultGoogleSheetId(), undefined);
  process.env.GOOGLE_DEFAULT_SHEET_ID = " team_sheet_test_12345 ";
  assert.equal(defaultGoogleSheetId(), "team_sheet_test_12345");
  process.env.GOOGLE_DEFAULT_SHEET_ID = "https://docs.google.com/spreadsheets/d/team_sheet_test_12345/edit";
  assert.equal(defaultGoogleSheetId(), undefined, "Only a valid spreadsheet ID is accepted");
  process.env.GOOGLE_CLIENT_ID = "test"; process.env.GOOGLE_CLIENT_SECRET = "test";
  process.env.GOOGLE_SESSION_SECRET = key.toString("base64"); process.env.GOOGLE_APP_URL = "http://127.0.0.1:3010";
  assert.equal(googleConfig()?.redirectUri, "http://127.0.0.1:3010/api/google/callback");
  assert.ok(isSameOrigin(new Request("http://127.0.0.1:3010", { headers: { Origin: "http://127.0.0.1:3010" } })));
  assert.ok(!isSameOrigin(new Request("http://127.0.0.1:3010", { headers: { Origin: "https://evil.example" } })));
  process.env.GOOGLE_APP_URL = "http://public.example"; assert.equal(googleConfig(), null);
} finally { process.env = oldEnv; }
console.log("Google Sheets checks passed: link validation, parser compatibility, exact price diffs, additions/removals, column reorder, baseline/history bounds, encrypted session tamper rejection and origin checks.");
