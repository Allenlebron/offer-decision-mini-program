const test = require("node:test");
const assert = require("node:assert/strict");
const { HABITS_KEY, TYPES, empty, dateKey, validDate, shiftDate, monday, updateDay, summary, weekSummary, goalProgress, dailyAchievement, readHabits, validState } = require("../utils/habits");
const { clearAllData } = require("../utils/decision-storage");
const { DRAFT_KEY } = require("../utils/storage");

function harness() {
  const storage = new Map(); const modals = []; const calls = { copied: [], routes: [], tabHidden: false };
  global.wx = { getStorageSync: (key) => structuredClone(storage.get(key)),
    setStorageSync: (key, value) => storage.set(key, structuredClone(value)),
    removeStorageSync: (key) => storage.delete(key), showShareMenu() {}, showToast() {}, pageScrollTo() {},
    showModal: (options) => options.success(modals.shift() || { confirm: false }),
    setClipboardData: (options) => { calls.copied.push(options.data); options.success?.(); },
    navigateTo: ({ url }) => calls.routes.push(url),
    env: { USER_DATA_PATH: "wxfile://usr" }, getFileSystemManager: () => ({ copyFile() {} }),
    hideKeyboard() {}, hideTabBar: () => { calls.tabHidden = true; }, showTabBar: () => { calls.tabHidden = false; } };
  const load = (name = "habits") => {
    let definition; global.Page = (value) => { definition = value; };
    const path = require.resolve(`../pages/${name}/${name}.js`); delete require.cache[path]; require(path);
    const page = { ...definition, data: structuredClone(definition.data), setData(patch, callback) { Object.assign(this.data, patch); callback?.(); } };
    page.onLoad?.(); page.onShow?.(); return page;
  };
  return { storage, modals, calls, load };
}
const event = (key, value) => ({ currentTarget: { dataset: { key } }, detail: { value } });
const chooseGoal = (page, key, value) => {
  const field = page.data.goalFields.find((item) => item.key === key);
  const index = field.options.findIndex((option) => option.value === value);
  assert.notEqual(index, -1);
  page.chooseGoal(event(key, String(index)));
};

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
  for (const [key, value] of Object.entries({ water: 1800, sleep: 7.5, strengthDays: 2 })) chooseGoal(page, key, value);
  page.saveGoals(); assert.deepEqual(h.load().data.goals, { water: 1800, sleep: 7.5, strength: 0, strengthDays: 2 });
  page.exportData(); assert.equal(JSON.parse(h.calls.copied[0]).version, 1);
  assert.deepEqual(page.onShareAppMessage(), { title: "薄肌、大水、大睡，把生活过得更有劲", path: "/pages/habits/habits", imageUrl: "/images/share-habits.png" });
  page.clearHabits(); assert.equal(h.storage.has(HABITS_KEY), true);
  h.modals.push({ confirm: true }); page.clearHabits();
  assert.deepEqual(h.storage.get(DRAFT_KEY), ["existing"]); assert.equal(h.storage.has(HABITS_KEY), false);
  h.storage.set(HABITS_KEY, empty()); clearAllData(); assert.equal(h.storage.has(HABITS_KEY), false);
});
test("a new local day refreshes selection before recording", () => {
  const h = harness();
  const page = h.load(); const today = dateKey();
  page.setData({ today: shiftDate(today, -1), selected: shiftDate(today, -1) });
  page.addWater({ currentTarget: { dataset: { amount: 250 } } });
  assert.equal(page.data.selected, today); assert.equal(page.state.days[today].water[0], 250);
});

