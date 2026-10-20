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
    switchTab: (options) => calls.navigation.push(options.url),
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

test("study form preserves unknown gains, continues step, computes and recalculates live inputs", () => {
  const h = harness(); let form = h.load("decision", { scenario: "study" });
  form.fillExample(); form.next(); assert.equal(form.data.step, 1);
  input(form, "monthlyGain", "");
  form = h.load("decision", { scenario: "study" }); assert.equal(form.data.step, 1);
  form.next(); assert.equal(h.calls.navigation.at(-1), "/pages/decision-result/decision-result?scenario=study");
  const result = h.load("decision-result", { scenario: "study" });
  assert.equal(result.data.empty, false); assert.match(result.data.result.summary, /至少需多到账 1,000/);
  assert.equal(result.data.hasChecks, false); const before = h.calls.navigation.length; result.openChecks(); assert.equal(h.calls.navigation.length, before);
  result.edit(); assert.equal(h.calls.navigation.at(-1), "back");
  input(form, "fees", "18000"); result.onShow();
  assert.match(result.data.result.summary, /至少需多到账 2,000/);
});

test("purchase validates cross-field values, returns to first step error and supports editing", () => {
  const h = harness(); const form = h.load("decision", { scenario: "purchase" });
  form.fillExample(); form.next(); input(form, "buyResale", "7000"); form.next();
  assert.equal(form.data.step, 0); assert.ok(form.data.errors.buyResale);
  input(form, "buyResale", "3000"); form.next(); form.next();
  const result = h.load("decision-result", { scenario: "purchase" });
  assert.equal(result.data.result.metrics[0].value, "3,000"); assert.equal(result.data.result.metrics[2].value, "1,300");
  result.edit(); input(form, "keepCost", "5000"); result.onShow(); assert.match(result.data.result.summary, /买的总成本较低/);
});

test("new results support storage failures, private shares, invalid routes and timeline entry", () => {
  for (const scenario of ["study", "purchase", "city", "side"]) {
    const h = harness(); wx.setStorageSync = () => { throw new Error("quota"); };
    const form = h.load("decision", { scenario }); form.fillExample(); form.next(); form.next();
    const result = h.load("decision-result", { scenario }); assert.equal(result.data.empty, false); assert.match(result.data.storageNotice, /未能保存/);
    for (const payload of [result.onShareAppMessage(), result.onShareTimeline(), form.onShareAppMessage()]) {
      assert.equal(payload.imageUrl, "/images/share-entry.png"); assert.doesNotMatch(JSON.stringify(payload), /monthlyGain|keepResale|12000|6000/);
    }
    h.stack.length = 0; assert.equal(h.load("decision-result", { scenario }).data.empty, true);
    h.load("decision-result", { scenario, source: "timeline" }); assert.equal(h.calls.navigation.at(-1), `/pages/decision/decision?scenario=${scenario}`);
  }
  const h = harness(); assert.equal(h.load("decision", { scenario: "constructor" }).data.scenario, "rent");
  const home = h.load("home"); home.openScenario({ currentTarget: { dataset: { id: "__proto__" } } }); assert.equal(h.calls.navigation.length, 0);
});

test("decision tab exposes seven real routes and independent draft indicators", () => {
  const h = harness();
  saveDraft("budget", EXAMPLES.budget, true, 0);
  const home = h.load("home");
  assert.equal(home.data.entries.length, 7);
  assert.equal(home.data.entries[1].saved, false);
  assert.equal(home.data.entries[2].saved, true);
  for (const id of ["offer", "rent", "budget", "study", "purchase", "city", "side"]) home.openScenario({ currentTarget: { dataset: { id } } });
  assert.deepEqual(h.calls.navigation, ["/pages/calculator/calculator", ...["rent", "budget", "study", "purchase", "city", "side"].map((id) => `/pages/decision/decision?scenario=${id}`)]);
  home.openChecks();
  assert.equal(h.calls.navigation.at(-1), "/pages/decision-check/decision-check?scenario=offer");
});

test("city and side validate, restore separate steps, compute examples and recalculate edits", () => {
  const h = harness();
  for (const scenario of ["city", "side"]) {
    let form = h.load("decision", { scenario });
    form.next(); assert.equal(form.data.step, 0); assert.ok(Object.keys(form.data.errors).length);
    form.fillExample(); form.next();
    form = h.load("decision", { scenario }); assert.equal(form.data.step, 1);
    form.next(); assert.equal(h.calls.navigation.at(-1), `/pages/decision-result/decision-result?scenario=${scenario}`);
    const result = h.load("decision-result", { scenario });
    assert.equal(result.data.empty, false); assert.equal(result.data.hasChecks, false);
    result.edit(); assert.equal(h.calls.navigation.at(-1), "back");
    if (scenario === "city") {
      assert.equal(result.data.result.metrics.at(-1).value, "6");
      input(form, "bIncome", "8000"); result.onShow(); assert.match(result.data.result.summary, /缺口/);
    } else {
      assert.equal(result.data.result.metrics.at(-1).value, "2.5");
      input(form, "orders", ""); result.onShow(); assert.match(result.data.result.summary, /19 单/);
    }
  }
  assert.equal(h.storage.get(KEYS.city).values.bIncome, "8000");
  assert.equal(h.storage.get(KEYS.side).values.orders, "");
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
  for (const name of ["home", "decision", "decision-result", "decision-check", "about"]) {
    const page = h.load(name, { scenario: "budget" });
    page.data.values = { cash: "PRIVATE_VALUE", aName: "PRIVATE_NAME" };
    for (const payload of [page.onShareAppMessage(), page.onShareTimeline()]) {
      assert.equal(payload.imageUrl, "/images/share-entry.png");
      assert.doesNotMatch(JSON.stringify(payload), /PRIVATE/);
    }
  }
});

