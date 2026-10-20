const test = require("node:test");
const assert = require("node:assert/strict");
const { HABITS_KEY, FEELINGS, empty, dateKey, shiftDate, updateDay, validState, readHabits, summary, weekSummary, goalProgress, weeklyJournal } = require("../utils/habits");

function harness(state = empty()) {
  const storage = new Map([[HABITS_KEY, structuredClone(state)]]);
  const calls = { routes: [], queries: [], exports: [], text: [] };
  const context = new Proxy({}, { get: (_target, key) => key === "fillText" ? (text) => calls.text.push(text) : () => {}, set: () => true });
  const canvas = { getContext: () => context };
  global.wx = { getStorageSync: (key) => structuredClone(storage.get(key)), setStorageSync: (key, value) => storage.set(key, structuredClone(value)),
    showShareMenu() {}, showToast() {}, pageScrollTo() {}, hideKeyboard() {}, hideTabBar() {}, showTabBar() {},
    env: { USER_DATA_PATH: "wxfile://usr" }, getFileSystemManager: () => ({ copyFile() {} }),
    navigateTo: ({ url }) => calls.routes.push(url),
    createSelectorQuery: () => { const query = { in: () => query, select: () => query, fields: () => query, exec: (callback) => calls.queries.push(callback) }; return query; },
    canvasToTempFilePath: (options) => calls.exports.push(options) };
  const load = (name = "habits", options = {}) => {
    let definition; global.Page = (page) => { definition = page; };
    const path = require.resolve(`../pages/${name}/${name}.js`); delete require.cache[path]; require(path);
    const page = { ...definition, data: structuredClone(definition.data), setData(patch, callback) { Object.assign(this.data, patch); callback?.(); } };
    page.onLoad(options); return page;
  };
  return { storage, calls, canvas, load };
}
const event = (value) => ({ detail: { value } });

test("old records and session goals are preserved without conversion into training-day targets", () => {
  let state = empty(); state.goals.strength = 9;
  state = updateDay(state, "2026-01-05", "exercise", { type: "力量训练", minutes: 20 }, "2026-01-06");
  state = updateDay(state, "2026-01-05", "exercise", { type: "力量训练", minutes: 10 }, "2026-01-06");
  const h = harness(state); const page = h.load();
  assert.deepEqual(readHabits().state, state);
  assert.equal(weekSummary(state, "2026-01-06").strength, 2);
  assert.equal(weekSummary(state, "2026-01-06").strengthDays, 1);
  assert.equal(goalProgress(state, "2026-01-06")[2].goal, 0);
  const field = page.data.goalFields.find((item) => item.key === "strengthDays");
  page.chooseGoal({ currentTarget: { dataset: { key: "strengthDays" } }, detail: { value: field.options.findIndex((option) => option.value === 2) } });
  page.saveGoals();
  assert.equal(h.storage.get(HABITS_KEY).goals.strength, 9);
  assert.equal(goalProgress(page.state, "2026-01-06")[2].percent, 50);
  assert.deepEqual(page.state.days, state.days);
});

test("recovery plans and wind-down intent persist but never fabricate actual health records", () => {
  let state = updateDay(empty(), "2026-01-05", "plan", "rest", "2026-01-06");
  state = updateDay(state, "2026-01-05", "windDown", true, "2026-01-06");
  assert.equal(validState(state), true);
  assert.equal(summary(state, "2026-01-05").recorded, false);
  assert.equal(weekSummary(state, "2026-01-05").sleepDays, 0);
  assert.equal(weekSummary(state, "2026-01-05").strengthDays, 0);
  assert.deepEqual(weeklyJournal(state, "2026-01-05").facts, []);
  const h = harness(state); assert.equal(h.load().state.days["2026-01-05"].plan, "rest");
  assert.throws(() => updateDay(state, "2026-01-05", "windDown", "yes", "2026-01-06"));
  assert.throws(() => updateDay(state, "2026-01-05", "plan", "invalid", "2026-01-06"));
});

test("sleep feelings save atomically with actual hours and clear when sleep is removed", () => {
  let state = updateDay(empty(), "2026-01-05", "sleep", { hours: 6.5, feeling: FEELINGS[3] }, "2026-01-06");
  assert.equal(state.days["2026-01-05"].feeling, "有点疲惫"); assert.equal(validState(state), true);
  assert.throws(() => updateDay(state, "2026-01-05", "sleep", { hours: 8, feeling: "健康" }, "2026-01-06"));
  state = updateDay(state, "2026-01-05", "sleep", null, "2026-01-06");
  assert.equal(state.days["2026-01-05"], undefined);
  const h = harness(); const page = h.load(); page.setData({ sleepInput: "6.5", feelingIndex: 3 });
  const save = wx.setStorageSync; wx.setStorageSync = () => { throw new Error("quota"); }; page.saveSleep();
  assert.equal(page.data.day.sleep, null); assert.equal(page.data.day.feeling, undefined);
  wx.setStorageSync = save; page.saveSleep();
  assert.equal(h.load().data.day.feeling, "有点疲惫");
});

test("cup settings survive reload and failed settings do not change the quick record amount", () => {
  const h = harness(); let page = h.load();
  page.chooseCup(event("3")); assert.equal(page.data.cup, 500);
  page = h.load(); page.addCup(); assert.deepEqual(page.data.day.water, [500]);
  wx.setStorageSync = () => { throw new Error("quota"); }; page.chooseCup(event("0"));
  assert.equal(page.data.cup, 500); assert.equal(h.storage.get(HABITS_KEY).preferences.cup, 500);
  for (const invalid of [{ ...empty(), preferences: { cup: 0 } }, { ...empty(), goals: { ...empty().goals, strengthDays: 8 } }]) assert.equal(validState(invalid), false);
});