test("review separates calendar weeks from latest-first daily records and opens the selected day", () => {
  const h = harness(); let state = empty();
  state = updateDay(state, "2026-01-01", "water", 500, "2026-01-11");
  state = updateDay(state, "2026-01-05", "exercise", { type: "力量训练", minutes: 30 }, "2026-01-11");
  state = updateDay(state, "2026-01-06", "sleep", 7, "2026-01-11");
  state = updateDay(state, "2026-01-10", "sleep", 9, "2026-01-11");
  h.storage.set(HABITS_KEY, state); const page = h.load();
  page.switchTab({ currentTarget: { dataset: { tab: "history" } } });
  page.chooseDate({ detail: { value: "2026-01-07" } });
  assert.deepEqual(page.data.recent.map((item) => item.date), Array.from({ length: 7 }, (_, i) => shiftDate("2026-01-07", -i)));
  assert.equal(page.data.recent[0].weekday, "周三"); assert.equal(page.data.recent[6].weekday, "周四");
  assert.equal(page.data.recentRecordedDays, 3);
  assert.deepEqual(page.data.recentEntries.map((item) => item.date), ["2026-01-06", "2026-01-05", "2026-01-01"]);
  assert.equal(page.data.week.start, "2026-01-05"); assert.equal(page.data.week.end, "2026-01-11");
  assert.equal(page.data.week.sleepAverage, "8.0"); assert.equal(page.data.week.waterDays, 0);
  page.openDay({ currentTarget: { dataset: { date: page.data.recent[1].date } } });
  assert.equal(page.data.tab, "today"); assert.equal(page.data.selected, "2026-01-06"); assert.equal(page.data.sleepInput, "7");
  page.addWater({ currentTarget: { dataset: { amount: 250 } } });
  assert.equal(page.data.recent[0].water, 250);
  page.chooseDate({ detail: { value: "2000-01-01" } });
  assert.deepEqual(page.data.recent.map((item) => item.date), ["2000-01-01"]);
  assert.equal(page.data.recentRecordedDays, 0);
});

test("daily cards include sleep-only days and all exercise details, and disappear only when empty", () => {
  const h = harness(); let state = empty();
  state = updateDay(state, "2026-01-01", "sleep", 7.5, "2026-01-07");
  state = updateDay(state, "2026-01-02", "sleep", 8, "2026-01-07");
  for (const type of [...TYPES, "篮球"]) state = updateDay(state, "2026-01-02", "exercise", { type, minutes: 30 }, "2026-01-07");
  state = updateDay(state, "2026-01-03", "water", 250, "2026-01-07");
  state = updateDay(state, "2026-01-03", "water", 150, "2026-01-07");
  h.storage.set(HABITS_KEY, state); const page = h.load();
  page.chooseDate({ detail: { value: "2026-01-07" } });
  assert.equal(page.data.recentEntries[0].waterCount, 2);
  assert.equal(page.data.recentEntries[0].water, 400);
  assert.deepEqual(page.data.recentEntries[1].exercise, state.days["2026-01-02"].exercise);
  assert.equal(page.data.recentEntries[1].minutes, 240);
  assert.equal(page.data.recentEntries[2].sleep, 7.5);
  page.openDay({ detail: { value: "2026-01-03" } });
  assert.equal(page.data.tab, "today"); assert.equal(page.data.selected, "2026-01-03");
  page.undoWater(); page.undoWater(); assert.equal(page.data.recentRecordedDays, 2);
  page.openDay({ detail: { value: "2026-01-02" } });
  for (let i = 0; i < 8; i++) {
    h.modals.push({ confirm: true }); page.removeExercise({ currentTarget: { dataset: { index: 0 } } });
  }
  assert.equal(page.data.recentEntries[0].exercise.length, 0);
  assert.equal(page.data.recentEntries[0].sleep, 8);
  h.modals.push({ confirm: true }); page.removeSleep();
  assert.equal(page.data.recentRecordedDays, 1);
  page.openDay({ detail: { value: "2026-01-01" } });
  h.modals.push({ confirm: true }); page.removeSleep();
  assert.deepEqual(page.data.recentEntries, []);
  page.switchTab({ currentTarget: { dataset: { tab: "history" } } });
  page.openDay({ detail: { value: "1999-12-31" } });
  assert.equal(page.data.tab, "history"); assert.equal(page.data.selected, "2026-01-01");
});

test("goal selectors preserve existing custom values, support unset and ignore invalid selections", () => {
  const h = harness(); const state = empty(); state.goals = { water: 1735, sleep: 7.25, strength: 9 };
  h.storage.set(HABITS_KEY, state); let page = h.load();
  for (const field of page.data.goalFields) assert.equal(field.options[field.index].value, state.goals[field.key] || 0);
  page.saveGoals(); assert.deepEqual(h.load().data.goals, { ...state.goals, strengthDays: 0 });
  const before = structuredClone(page.data.goalsForm);
  for (const [key, index] of [["water", -1], ["sleep", 999], ["strengthDays", 1.5], ["unknown", 0]]) page.chooseGoal(event(key, index));
  assert.deepEqual(page.data.goalsForm, before);
  chooseGoal(page, "water", 2000);
  assert.equal(h.load().data.goals.water, 1735);
  chooseGoal(page, "sleep", 0); chooseGoal(page, "strengthDays", 0); page.saveGoals();
  page = h.load(); assert.deepEqual(page.data.goals, { water: 2000, sleep: 0, strength: 9, strengthDays: 0 });
  assert.equal(page.data.goalFields[1].options[page.data.goalFields[1].index].label, "不设置");
});