test("checklist tracks self-reported statuses by scenario without changing numeric drafts", () => {
  const { CHECK_KEYS } = require("../utils/decision-checks");
  const h = harness(); saveDraft("rent", EXAMPLES.rent, true, 0);
  const original = structuredClone(h.storage.get(KEYS.rent));
  let page = h.load("decision-check", { scenario: "rent" });
  assert.equal(page.data.items.length, 4); assert.equal(page.data.checked, 0);
  const change = (id, value) => page.changeStatus({ currentTarget: { dataset: { id } }, detail: { value } });
  change("upfront", "1"); change("route", "2");
  assert.equal(page.data.checked, 1); assert.equal(page.data.skipped, 1);
  page = h.load("decision-check", { scenario: "rent" });
  assert.equal(page.data.checked, 1); assert.equal(page.data.skipped, 1);
  page.changeTopic({ detail: { value: "2" } });
  assert.equal(page.data.scenario, "budget"); assert.equal(page.data.checked, 0);
  page.openTool(); assert.equal(h.calls.navigation.at(-1), "/pages/decision/decision?scenario=budget");
  page.openHabits(); assert.equal(h.calls.navigation.at(-1), "/pages/habits/habits");
  assert.equal(h.storage.has(CHECK_KEYS.budget), false);
  assert.deepEqual(h.storage.get(KEYS.rent), original);
});

test("checklist save failures retain original status and successful retries persist", () => {
  const h = harness(); const page = h.load("decision-check");
  const event = { currentTarget: { dataset: { id: "terms" } }, detail: { value: "1" } };
  const save = wx.setStorageSync; wx.setStorageSync = () => { throw new Error("quota"); };
  page.changeStatus(event); assert.equal(page.data.checked, 0); assert.match(page.data.notice, /未能保存/);
  wx.setStorageSync = save; page.changeStatus(event);
  assert.equal(page.data.checked, 1); assert.equal(page.data.notice, "");
  assert.equal(h.load("decision-check").data.checked, 1);
});

test("checklist new round requires confirmation, clears only current topic and keeps data on failure", () => {
  const { CHECK_KEYS } = require("../utils/decision-checks");
  const h = harness(); const page = h.load("decision-check");
  page.changeStatus({ currentTarget: { dataset: { id: "terms" } }, detail: { value: "1" } });
  h.storage.set(CHECK_KEYS.rent, { marker: "keep" });
  page.startAgain(); assert.equal(page.data.checked, 1);
  const remove = wx.removeStorageSync; wx.removeStorageSync = () => { throw new Error("locked"); };
  h.modals.push({ confirm: true }); page.startAgain();
  assert.equal(page.data.checked, 1); assert.match(page.data.notice, /未能清除/);
  wx.removeStorageSync = remove; h.modals.push({ confirm: true }); page.startAgain();
  assert.equal(page.data.checked, 0); assert.equal(h.storage.has(CHECK_KEYS.offer), false);
  assert.deepEqual(h.storage.get(CHECK_KEYS.rent), { marker: "keep" });
});

test("checklist invalid input never chooses an untrusted route or persists unknown fields", () => {
  const h = harness(); const page = h.load("decision-check", { scenario: "__proto__" });
  assert.equal(page.data.scenario, "offer");
  for (const [id, value] of [["salary", "1"], ["terms", "9"], ["terms", "1.5"], ["terms", "NaN"]]) {
    page.changeStatus({ currentTarget: { dataset: { id } }, detail: { value } });
  }
  page.changeTopic({ detail: { value: "99" } });
  assert.equal(page.data.scenario, "offer"); assert.equal(h.storage.size, 0);
  page.openTool(); assert.equal(h.calls.navigation.at(-1), "/pages/calculator/calculator");
  page.copySource(); assert.match(h.calls.copied[0], /5f210ca/);
  for (const scenario of ["rent", "budget"]) {
    const result = h.load("decision-result", { scenario }); result.openChecks();
    assert.equal(h.calls.navigation.at(-1), `/pages/decision-check/decision-check?scenario=${scenario}`);
  }
  const offerResult = h.load("result"); offerResult.openChecks();
  assert.equal(h.calls.navigation.at(-1), "/pages/decision-check/decision-check?scenario=offer");
});

test("corrupt or unavailable checklist storage is disclosed without silently deleting it", () => {
  const { CHECK_KEYS } = require("../utils/decision-checks");
  const h = harness(); h.storage.set(CHECK_KEYS.rent, { version: 99 });
  const page = h.load("decision-check", { scenario: "rent" });
  assert.equal(page.data.checked, 0); assert.match(page.data.notice, /无法恢复/);
  page.changeStatus({ currentTarget: { dataset: { id: "upfront" } }, detail: { value: "1" } });
  assert.equal(page.data.checked, 0); assert.match(page.data.notice, /未覆盖/);
  assert.deepEqual(h.storage.get(CHECK_KEYS.rent), { version: 99 });
  h.modals.push({ confirm: true }); page.startAgain();
  page.changeStatus({ currentTarget: { dataset: { id: "upfront" } }, detail: { value: "1" } });
  assert.equal(page.data.checked, 1);
  wx.getStorageSync = () => { throw new Error("read denied"); };
  page.onShow(); assert.match(page.data.notice, /无法读取/);
  page.changeStatus({ currentTarget: { dataset: { id: "upfront" } }, detail: { value: "2" } });
  assert.equal(h.storage.get(CHECK_KEYS.rent).values.upfront, 1);
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
