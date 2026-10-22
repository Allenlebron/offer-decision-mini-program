const HABITS_KEY = "life-habits-v1";
const TYPES = ["力量训练", "篮球", "游泳", "步行", "跑步", "骑行", "其他运动"];
const FEELINGS = ["暂不填写", "精神不错", "一般", "有点疲惫"];
const CUPS = [150, 250, 350, 500, 750, 1000];
const empty = () => ({ version: 1, goals: { water: 0, sleep: 0, strength: 0 }, days: {} });
const copy = (value) => JSON.parse(JSON.stringify(value));
const pad = (value) => String(value).padStart(2, "0");

function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
function validDate(key) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  const [year, month, day] = key.split("-").map(Number);
  return year >= 2000 && year <= 2100 && dateKey(new Date(year, month - 1, day, 12)) === key;
}
function shiftDate(key, offset) {
  const [year, month, day] = key.split("-").map(Number);
  return dateKey(new Date(year, month - 1, day + offset, 12));
}
function monday(key) {
  const [year, month, day] = key.split("-").map(Number);
  const weekday = new Date(year, month - 1, day, 12).getDay();
  return shiftDate(key, -(weekday + 6) % 7);
}
function dayData(state, key) {
  return state.days[key] || { water: [], sleep: null, exercise: [] };
}
function numberIn(value, min, max, integer = false) {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max && (!integer || Number.isInteger(value));
}
function validState(state) {
  if (!state || state.version !== 1 || !state.goals || !state.days || Array.isArray(state.days) || typeof state.days !== "object") return false;
  if (state.celebratedOn !== undefined && !validDate(state.celebratedOn)) return false;
  if (state.preferences !== undefined && (!state.preferences || !CUPS.includes(state.preferences.cup))) return false;
  const g = state.goals;
  if (!numberIn(g.water, 0, 10000, true) || !numberIn(g.sleep, 0, 24) || !numberIn(g.strength, 0, 14, true)) return false;
  if (g.strengthDays !== undefined && !numberIn(g.strengthDays, 0, 7, true)) return false;
  return Object.entries(state.days).every(([key, day]) => validDate(key) && day &&
    Array.isArray(day.water) && day.water.every((v) => numberIn(v, 1, 2000, true)) &&
    day.water.reduce((sum, v) => sum + v, 0) <= 10000 &&
    (day.sleep === null || numberIn(day.sleep, 0.1, 24)) &&
    (day.feeling === undefined || (day.sleep !== null && FEELINGS.slice(1).includes(day.feeling))) &&
    (day.plan === undefined || ["train", "rest"].includes(day.plan)) &&
    (day.windDown === undefined || typeof day.windDown === "boolean") &&
    Array.isArray(day.exercise) && day.exercise.every((v) => v && TYPES.includes(v.type) && numberIn(v.minutes, 1, 720, true)));
}
function readHabits() {
  try {
    const value = wx.getStorageSync(HABITS_KEY);
    if (value === undefined || value === null || value === "") return { state: empty(), status: "ready" };
    if (!validState(value)) return { state: null, status: "corrupt" };
    return { state: copy(value), status: "ready" };
  } catch (_error) { return { state: null, status: "unavailable" }; }
}
function saveHabits(state) {
  if (!validState(state)) return false;
  try { wx.setStorageSync(HABITS_KEY, copy(state)); return true; } catch (_error) { return false; }
}
function parseNumber(value, min, max, integer = false) {
  if (!/^\d+(\.\d{1,2})?$/.test(String(value).trim())) return null;
  const number = Number(value);
  return numberIn(number, min, max, integer) ? number : null;
}
function updateDay(state, key, action, value, today = dateKey()) {
  if (!validDate(key) || key > today) throw new Error("请选择今天或以前的日期");
  const next = copy(state);
  const day = copy(dayData(next, key));
  if (action === "water") {
    if (!numberIn(value, 1, 2000, true)) throw new Error("每次饮水请填 1–2000 ml 的整数");
    if (day.water.reduce((sum, v) => sum + v, 0) + value > 10000) throw new Error("当天记录已超过 10000 ml，请核对是否重复记录");
    day.water.push(value);
  } else if (action === "undoWater") day.water.pop();
  else if (action === "sleep") {
    const hours = value && typeof value === "object" ? value.hours : value;
    if (hours !== null && !numberIn(hours, 0.1, 24)) throw new Error("睡眠时长请填 0.1–24 小时");
    if (value && typeof value === "object" && !FEELINGS.includes(value.feeling)) throw new Error("请选择醒来后的感受");
    day.sleep = hours;
    if (hours === null || value?.feeling === FEELINGS[0]) delete day.feeling;
    else if (value?.feeling) day.feeling = value.feeling;
  } else if (action === "exercise" || action === "editExercise") {
    if (!value || !TYPES.includes(value.type) || !numberIn(value.minutes, 1, 720, true)) throw new Error("运动时长请填 1–720 分钟的整数");
    if (action === "editExercise") {
      if (!Number.isInteger(value.index) || value.index < 0 || value.index >= day.exercise.length) throw new Error("这条记录已不存在，请重新选择");
      day.exercise[value.index] = { type: value.type, minutes: value.minutes };
    } else day.exercise.push({ type: value.type, minutes: value.minutes });
  } else if (action === "removeExercise") {
    if (!Number.isInteger(value) || value < 0 || value >= day.exercise.length) throw new Error("这条记录已不存在，请刷新");
    day.exercise.splice(value, 1);
  } else if (action === "plan") {
    if (!["train", "rest"].includes(value)) throw new Error("请选择训练或恢复安排");
    day.plan = value;
  } else if (action === "windDown") {
    if (typeof value !== "boolean") throw new Error("请核对睡前准备状态");
    day.windDown = value;
  } else throw new Error("不支持的记录类型");
  if (!day.water.length && day.sleep === null && !day.exercise.length && !day.plan && !day.windDown) delete next.days[key];
  else next.days[key] = day;
  return next;
}
function summary(state, key) {
  const day = dayData(state, key);
  return { date: key, label: key.slice(5).replace("-", "/"), water: day.water.reduce((sum, v) => sum + v, 0),
    sleep: day.sleep, sleepText: day.sleep === null ? "—" : String(day.sleep),
    minutes: day.exercise.reduce((sum, v) => sum + v.minutes, 0),
    recorded: Boolean(day.water.length || day.sleep !== null || day.exercise.length) };
}
function weekSummary(state, key) {
  const start = monday(key);
  const rows = Array.from({ length: 7 }, (_, i) => dayData(state, shiftDate(start, i)));
  const exercise = rows.flatMap((day) => day.exercise);
  const sleeps = rows.filter((day) => day.sleep !== null);
  return { start, end: shiftDate(start, 6), strength: exercise.filter((v) => v.type === TYPES[0]).length,
    strengthDays: rows.filter((day) => day.exercise.some((v) => v.type === TYPES[0])).length,
    minutes: exercise.reduce((sum, v) => sum + v.minutes, 0),
    sleepDays: sleeps.length, sleepAverage: sleeps.length ? (sleeps.reduce((sum, day) => sum + day.sleep, 0) / sleeps.length).toFixed(1) : "—",
    waterDays: rows.filter((day) => day.water.length).length };
}