test("goal rings keep daily and weekly periods distinct and never invent an unset target", () => {
  let state = empty();
  state = updateDay(state, "2026-10-18", "exercise", { type: "力量训练", minutes: 30 }, "2026-10-20");
  state = updateDay(state, "2026-10-19", "exercise", { type: "力量训练", minutes: 30 }, "2026-10-20");
  state = updateDay(state, "2026-10-20", "exercise", { type: "篮球", minutes: 60 }, "2026-10-20");
  state = updateDay(state, "2026-10-20", "water", 500, "2026-10-20");
  assert.deepEqual(goalProgress(state, "2026-10-20").map((ring) => [ring.percent, ring.status]), [[0, "未设目标"], [0, "未设目标"], [0, "未设目标"]]);
  state.goals = { water: 1000, sleep: 8, strength: 2, strengthDays: 2 };
  let rings = goalProgress(state, "2026-10-20");
  assert.deepEqual(rings.map((ring) => ring.percent), [50, 0, 50]);
  assert.equal(rings[1].status, "未记录"); assert.equal(rings[2].period, "本周");
  state = updateDay(state, "2026-10-20", "water", 2000, "2026-10-20");
  state = updateDay(state, "2026-10-20", "sleep", 9, "2026-10-20");
  rings = goalProgress(state, "2026-10-20");
  assert.deepEqual(rings.map((ring) => ring.percent), [100, 100, 50]);
  assert.equal(rings[0].valueText, "2500 / 1000 ml");
  assert.equal(rings[1].status, "已达目标");
  assert.deepEqual(goalProgress(state, "2026-10-18").map((ring) => ring.percent), [0, 0, 50]);
  assert.deepEqual(goalProgress(state, "2026-10-26").map((ring) => ring.percent), [0, 0, 0]);
});

test("rings refresh after goal changes, record edits and undo, and survive switching sections", () => {
  const h = harness(); const page = h.load();
  chooseGoal(page, "water", 1000); page.saveGoals();
  page.addWater({ currentTarget: { dataset: { amount: 250 } } });
  assert.equal(page.data.rings[0].percent, 25);
  const save = wx.setStorageSync; wx.setStorageSync = () => { throw new Error("quota"); };
  page.addWater({ currentTarget: { dataset: { amount: 250 } } });
  assert.equal(page.data.rings[0].percent, 25);
  wx.setStorageSync = save; page.undoWater(); assert.equal(page.data.rings[0].percent, 0);
  chooseGoal(page, "water", 0); page.saveGoals(); assert.equal(page.data.rings[0].status, "未设目标");
  page.switchTab({ currentTarget: { dataset: { tab: "history" } } });
  page.openDay({ currentTarget: { dataset: { date: "2026-01-01" } } });
  assert.equal(page.data.selected, "2026-01-01"); assert.equal(page.data.tab, "today");
  assert.deepEqual(h.load().data.goals, { water: 0, sleep: 0, strength: 0, strengthDays: 0 });
});

test("daily achievement requires every configured daily goal and ignores weekly training", () => {
  let state = empty(); const day = dateKey();
  assert.equal(dailyAchievement(state, day).complete, false);
  state.goals.strength = 2;
  assert.equal(dailyAchievement(state, day).complete, false);
  state.goals.water = 250; state.goals.sleep = 8;
  state = updateDay(state, day, "water", 250);
  assert.equal(dailyAchievement(state, day).complete, false);
  state = updateDay(state, day, "sleep", 7.99);
  assert.equal(dailyAchievement(state, day).complete, false);
  state = updateDay(state, day, "sleep", 8);
  assert.equal(dailyAchievement(state, day).complete, true);
  assert.deepEqual(dailyAchievement(state, day).goals.map((goal) => goal.id), ["water", "sleep"]);
  state.goals.water = 0;
  assert.equal(dailyAchievement(state, day).complete, true);
});

