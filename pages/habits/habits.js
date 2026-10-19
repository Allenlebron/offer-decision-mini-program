const { HABITS_KEY, TYPES, dateKey, validDate, shiftDate, dayData, readHabits, saveHabits, parseNumber, updateDay, summary, weekSummary } = require("../../utils/habits");
const { enableShareMenu, scenarioShare } = require("../../utils/share");

Page({
  data: { tab: "today", today: "", selected: "", status: "ready", error: "", notice: "", waterInput: "", sleepInput: "", minutesInput: "", typeIndex: 0, types: TYPES,
    goalsForm: { water: "", sleep: "", strength: "" }, goals: {}, day: { water: [], sleep: null, exercise: [] }, stats: {}, week: {}, recent: [], waterProgress: 0 },
  onLoad() { enableShareMenu(); this.load(); },
  onShow() { if (this.state) this.refreshDate(); },
  refreshDate() {
    const today = dateKey();
    if (this.data.today !== today) {
      const selected = !this.data.selected || this.data.selected === this.data.today ? today : this.data.selected;
      this.setData({ today, selected, waterInput: "", sleepInput: "", minutesInput: "", error: "", notice: "" });
      this.render(); this.fillSleep();
    }
  },
  load() {
    const result = readHabits(); this.state = result.state;
    this.setData({ status: result.status, error: "", notice: "", today: dateKey(), selected: this.data.selected || dateKey() });
    if (this.state) { this.render(); this.fillSleep(); this.fillGoals(); }
  },
  render() {
    if (!this.state) return;
    const selected = this.data.selected;
    const stats = summary(this.state, selected);
    this.setData({ day: dayData(this.state, selected), stats, goals: this.state.goals, week: weekSummary(this.state, selected),
      recent: Array.from({ length: 7 }, (_, i) => summary(this.state, shiftDate(selected, i - 6))),
      waterProgress: this.state.goals.water ? Math.min(100, stats.water / this.state.goals.water * 100) : 0 });
  },
  fillSleep() { this.setData({ sleepInput: this.state ? String(dayData(this.state, this.data.selected).sleep ?? "") : "" }); },
  fillGoals() { this.setData({ goalsForm: Object.fromEntries(Object.entries(this.state.goals).map(([key, value]) => [key, value ? String(value) : ""])) }); },
  switchTab(event) {
    this.refreshDate(); this.setData({ tab: event.currentTarget.dataset.tab, error: "", notice: "" });
    if (this.data.tab === "settings" && this.state) this.fillGoals();
  },
  chooseDate(event) {
    const selected = event.detail.value;
    if (!validDate(selected) || selected > dateKey()) return;
    this.setData({ selected, error: "", notice: "", waterInput: "", minutesInput: "" }); this.render(); this.fillSleep();
  },
  openDay(event) { this.chooseDate({ detail: { value: event.currentTarget.dataset.date } }); this.setData({ tab: "today" }); },
  goToday() { this.chooseDate({ detail: { value: dateKey() } }); },
  input(event) {
    const key = event.currentTarget.dataset.key;
    if (["waterInput", "sleepInput", "minutesInput"].includes(key)) this.setData({ [key]: event.detail.value, error: "", notice: "" });
  },
  goalInput(event) {
    const key = event.currentTarget.dataset.key;
    if (["water", "sleep", "strength"].includes(key)) this.setData({ goalsForm: { ...this.data.goalsForm, [key]: event.detail.value }, error: "", notice: "" });
  },
  chooseType(event) { this.setData({ typeIndex: Number(event.detail.value) }); },
  showError(message) {
    this.setData({ error: message, notice: "" });
    wx.pageScrollTo({ scrollTop: 0, duration: 0 });
  },
  commit(next, notice) {
    if (!saveHabits(next)) { this.showError("未能保存，这次操作没有生效。请重试。"); return false; }
    this.state = next; this.render(); this.setData({ error: "", notice });
    wx.showToast({ title: notice, icon: "none" }); return true;
  },
  change(action, value, notice) {
    if (!this.state) return false;
    this.refreshDate();
    try { return this.commit(updateDay(this.state, this.data.selected, action, value), notice); }
    catch (error) { this.showError(error.message); return false; }
  },
  addWater(event) {
    const value = event.currentTarget.dataset.amount || parseNumber(this.data.waterInput, 1, 2000, true);
    if (this.change("water", Number(value), `已记录 ${value} ml`)) this.setData({ waterInput: "" });
  },
  undoWater() { this.change("undoWater", null, "已撤销最后一杯"); },
  saveSleep() {
    const value = parseNumber(this.data.sleepInput, 0.1, 24);
    if (value === null) { this.showError("请填写 0.1–24 小时的睡眠时长"); return; }
    if (this.change("sleep", value, "睡眠记录已保存")) this.fillSleep();
  },
  addExercise() {
    const value = { type: TYPES[this.data.typeIndex], minutes: parseNumber(this.data.minutesInput, 1, 720, true) };
    if (this.change("exercise", value, "运动记录已保存")) this.setData({ minutesInput: "" });
  },
  removeExercise(event) {
    const index = Number(event.currentTarget.dataset.index);
    const selected = this.data.selected;
    wx.showModal({ title: "删除这条运动记录？", content: "删除后周统计会一起更新。", confirmText: "删除", success: (result) => {
      if (result.confirm && selected === this.data.selected) this.change("removeExercise", index, "已删除运动记录");
    } });
  },
  removeSleep() {
    const selected = this.data.selected;
    wx.showModal({ title: "删除这天的睡眠记录？", confirmText: "删除", success: (result) => {
      if (result.confirm && selected === this.data.selected && this.change("sleep", null, "已删除睡眠记录")) this.fillSleep();
    } });
  },
  saveGoals() {
    const form = this.data.goalsForm;
    const value = (key, max, integer) => String(form[key]).trim() === "" ? 0 : parseNumber(form[key], 1, max, integer);
    const goals = { water: value("water", 10000, true), sleep: value("sleep", 24, false), strength: value("strength", 14, true) };
    if (Object.values(goals).some((v) => v === null)) { this.showError("请核对目标：饮水 1–10000 ml、睡眠 1–24 小时、力量训练 1–14 次；不设目标可留空。"); return; }
    this.commit({ ...this.state, goals }, "目标已保存");
  },
  exportData() {
    if (!this.state) return;
    wx.setClipboardData({ data: JSON.stringify(this.state, null, 2), success: () => this.setData({ notice: "已复制 JSON，可粘贴到文件留存", error: "" }), fail: () => this.showError("复制失败，请重试") });
  },
  clearHabits() {
    wx.showModal({ title: "清除日常打卡数据？", content: "将删除全部打卡记录和目标，无法恢复。Offer、租房和预算数据不受影响。", confirmText: "清除", confirmColor: "#A12F39", success: (result) => {
      if (!result.confirm) return;
      try { wx.removeStorageSync(HABITS_KEY); this.load(); this.setData({ notice: "日常打卡数据已清除" }); }
      catch (_error) { this.showError("清除失败，请重试"); }
    } });
  },
  openAbout() { wx.navigateTo({ url: "/pages/about/about" }); },
  onShareAppMessage() { return scenarioShare("habits"); },
  onShareTimeline() { const share = scenarioShare("habits"); return { title: share.title, imageUrl: share.imageUrl }; },
});
