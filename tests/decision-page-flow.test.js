const test = require("node:test");
const assert = require("node:assert/strict");
const { KEYS, saveDraft } = require("../utils/decision-storage");
const { EXAMPLES } = require("../utils/decision-data");
const { DRAFT_KEY } = require("../utils/storage");

function harness() {
  const storage = new Map();
  const calls = { navigation: [], scroll: [], toasts: [], copied: [] };
  const modals = [];
  const stack = [];
  global.wx = {
    getStorageSync: (key) => storage.get(key),
    setStorageSync: (key, value) => storage.set(key, structuredClone(value)),
    removeStorageSync: (key) => storage.delete(key),
    setNavigationBarTitle() {}, showShareMenu() {},
    pageScrollTo: (options) => calls.scroll.push(options),
    showToast: (options) => calls.toasts.push(options.title),
    showModal: (options) => options.success(modals.shift() || { confirm: false }),
    navigateTo: (options) => { calls.navigation.push(options.url); options.complete?.(); },
    navigateBack: () => calls.navigation.push("back"),
    redirectTo: (options) => calls.navigation.push(options.url),
    reLaunch: (options) => calls.navigation.push(options.url),
    setClipboardData: (options) => calls.copied.push(options.data),
  };
  global.getCurrentPages = () => stack;
  const load = (name, options = {}) => {
    const path = require.resolve(`../pages/${name}/${name}.js`);
    let definition;
    global.Page = (page) => { definition = page; };
    delete require.cache[path]; require(path);
    const page = { ...definition, data: structuredClone(definition.data), setData(patch, callback) { Object.assign(this.data, patch); callback?.(); } };
    stack.push(page); page.onLoad?.(options); page.onShow?.();
    return page;
  };
  return { storage, calls, modals, stack, load };
}
const input = (page, key, value) => page.onInput({ currentTarget: { dataset: { key } }, detail: { value } });

test("decision tab exposes three real routes and independent draft indicators", () => {
  const h = harness();
  saveDraft("budget", EXAMPLES.budget, true, 0);
  const home = h.load("home");
  assert.equal(home.data.entries.length, 3);
  assert.equal(home.data.entries[1].saved, false);
  assert.equal(home.data.entries[2].saved, true);
  for (const id of ["offer", "rent", "budget"]) home.openScenario({ currentTarget: { dataset: { id } } });
  assert.deepEqual(h.calls.navigation, ["/pages/calculator/calculator", "/pages/decision/decision?scenario=rent", "/pages/decision/decision?scenario=budget"]);
});

test("rent completes A/B, computes exact sample, edits and recalculates current inputs", () => {
  const h = harness();
  const form = h.load("decision", { scenario: "rent" });
  form.next();
  assert.equal(form.data.step, 0);
  assert.equal(h.calls.scroll[0].selector, "#field-aHousing");
  form.fillExample(); form.next();
  assert.equal(form.data.step, 1);
  form.next();
  assert.equal(h.calls.navigation.at(-1), "/pages/decision-result/decision-result?scenario=rent");
  const result = h.load("decision-result", { scenario: "rent" });
  assert.equal(result.data.empty, false);
  assert.equal(result.data.result.metrics[0].value, "800");
  assert.equal(result.data.result.metrics[1].value, "22");
  assert.equal(result.data.result.metrics[2].value, "36.36");
  assert.equal(result.data.isExample, true);
  result.edit(); assert.equal(h.calls.navigation.at(-1), "back");
  input(form, "bHousing", "5000"); result.onShow();
  assert.equal(result.data.result.metrics[0].value, "1,800");
  input(form, "aHousing", ""); result.onShow();
  assert.equal(result.data.empty, true);
});

test("budget supports sample, starting shortfall and zero burn without Infinity", () => {
  const h = harness(); const form = h.load("decision", { scenario: "budget" });
  form.fillExample(); form.next();
  const result = h.load("decision-result", { scenario: "budget" });
  assert.equal(result.data.result.metrics[0].value, "8.4");
  input(form, "upfront", "80000"); result.onShow();
  assert.equal(result.data.result.kind, "shortfall");
  input(form, "upfront", "0"); input(form, "income", "6000"); result.onShow();
  assert.equal(result.data.result.kind, "balanced");
  assert.doesNotMatch(JSON.stringify(result.data.result), /Infinity|无限/);
});

test("draft restores step, invalid text and sample marker without crossing scenarios", () => {
  const h = harness(); let form = h.load("decision", { scenario: "rent" });
  form.fillExample(); form.next(); input(form, "bHousing", "12abc");
  form = h.load("decision", { scenario: "rent" });
  assert.equal(form.data.step, 1);
  assert.equal(form.data.values.bHousing, "12abc");
  assert.equal(form.data.isExample, true);
  form.next(); assert.ok(form.data.errors.bHousing);
  const budget = h.load("decision", { scenario: "budget" });
  assert.equal(budget.data.values.cash, "");
  assert.equal(budget.data.isExample, false);
});

test("saved example requires confirmation before replacing actual inputs", () => {
  const h = harness(); const form = h.load("decision", { scenario: "budget" });
  input(form, "cash", "88888"); form.fillExample();
  assert.equal(form.data.values.cash, "88888");
  h.modals.push({ confirm: true }); form.fillExample();
  assert.equal(form.data.values.cash, "60000");
});