test("today's final goal opens celebration once even after undo, reload and re-completion", () => {
  const h = harness(); let page = h.load();
  chooseGoal(page, "water", 1000); chooseGoal(page, "sleep", 8); page.saveGoals();
  page.addWater({ currentTarget: { dataset: { amount: 1000 } } });
  assert.equal(page.data.celebrationOpen, false);
  page.input(event("sleepInput", "8")); page.saveSleep();
  assert.equal(page.data.celebrationOpen, true); assert.equal(h.calls.tabHidden, true);
  assert.equal(h.calls.routes.length, 0);
  assert.equal(h.storage.get(HABITS_KEY).celebratedOn, dateKey());
  page.closeCelebration(); assert.equal(h.calls.tabHidden, false);
  page = h.load(); page.undoWater();
  assert.equal(page.data.dailyComplete, false);
  page.addWater({ currentTarget: { dataset: { amount: 1000 } } });
  assert.equal(page.data.dailyComplete, true); assert.equal(page.data.celebrationOpen, false);
  page.openCelebration(); assert.equal(page.data.celebrationOpen, true);
});

test("failed saves do not celebrate or consume the daily celebration; retry succeeds", () => {
  const h = harness(); const page = h.load();
  chooseGoal(page, "water", 1000); page.saveGoals();
  const save = wx.setStorageSync; wx.setStorageSync = () => { throw new Error("quota"); };
  page.addWater({ currentTarget: { dataset: { amount: 1000 } } });
  assert.equal(page.data.dailyComplete, false); assert.equal(page.data.celebrationOpen, false);
  assert.equal(h.storage.get(HABITS_KEY).celebratedOn, undefined);
  wx.setStorageSync = save; page.addWater({ currentTarget: { dataset: { amount: 1000 } } });
  assert.equal(page.data.celebrationOpen, true);
});

test("history, goal edits and app reopening do not auto-celebrate; a new day can", () => {
  const h = harness(); const today = dateKey(); const yesterday = shiftDate(today, -1);
  let state = empty(); state.goals.water = 250; state.celebratedOn = yesterday;
  h.storage.set(HABITS_KEY, state); let page = h.load();
  page.chooseDate({ detail: { value: yesterday } });
  page.addWater({ currentTarget: { dataset: { amount: 250 } } });
  assert.equal(page.data.celebrationOpen, false); assert.equal(page.data.dailyComplete, false);
  page.goToday(); page.addWater({ currentTarget: { dataset: { amount: 250 } } });
  assert.equal(page.data.celebrationOpen, true); page.closeCelebration();
  page = h.load(); assert.equal(page.data.celebrationOpen, false);
  chooseGoal(page, "water", 0); page.saveGoals();
  assert.equal(page.data.celebrationOpen, false);
  assert.equal(validState({ ...empty(), celebratedOn: "invalid" }), false);
});

test("celebration dialog uses real data, restores tabs and shares only a fixed public cover", () => {
  const h = harness(); let state = empty(); state.goals.water = 250;
  state = updateDay(state, dateKey(), "water", 500); h.storage.set(HABITS_KEY, state);
  const page = h.load(); page.openCelebration(); assert.equal(page.data.celebrationOpen, true);
  assert.equal(page.data.celebrationGoals[0].valueText, "500 / 250 ml");
  const shareEvent = { from: "button" };
  assert.deepEqual(page.onShareAppMessage(shareEvent), { title: "今天的小目标完成了，一起照顾好自己", path: "/pages/habits/habits", imageUrl: "/images/share-celebration.png" });
  page.celebrationImage = "wxfile://tmp/share-cover.png";
  assert.equal(page.onShareAppMessage(shareEvent).imageUrl, "wxfile://tmp/share-cover.png");
  delete page.celebrationImage;
  assert.deepEqual(page.onShareAppMessage(), { title: "薄肌、大水、大睡，把生活过得更有劲", path: "/pages/habits/habits", imageUrl: "/images/share-habits.png" });
  page.onHide(); assert.equal(page.data.celebrationOpen, false); assert.equal(h.calls.tabHidden, false);
  assert.equal(page.onShareAppMessage(shareEvent).imageUrl, "/images/share-celebration.png");
  page.chooseDate({ detail: { value: shiftDate(dateKey(), -1) } });
  assert.equal(page.onShareAppMessage(shareEvent).imageUrl, "/images/share-habits.png");
  page.closeCelebration(); h.storage.clear(); page.load(); page.openCelebration();
  assert.equal(page.data.celebrationOpen, false);
  h.storage.set(HABITS_KEY, { invalid: true }); page.load(); page.openCelebration();
  assert.equal(page.data.celebrationOpen, false);
});
