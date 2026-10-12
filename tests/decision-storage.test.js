const assert = require("node:assert/strict");
const test = require("node:test");
const { EXAMPLES, createDraft } = require("../utils/decision-data");
const { KEYS, readDraft, saveDraft, clearDraft, clearAllData } = require("../utils/decision-storage");
const { DRAFT_KEY, RESULT_KEY, OFFER_META_KEY } = require("../utils/storage");

function setup() {
  const data = new Map();
  global.wx = {
    getStorageSync: (key) => structuredClone(data.get(key)),
    setStorageSync: (key, value) => data.set(key, structuredClone(value)),
    removeStorageSync: (key) => data.delete(key),
  };
  return data;
}

test("scenario drafts stay isolated, keep invalid input and restore example state", () => {
  const data = setup();
  data.set(DRAFT_KEY, ["legacy offer draft"]);
  assert.equal(readDraft("rent").status, "empty");
  saveDraft("rent", EXAMPLES.rent, true, 1);
  saveDraft("budget", { ...createDraft("budget"), cash: "12abc" }, false, 0);
  assert.equal(readDraft("rent").draft.example, true);
  assert.equal(readDraft("rent").draft.step, 1);
  assert.equal(readDraft("budget").draft.values.cash, "12abc");
  assert.equal(clearDraft("rent"), true);
  assert.equal(readDraft("rent").status, "empty");
  assert.equal(readDraft("budget").status, "ready");
  assert.deepEqual(data.get(DRAFT_KEY), ["legacy offer draft"]);
});

test("corrupt and future-version drafts are reported without deleting any data", () => {
  const data = setup();
  for (const invalid of [false, 0, [], {}, { schemaVersion: 2 }, { values: EXAMPLES.rent }]) {
    data.set(KEYS.rent, invalid);
    assert.equal(readDraft("rent").status, "corrupt");
    assert.deepEqual(data.get(KEYS.rent), invalid);
  }
  assert.throws(() => readDraft("unknown"), /不支持/);
});

test("storage failures are explicit and calculations are not a storage concern", () => {
  setup();
  wx.getStorageSync = () => { throw new Error("read failed"); };
  wx.setStorageSync = () => { throw new Error("quota"); };
  wx.removeStorageSync = () => { throw new Error("remove failed"); };
  assert.equal(readDraft("budget").status, "unavailable");
  assert.equal(saveDraft("rent", EXAMPLES.rent, false, 0), false);
  assert.equal(clearDraft("rent"), false);
});

test("clear all removes only product keys, including legacy data", () => {
  const data = setup();
  for (const key of [DRAFT_KEY, RESULT_KEY, OFFER_META_KEY, KEYS.rent, KEYS.budget, "unrelated"]) data.set(key, true);
  assert.equal(clearAllData(), true);
  assert.deepEqual([...data.keys()], ["unrelated"]);
});

test("drafts do not persist arbitrary extra fields or sensitive result snapshots", () => {
  const data = setup();
  saveDraft("budget", { ...EXAMPLES.budget, unexpected: "private" }, false, 0);
  assert.equal(data.get(KEYS.budget).values.unexpected, undefined);
  assert.equal(data.get(KEYS.budget).result, undefined);
});