test("storage failure keeps live result usable but does not invent restored data", () => {
  const h = harness();
  wx.setStorageSync = () => { throw new Error("quota"); };
  const form = h.load("decision", { scenario: "budget" });
  form.fillExample(); form.next();
  assert.match(form.data.storageNotice, /未能保存/);
  const result = h.load("decision-result", { scenario: "budget" });
  assert.equal(result.data.empty, false);
  assert.equal(result.data.result.metrics[0].value, "8.4");
  h.stack.length = 0;
  const cold = h.load("decision-result", { scenario: "budget" });
  assert.equal(cold.data.empty, true);
});

test("reset only clears current scenario after confirmation and preserves on failure", () => {
  const h = harness(); const form = h.load("decision", { scenario: "rent" });
  form.fillExample(); saveDraft("budget", EXAMPLES.budget, true, 0);
  h.storage.set(DRAFT_KEY, ["legacy"]);
  form.reset(); assert.equal(form.data.values.aHousing, "3000");
  h.modals.push({ confirm: true }); form.reset();
  assert.equal(form.data.values.aHousing, "");
  assert.equal(h.storage.has(KEYS.rent), false);
  assert.equal(h.storage.has(KEYS.budget), true);
  assert.deepEqual(h.storage.get(DRAFT_KEY), ["legacy"]);
  form.fillExample(); wx.removeStorageSync = () => { throw new Error("locked"); };
  h.modals.push({ confirm: true }); form.reset();
  assert.equal(form.data.values.aHousing, "3000");
  assert.match(h.calls.toasts.at(-1), /清除失败/);
});

test("corrupt drafts show recovery notice and navigation failure unlocks submission", () => {
  const h = harness(); h.storage.set(KEYS.budget, { unsupported: true });
  const form = h.load("decision", { scenario: "budget" });
  assert.match(form.data.storageNotice, /无法恢复/);
  assert.deepEqual(h.storage.get(KEYS.budget), { unsupported: true });
  form.fillExample();
  wx.navigateTo = (options) => { options.fail(); options.complete(); };
  form.next(); assert.equal(form.data.submitting, false);
  assert.match(h.calls.toasts.at(-1), /未打开/);
});

test("result direct-entry only uses recipient draft and timeline links go to input", () => {
  const h = harness(); saveDraft("budget", EXAMPLES.budget, true, 0);
  const result = h.load("decision-result", { scenario: "budget" });
  assert.equal(result.data.result.metrics[0].value, "8.4");
  result.edit(); assert.equal(h.calls.navigation.at(-1), "/pages/decision/decision?scenario=budget");
  h.load("decision-result", { scenario: "budget", source: "timeline" });
  assert.equal(h.calls.navigation.at(-1), "/pages/decision/decision?scenario=budget");
});

test("all new shares use fixed images and whitelist entry values", () => {
  const h = harness();
  for (const name of ["home", "decision", "decision-result", "about"]) {
    const page = h.load(name, { scenario: "budget" });
    page.data.values = { cash: "PRIVATE_VALUE", aName: "PRIVATE_NAME" };
    for (const payload of [page.onShareAppMessage(), page.onShareTimeline()]) {
      assert.equal(payload.imageUrl, "/images/share-entry.png");
      assert.doesNotMatch(JSON.stringify(payload), /PRIVATE/);
    }
  }
});

test("source page copies only known public links, confirms complete clear", () => {
  const h = harness(); saveDraft("rent", EXAMPLES.rent, true, 0); saveDraft("budget", EXAMPLES.budget, true, 0);
  const about = h.load("about");
  about.copySource({ currentTarget: { dataset: { id: "project" } } });
  about.copySource({ currentTarget: { dataset: { id: "private://12345" } } });
  assert.deepEqual(h.calls.copied, ["https://github.com/eternity4719/HowToLiveBetter"]);
  about.clearData(); assert.equal(h.storage.size, 2);
  h.modals.push({ confirm: true }); about.clearData();
  assert.equal(h.storage.size, 0); assert.equal(h.calls.navigation.at(-1), "/pages/home/home");
});

test("keyboard next focuses the following field and last confirmation does not submit", () => {
  const h = harness(); const form = h.load("decision", { scenario: "budget" });
  form.focusNext({ currentTarget: { dataset: { key: "cash" } } });
  assert.equal(form.data.focusKey, "reserve");
  form.focusNext({ currentTarget: { dataset: { key: "income" } } });
  assert.equal(h.calls.navigation.length, 0);
});

test("cross-step error scroll waits for the updated field tree", () => {
  const h = harness(); const form = h.load("decision", { scenario: "rent" });
  form.fillExample(); form.next(); input(form, "aHousing", "");
  let callback;
  form.setData = function(patch, done) { Object.assign(this.data, patch); if (done) callback = done; };
  const before = h.calls.scroll.length;
  form.next();
  assert.equal(form.data.step, 0);
  assert.equal(h.calls.scroll.length, before);
  callback();
  assert.equal(h.calls.scroll.at(-1).selector, "#field-aHousing");
});
