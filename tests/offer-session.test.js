const assert = require("node:assert/strict");
const test = require("node:test");
const { EXAMPLE_JOBS, cloneJobs } = require("../utils/offer-data");
const { DRAFT_KEY, RESULT_KEY, OFFER_META_KEY } = require("../utils/storage");
const { restoreOfferDraft, saveOfferDraft, saveOfferResult, loadOfferResult, clearOfferSession } = require("../utils/offer-session");

function setup() {
  const storage = new Map();
  global.wx = {
    getStorageSync: (key) => structuredClone(storage.get(key)),
    setStorageSync: (key, value) => storage.set(key, structuredClone(value)),
    removeStorageSync: (key) => storage.delete(key),
  };
  return storage;
}

test("offer metadata restores examples without changing legacy draft format", () => {
  const storage = setup();
  const jobs = cloneJobs(EXAMPLE_JOBS);
  saveOfferDraft(jobs, true);
  assert.deepEqual(storage.get(DRAFT_KEY), jobs);
  clearOfferSession();
  assert.equal(restoreOfferDraft().example, true);
  const changed = cloneJobs(jobs);
  changed[0].monthlySalary = "12345";
  storage.set(DRAFT_KEY, changed);
  assert.equal(restoreOfferDraft().example, false);
});

test("old result-only payloads remain readable but newer disk drafts invalidate them", () => {
  const storage = setup();
  const jobs = cloneJobs(EXAMPLE_JOBS);
  storage.set(RESULT_KEY, { jobs, calculatedAt: 1 });
  assert.equal(loadOfferResult().jobs.length, 3);
  storage.set(DRAFT_KEY, jobs);
  assert.ok(loadOfferResult());
  const changed = cloneJobs(jobs);
  changed[0].monthlySalary = "33333";
  storage.set(DRAFT_KEY, changed);
  assert.equal(loadOfferResult(), null);
});

test("runtime snapshots cannot be mutated by editing input or returned results", () => {
  setup();
  const jobs = cloneJobs(EXAMPLE_JOBS);
  saveOfferResult(jobs, false);
  jobs[0].monthlySalary = "10";
  const read = loadOfferResult();
  read.jobs[0].monthlySalary = "20";
  assert.equal(loadOfferResult().jobs[0].monthlySalary, "25000");
});

test("invalid drafts and unavailable storage do not invent a fallback result", () => {
  const storage = setup();
  storage.set(RESULT_KEY, { jobs: [] });
  assert.equal(loadOfferResult(), null);
  assert.throws(() => saveOfferResult([], false), /输入/);
  wx.getStorageSync = () => { throw new Error("read failed"); };
  assert.equal(restoreOfferDraft().status, "unavailable");
  assert.equal(loadOfferResult(), null);
  assert.equal(storage.has(OFFER_META_KEY), false);
});

test("partial saves are reported and calculation retries the latest draft", () => {
  const storage = setup();
  const jobs = cloneJobs(EXAMPLE_JOBS);
  saveOfferDraft(jobs, false);
  const write = wx.setStorageSync;
  wx.setStorageSync = (key, value) => {
    if (key === DRAFT_KEY) throw new Error("draft write failed");
    write(key, value);
  };
  jobs[0].monthlySalary = "30000";
  assert.equal(saveOfferDraft(jobs, false), false);
  assert.equal(restoreOfferDraft().saved, false);
  assert.equal(saveOfferResult(jobs, false), false);
  assert.equal(loadOfferResult().saved, false);
  assert.equal(loadOfferResult().jobs[0].monthlySalary, "30000");
  wx.setStorageSync = write;
  assert.equal(saveOfferResult(jobs, false), true);
  clearOfferSession();
  assert.equal(storage.get(DRAFT_KEY)[0].monthlySalary, "30000");
  assert.equal(loadOfferResult().jobs[0].monthlySalary, "30000");
  assert.equal(loadOfferResult().saved, true);
});