function goalProgress(state, key) {
  const day = summary(state, key);
  const week = weekSummary(state, key);
  return [
    { id: "water", label: "饮水", period: "当天", value: day.water, unit: "ml", color: "#2463FF", track: "#E2E9FC" },
    { id: "sleep", label: "睡眠", period: "当天", value: day.sleep, unit: "小时", color: "#7952C7", track: "#ECE6F7" },
    { id: "strength", label: "力量训练", period: "本周", value: week.strengthDays, unit: "天", color: "#16785C", track: "#E0EFE9" },
  ].map((item) => {
    const goal = (item.id === "strength" ? state.goals.strengthDays : state.goals[item.id]) || 0;
    const percent = goal ? Math.min(100, (item.value || 0) / goal * 100) : 0;
    return { ...item, goal, percent,
      valueText: `${item.value === null ? '—' : item.value}${goal ? ' / ' + goal : ''} ${item.unit}`,
      status: !goal ? "未设目标" : item.value === null ? "未记录" : percent >= 100 ? "已达目标" : `${Math.round(percent)}%`,
    };
  });
}

function dailyAchievement(state, key) {
  const goals = goalProgress(state, key).filter((item) => item.id !== "strength" && item.goal > 0);
  return { complete: goals.length > 0 && goals.every((item) => item.value !== null && item.value >= item.goal), goals };
}

function weeklyJournal(state, key) {
  const week = weekSummary(state, key);
  const days = Array.from({ length: 7 }, (_, i) => summary(state, shiftDate(week.start, i)));
  const facts = [];
  if (week.strengthDays) facts.push(`记录了 ${week.strengthDays} 天力量训练，共 ${week.strength} 次。`);
  if (week.sleepDays) facts.push(`写下了 ${week.sleepDays} 天睡眠，已记录均值 ${week.sleepAverage} 小时。`);
  if (week.waterDays) facts.push(`有 ${week.waterDays} 天，记下了喝水这件小事。`);
  if (week.minutes) facts.push(`运动记录累计 ${week.minutes} 分钟。`);
  return { ...week, facts, recordedDays: days.filter((day) => day.recorded).length };
}

module.exports = { HABITS_KEY, TYPES, FEELINGS, CUPS, empty, dateKey, validDate, shiftDate, monday, dayData, validState, readHabits, saveHabits, parseNumber, updateDay, summary, weekSummary, goalProgress, dailyAchievement, weeklyJournal };
