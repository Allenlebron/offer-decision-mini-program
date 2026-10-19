const test = require("node:test");
const assert = require("node:assert/strict");
const { HABITS_KEY, empty, dateKey, validDate, shiftDate, monday, updateDay, summary, weekSummary, readHabits, validState } = require("../utils/habits");
const { clearAllData } = require("../utils/decision-storage");
const { DRAFT_KEY } = require("../utils/storage");

function harness() {
  const storage = new Map(); const modals = []; const calls = { copied: [], routes: [] };
  global.wx = { getStorageSync: (key) => structuredClone(storage.get(key)),
    setStorageSync: (key, value) => storage.set(key, structuredClone(value)),
    removeStorageSync: (key) => storage.delete(key), showShareMenu() {}, showToast() {}, pageScrollTo() {},
    showModal: (options) => options.success(modals.shift() || { confirm: false }),
    setClipboardData: (options) => { calls.copied.push(options.data); options.success?.(); },
    navigateTo: ({ url }) => calls.routes.push(url) };
  const load = (name = "habits") => {
    let definition; global.Page = (value) => { definition = value; };
    const path = require.resolve(`../pages/${name}/${name}.js`); delete require.cache[path]; require(path);
    const page = { ...definition, data: structuredClone(definition.data), setData(patch) { Object.assign(this.data, patch); } };
    page.onLoad?.(); page.onShow?.(); return page;
  };
  return { storage, modals, calls, load };
}
const event = (key, value) => ({ currentTarget: { dataset: { key } }, detail: { value } });

test("local dates and Monday weeks cross year, month and leap-day boundaries", () => {
  assert.equal(dateKey(new Date(2026, 9, 19, 0, 1)), "2026-10-19");
  assert.equal(monday("2026-01-01"), "2025-12-29");
  assert.equal(monday("2026-10-18"), "2026-10-12");
  assert.equal(monday("2026-10-19"), "2026-10-19");
  assert.equal(shiftDate("2024-03-01", -1), "2024-02-29");
  assert.equal(validDate("2026-02-29"), false);
});
test("water preserves each addition and undo, rejects invalid and future entries", () => {
  const initial = empty();
  let state = updateDay(initial, "2026-10-19", "water", 250, "2026-10-19");
  state = updateDay(state, "2026-10-19", "water", 150, "2026-10-19");
  assert.deepEqual(initial.days, {});
  assert.equal(summary(state, "2026-10-19").water, 400);
  state = updateDay(state, "2026-10-19", "undoWater", null, "2026-10-19");
  assert.deepEqual(state.days["2026-10-19"].water, [250]);
  assert.throws(() => updateDay(state, "2026-10-20", "water", 250, "2026-10-19"));
  for (const v of [NaN, -1, 0, 2001, 1.5, "250"]) assert.throws(() => updateDay(state, "2026-10-19", "water", v, "2026-10-19"));
});
test("weekly strength count excludes other exercise and averages exclude missing sleep", () => {
  let state = empty();
  for (const [day, type] of [["2026-10-18", "力量训练"], ["2026-10-19", "力量训练"], ["2026-10-20", "篮球"]]) state = updateDay(state, day, "exercise", { type, minutes: 30 }, "2026-10-21");
  state = updateDay(state, "2026-10-19", "sleep", 7, "2026-10-21");
  state = updateDay(state, "2026-10-20", "sleep", 8, "2026-10-21");
  const week = weekSummary(state, "2026-10-21");
  assert.equal(week.strength, 1); assert.equal(week.minutes, 60);
  assert.equal(week.sleepAverage, "7.5"); assert.equal(week.sleepDays, 2);
  assert.equal(summary(state, "2026-10-21").sleepText, "—");
});
test("page saves, edits, restores and deletes only the selected day", () => {
  const h = harness(); let page = h.load();
  page.chooseDate({ detail: { value: "2026-01-01" } });
  page.addWater({ currentTarget: { dataset: { amount: 250 } } });
  page.input(event("sleepInput", "7.5")); page.saveSleep();
  page.input(event("minutesInput", "35")); page.addExercise();
  page.input(event("minutesInput", "35abc")); page.addExercise();
  assert.match(page.data.error, /运动时长/);
  assert.equal(page.data.day.exercise.length, 1);
  page = h.load(); page.chooseDate({ detail: { value: "2026-01-01" } });
  assert.equal(page.data.stats.water, 250); assert.equal(page.data.sleepInput, "7.5");
  h.modals.push({ confirm: true }); page.removeSleep();
  h.modals.push({ confirm: true }); page.removeExercise({ currentTarget: { dataset: { index: 0 } } });
  page.undoWater(); assert.equal(page.state.days["2026-01-01"], undefined);
});
test("failed writes leave stored and displayed records intact and can be retried", () => {
  const h = harness(); const page = h.load(); const save = wx.setStorageSync;
  wx.setStorageSync = () => { throw new Error("quota"); };
  page.addWater({ currentTarget: { dataset: { amount: 250 } } });
  assert.equal(page.data.stats.water, 0); assert.match(page.data.error, /没有生效/);
  assert.equal(h.storage.has(HABITS_KEY), false);
  wx.setStorageSync = save; page.addWater({ currentTarget: { dataset: { amount: 250 } } });
  assert.equal(page.data.stats.water, 250); assert.equal(h.load().data.stats.water, 250);
});
test("corrupt or unavailable storage blocks writes instead of overwriting old data", () => {
  const h = harness(); h.storage.set(HABITS_KEY, { version: 2 });
  const page = h.load(); page.addWater({ currentTarget: { dataset: { amount: 250 } } });
  assert.equal(page.data.status, "corrupt"); assert.deepEqual(h.storage.get(HABITS_KEY), { version: 2 });
  assert.equal(validState({ ...empty(), days: { "2026-10-19": { water: ["250"], sleep: null, exercise: [] } } }), false);
  wx.getStorageSync = () => { throw new Error("read"); };
  assert.equal(readHabits().status, "unavailable");
});
test("goals, export, private sharing and scoped clearing work without touching Offer", () => {
  const h = harness(); const page = h.load(); h.storage.set(DRAFT_KEY, ["existing"]);
  for (const [key, value] of Object.entries({ water: "1800", sleep: "7.5", strength: "2" })) page.goalInput(event(key, value));
  page.saveGoals(); assert.deepEqual(h.load().data.goals, { water: 1800, sleep: 7.5, strength: 2 });
  page.exportData(); assert.equal(JSON.parse(h.calls.copied[0]).version, 1);
  assert.deepEqual(page.onShareAppMessage(), { title: "喝水、睡眠、运动，按自己的节奏记录", path: "/pages/habits/habits", imageUrl: "/images/share-entry.png" });
  page.clearHabits(); assert.equal(h.storage.has(HABITS_KEY), true);
  h.modals.push({ confirm: true }); page.clearHabits();
  assert.deepEqual(h.storage.get(DRAFT_KEY), ["existing"]); assert.equal(h.storage.has(HABITS_KEY), false);
  h.storage.set(HABITS_KEY, empty()); clearAllData(); assert.equal(h.storage.has(HABITS_KEY), false);
});
test("home links to habits and a new local day refreshes selection before recording", () => {
  const h = harness(); h.load("home").openHabits(); assert.equal(h.calls.routes[0], "/pages/habits/habits");
  const page = h.load(); const today = dateKey();
  page.setData({ today: shiftDate(today, -1), selected: shiftDate(today, -1) });
  page.addWater({ currentTarget: { dataset: { amount: 250 } } });
  assert.equal(page.data.selected, today); assert.equal(page.state.days[today].water[0], 250);
});