test("morning, daytime and night actions respect history and never turn wind-down into sleep", () => {
  const h = harness(); let page = h.load();
  page.updateScene(8); assert.equal(page.data.scene.action, "sleep"); page.actScene(); assert.equal(page.data.details.sleep, true);
  page.updateScene(15); assert.equal(page.data.scene.action, "water"); page.actScene(); assert.equal(page.data.stats.water, 250);
  page.updateScene(15); assert.equal(page.data.scene.action, "exercise");
  page.planDay({ currentTarget: { dataset: { plan: "rest" } } }); page.updateScene(15);
  assert.equal(page.data.scene.action, "journal"); page.actScene();
  assert.equal(h.calls.routes.at(-1), `/pages/journal/journal?date=${dateKey()}`);
  page.updateScene(22); assert.equal(page.data.scene.action, "windDown"); page.actScene();
  assert.equal(page.data.day.windDown, true); assert.equal(page.data.day.sleep, null); assert.equal(page.data.dailyComplete, false);
  page = h.load(); assert.equal(page.data.day.windDown, true);
  page.chooseDate(event("2026-01-01")); page.updateScene(15); page.actScene();
  assert.equal(page.data.scene.historical, true); assert.equal(page.data.stats.water, 0); assert.equal(page.data.details.water, true);
  page.windDown(); assert.equal(page.data.day.windDown, undefined);
});

test("a day rollover does not submit yesterday's unsaved sleep form as today's actual sleep", () => {
  const h = harness(); const page = h.load(); const yesterday = shiftDate(dateKey(), -1);
  page.setData({ today: yesterday, selected: yesterday, sleepInput: "8", feelingIndex: 1 });
  page.saveSleep();
  assert.equal(page.data.selected, dateKey()); assert.equal(page.data.day.sleep, null);
  assert.equal(page.data.day.feeling, undefined); assert.match(page.data.error, /睡眠时长/);
});

test("weekly journal uses calendar weeks, excludes missing sleep and never infers improvement", () => {
  let state = empty();
  state = updateDay(state, "2025-12-29", "sleep", 7, "2026-01-04");
  state = updateDay(state, "2026-01-01", "water", 250, "2026-01-04");
  for (let i = 0; i < 3; i++) state = updateDay(state, "2026-01-02", "exercise", { type: "力量训练", minutes: 10 }, "2026-01-04");
  state = updateDay(state, "2026-01-03", "plan", "rest", "2026-01-04");
  const journal = weeklyJournal(state, "2026-01-01");
  assert.equal(journal.start, "2025-12-29"); assert.equal(journal.end, "2026-01-04");
  assert.equal(journal.recordedDays, 3); assert.equal(journal.strengthDays, 1); assert.equal(journal.sleepAverage, "7.0");
  assert.match(journal.facts.join(""), /1 天力量训练，共 3 次/);
  assert.doesNotMatch(journal.facts.join(""), /规律|改善|变强|更健康/);
});

test("journal share preview omits facts by default and includes them only after explicit opt-in", () => {
  const h = harness(updateDay(empty(), dateKey(), "water", 750)); const page = h.load("journal");
  assert.equal(page.data.includeFacts, false); page.createPreview();
  h.calls.queries.shift()([{ node: h.canvas }]);
  assert.equal(h.calls.text.some((text) => text.includes("1 天")), false);
  h.calls.exports.shift().success({ tempFilePath: "wxfile://public.png" });
  assert.equal(page.onShareAppMessage({ from: "button" }).imageUrl, "wxfile://public.png");
  assert.equal(page.onShareAppMessage({ from: "menu" }).imageUrl, "/images/share-habits.png");
  page.chooseFacts(event(true)); assert.equal(page.data.preview, "");
  page.createPreview(); h.calls.queries.shift()([{ node: h.canvas }]);
  assert.equal(h.calls.text.some((text) => text.includes("1 天")), true);
  h.calls.exports.shift().success({ tempFilePath: "wxfile://private.png" });
  const share = page.onShareAppMessage({ from: "button" });
  assert.equal(share.imageUrl, "wxfile://private.png"); assert.equal(share.path, "/pages/habits/habits");
  assert.doesNotMatch(JSON.stringify(page.onShareTimeline()), /750|private/);
  page.chooseFacts(event(false)); assert.equal(page.onShareAppMessage({ from: "button" }).imageUrl, "/images/share-habits.png");
});

test("stale private preview callbacks cannot restore a revoked share image; export failures can retry", () => {
  const h = harness(); const page = h.load("journal", { date: "bad" });
  assert.equal(page.date, dateKey()); page.chooseFacts(event(true)); page.createPreview();
  h.calls.queries.shift()([{ node: h.canvas }]); const pending = h.calls.exports.shift();
  page.chooseFacts(event(false)); pending.success({ tempFilePath: "wxfile://stale-private.png" });
  assert.equal(page.data.preview, "");
  page.createPreview(); h.calls.queries.shift()([]); assert.match(page.data.error, /重试/);
  page.createPreview(); h.calls.queries.shift()([{ node: h.canvas }]); h.calls.exports.shift().fail();
  assert.equal(page.data.generating, false); assert.equal(page.data.preview, "");
  h.storage.set(HABITS_KEY, { version: 2 }); const blocked = h.load("journal");
  blocked.createPreview(); assert.equal(blocked.data.status, "corrupt"); assert.equal(h.calls.queries.length, 0);
});
