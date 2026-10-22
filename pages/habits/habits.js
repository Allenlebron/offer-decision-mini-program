const { HABITS_KEY, TYPES, FEELINGS, CUPS, dateKey, validDate, shiftDate, dayData, readHabits, saveHabits, parseNumber, updateDay, summary, weekSummary, goalProgress, dailyAchievement } = require("../../utils/habits");
const { enableShareMenu, scenarioShare, celebrationShare } = require("../../utils/share");

Page({
  data: { tab: "today", today: "", selected: "", status: "ready", error: "", notice: "", waterInput: "", sleepInput: "", minutesInput: "", typeIndex: 0, types: TYPES,
    details: { water: false, sleep: false, exercise: false }, editExerciseIndex: -1, progressExpanded: false, feedbackKind: "", scene: {}, cup: 250, cupIndex: 1,
    cups: CUPS.map((value) => `${value} ml`), feelings: FEELINGS, feelingIndex: 0,
    goalsForm: { water: 0, sleep: 0, strength: 0 }, goalFields: [], goals: {}, day: { water: [], sleep: null, exercise: [] }, stats: {}, week: {}, recent: [], recentEntries: [], recentRecordedDays: 0, rings: [], dailyComplete: false,
    celebrationOpen: false, celebrationDate: "", celebrationGoals: [], celebrationExercise: {}, celebrationScrollHeight: 448, confetti: Array.from({ length: 10 }, (_, i) => ({
      left: 8 + i * 9, drift: (i % 2 ? 1 : -1) * (12 + i * 2), rotate: i * 37,
      delay: i % 4 * 60, color: ["#2463FF", "#7952C7", "#16785C", "#D9AA5B"][i % 4],
    })) },
  onLoad() {
    enableShareMenu(); this.load();
    const path = `${wx.env.USER_DATA_PATH}/share-celebration.png`;
    wx.getFileSystemManager().copyFile({ srcPath: celebrationShare().imageUrl, destPath: path,
      success: () => { this.celebrationImage = path; } });
  },
  onReady() { this.ringsReady = true; this.drawRings(); },
  onShow() { if (this.state) { this.refreshDate(); this.updateScene(); this.drawRings(); } },
  onHide() { this.closeCelebration(); },
  onUnload() { this.closeCelebration(); },
  drawRings() {
    if (!this.ringsReady || !this.data.progressExpanded || this.data.tab !== "today" || this.data.status !== "ready" || this.data.celebrationOpen) return;
    wx.createSelectorQuery().select("#goal-rings").fields({ node: true, size: true }).exec((result) => {
      const canvas = result[0]?.node;
      if (!canvas || !this.data.progressExpanded || this.data.tab !== "today" || this.data.status !== "ready" || this.data.celebrationOpen) return;
      const ratio = wx.getWindowInfo().pixelRatio;
      canvas.width = result[0].width * ratio;
      canvas.height = result[0].height * ratio;
      const context = canvas.getContext("2d");
      context.scale(canvas.width / 168, canvas.height / 168);
      context.lineWidth = 12;
      context.lineCap = "round";
      this.data.rings.forEach((ring, index) => {
        const radius = 76 - index * 21;
        context.beginPath(); context.strokeStyle = ring.track;
        context.arc(84, 84, radius, 0, Math.PI * 2); context.stroke();
        if (ring.percent > 0) {
          context.beginPath(); context.strokeStyle = ring.color;
          context.arc(84, 84, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ring.percent / 100); context.stroke();
        }
      });
    });
  },
  refreshDate() {
    const today = dateKey();
    if (this.data.today !== today) {
      this.closeCelebration();
      const selected = !this.data.selected || this.data.selected === this.data.today ? today : this.data.selected;
      this.setData({ today, selected, waterInput: "", sleepInput: "", minutesInput: "", editExerciseIndex: -1, error: "", notice: "" });
      this.render(); this.fillSleep();
    }
  },
  load() {
    const result = readHabits(); this.state = result.state;
    this.setData({ status: result.status, error: "", notice: "", editExerciseIndex: -1, minutesInput: "", today: dateKey(), selected: this.data.selected || dateKey() });
    if (this.state) { this.render(); this.fillSleep(); this.fillGoals(); }
  },
  render() {
    if (!this.state) return;
    const selected = this.data.selected;
    const stats = summary(this.state, selected);
    const recent = Array.from({ length: 7 }, (_, i) => {
      const date = shiftDate(selected, -i);
      const day = dayData(this.state, date);
      return { ...summary(this.state, date), waterCount: day.water.length, exercise: day.exercise, weekday: date === this.data.today ? "今天" :
        ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][new Date(`${date}T12:00:00`).getDay()] };
    }).filter((item) => validDate(item.date));
    const recentEntries = recent.filter((item) => item.recorded);
    this.setData({ day: dayData(this.state, selected), stats, goals: this.state.goals, week: weekSummary(this.state, selected),
      recent, recentEntries, recentRecordedDays: recentEntries.length,
      cup: this.state.preferences?.cup || 250, cupIndex: CUPS.indexOf(this.state.preferences?.cup || 250),
      rings: goalProgress(this.state, selected), dailyComplete: selected === dateKey() && dailyAchievement(this.state, selected).complete }, () => this.drawRings());
    this.updateScene();
  },
  updateScene(hour = new Date().getHours()) {
    const historical = this.data.selected !== this.data.today;
    const scene = historical ? { title: "给那天，补上一笔。", copy: "照实记下就好，不用补齐所有项目。", action: "water", label: "查看与补记", historical: true } :
      hour >= 21 || hour < 5 ? { title: this.data.day.windDown ? "今天，可以到这里了。" : "给明天，留点精神。", copy: "准备收尾，接下来把时间留给休息。", action: "windDown", label: this.data.day.windDown ? "查看睡前安排" : "今天准备收尾了" } :
      hour < 11 && this.data.day.sleep === null ? { title: "昨晚，睡得怎么样？", copy: "好眠值得记下，没睡好也不用勉强。", action: "sleep", label: "记下昨晚睡眠" } :
      this.data.stats.water > 0 ? !this.data.day.exercise.length && this.data.day.plan !== "rest" ?
        { title: "接下来，动一动？", copy: "练一练，或留给恢复。按自己的状态来。", action: "exercise", label: "看看今天的安排" } :
        { title: "这一点点，正在积累。", copy: "把日常留成一页，看看这一周。", action: "journal", label: "翻开生活周刊" } :
      { title: "忙里，也照顾自己。", copy: "练一点，喝够水，睡好觉。做一件也很好。", action: "water", label: `喝了一杯 · ${this.data.cup} ml` };
    this.setData({ scene });
  },
  actScene() {
    const { action, historical } = this.data.scene;
    if (historical) return this.focusDetail("water");
    if (action === "water") this.addCup();
    else if (action === "journal") this.openJournal();
    else if (action === "exercise") {
      this.setData({ details: { ...this.data.details, exercise: false } }, () => wx.pageScrollTo({ selector: "#habit-exercise", duration: 200 }));
    }
    else if (action === "windDown" && !this.data.day.windDown) this.windDown();
    else this.focusDetail(action === "windDown" ? "sleep" : action);
  },
  focusDetail(key) {
    if (!["water", "sleep", "exercise"].includes(key)) return;
    this.setData({ details: { ...this.data.details, [key]: true } }, () => wx.pageScrollTo({ selector: `#habit-${key}`, duration: 200 }));
  },
  toggleDetail(event) {
    const key = event.currentTarget.dataset.key;
    if (["water", "sleep", "exercise"].includes(key)) this.setData({ details: { ...this.data.details, [key]: !this.data.details[key] } });
  },
  toggleProgress() { this.setData({ progressExpanded: !this.data.progressExpanded }, () => this.drawRings()); },
  fillSleep() {
    const day = this.state && dayData(this.state, this.data.selected);
    this.setData({ sleepInput: day ? String(day.sleep ?? "") : "", feelingIndex: Math.max(0, FEELINGS.indexOf(day?.feeling)) });
  },
  fillGoals() {
    const goals = this.state.goals;
    const goalFields = [
      { key: "water", label: "每天饮水", unit: "ml", values: [1000, 1500, 1700, 1800, 2000, 2500, 3000] },
      { key: "sleep", label: "每天睡眠", unit: "小时", values: [6, 6.5, 7, 7.5, 8, 8.5, 9] },
      { key: "strengthDays", label: "每周力量训练", unit: "天", values: [1, 2, 3, 4, 5, 6, 7] },
    ].map(({ key, label, unit, values }) => {
      const value = goals[key] || 0;
      const choices = [...new Set([0, ...values, value])].sort((a, b) => a - b);
      return { key, label, index: choices.indexOf(value),
        options: choices.map((value) => ({ value, label: value ? `${value} ${unit}` : "不设置" })) };
    });
    this.setData({ goalsForm: { ...goals, strengthDays: goals.strengthDays || 0 }, goalFields });
  },
  switchTab(event) {
    if (this.data.editExerciseIndex >= 0) this.cancelExerciseEdit();
    this.refreshDate(); this.setData({ tab: event.currentTarget.dataset.tab, error: "", notice: "" }, () => this.drawRings());
    if (this.data.tab === "settings" && this.state) this.fillGoals();
  },
  chooseDate(event) {
    const selected = event.detail.value;
    if (!validDate(selected) || selected > dateKey()) return;
    this.setData({ selected, error: "", notice: "", feedbackKind: "", waterInput: "", minutesInput: "", editExerciseIndex: -1, details: { water: false, sleep: false, exercise: false } }); this.render(); this.fillSleep();
  },
  openDay(event) {
    const date = event.detail?.value || event.currentTarget.dataset.date;
    if (!validDate(date) || date > dateKey()) return;
    this.chooseDate({ detail: { value: date } }); this.setData({ tab: "today" }, () => this.drawRings());
  },
  goToday() { this.chooseDate({ detail: { value: dateKey() } }); },
  input(event) {
    const key = event.currentTarget.dataset.key;
    if (["waterInput", "sleepInput", "minutesInput"].includes(key)) this.setData({ [key]: event.detail.value, error: "", notice: "" });
  },
  chooseGoal(event) {
    const key = event.currentTarget.dataset.key;
    const field = this.data.goalFields.find((item) => item.key === key);
    const index = Number(event.detail.value);
    if (!field || !Number.isInteger(index) || !field.options[index]) return;
    this.setData({ goalsForm: { ...this.data.goalsForm, [key]: field.options[index].value },
      goalFields: this.data.goalFields.map((item) => item.key === key ? { ...item, index } : item), error: "", notice: "" });
  },
  chooseType(event) { this.setData({ typeIndex: Number(event.detail.value) }); },
  chooseFeeling(event) {
    const index = Number(event.detail.value);
    if (Number.isInteger(index) && FEELINGS[index]) this.setData({ feelingIndex: index });
  },
  chooseCup(event) {
    const index = Number(event.detail.value);
    if (!this.state || !Number.isInteger(index) || !CUPS[index]) return;
    this.commit({ ...this.state, preferences: { cup: CUPS[index] } }, "常用杯容量已保存");
  },
  addCup() { this.addWater({ currentTarget: { dataset: { amount: this.data.cup } } }); },
  planDay(event) { this.change("plan", event.currentTarget.dataset.plan, event.currentTarget.dataset.plan === "rest" ? "恢复也是安排，不用补一个训练任务。" : "今天想练一练，完成后再记下。", "exercise"); },
  windDown() {
    this.refreshDate();
    if (this.data.selected !== this.data.today) return;
    this.change("windDown", !this.data.day.windDown, this.data.day.windDown ? "已撤销睡前准备，不影响睡眠记录。" : "睡前准备记下了。放下手机，晚安。", "sleep");
  },
  showError(message) {
    this.setData({ error: message, notice: "" });
    wx.pageScrollTo({ scrollTop: 0, duration: 0 });
  },
  commit(next, notice, celebrate = false, feedbackKind = "") {
    if (celebrate) next = { ...next, celebratedOn: this.data.selected };
    if (!saveHabits(next)) { this.showError("未能保存，这次操作没有生效。请重试。"); return false; }
    this.state = next; this.render(); this.setData({ error: "", notice, feedbackKind });
    if (celebrate) this.openCelebration();
    else wx.showToast({ title: notice, icon: "none" });
    return true;
  },
  change(action, value, notice, feedbackKind = "") {
    if (!this.state) return false;
    this.refreshDate();
    try {
      const selected = this.data.selected;
      const next = updateDay(this.state, selected, action, value);
      const celebrate = ["water", "sleep"].includes(action) && selected === dateKey() && next.celebratedOn !== selected &&
        !dailyAchievement(this.state, selected).complete && dailyAchievement(next, selected).complete;
      return this.commit(next, notice, celebrate, feedbackKind);
    }
    catch (error) { this.showError(error.message); return false; }
  },
  addWater(event) {
    const value = event.currentTarget.dataset.amount || parseNumber(this.data.waterInput, 1, 2000, true);
    if (this.change("water", Number(value), `这一杯，记下了。${value} ml 已保存。`, "water")) this.setData({ waterInput: "" });
  },
  undoWater() { this.change("undoWater", null, "已撤销最后一杯"); },
  saveSleep() {
    this.refreshDate();
    const value = parseNumber(this.data.sleepInput, 0.1, 24);
    if (value === null) { this.showError("请填写 0.1–24 小时的睡眠时长"); return; }
    if (this.change("sleep", { hours: value, feeling: FEELINGS[this.data.feelingIndex] }, "昨晚的睡眠已记下。照实记录，就很好。", "sleep")) {
      this.fillSleep(); this.setData({ details: { ...this.data.details, sleep: false } });
    }
  },
  addExercise() {
    const editing = this.data.editExerciseIndex >= 0;
    this.refreshDate();
    if (editing && this.data.editExerciseIndex < 0) { this.showError("日期已更新，未保存修改。请重新选择记录。"); return; }
    const value = { type: TYPES[this.data.typeIndex], minutes: parseNumber(this.data.minutesInput, 1, 720, true), index: this.data.editExerciseIndex };
    if (this.change(editing ? "editExercise" : "exercise", value, editing ? "运动记录已更新，周统计已同步。" : "这次运动，记下了。也给恢复留点时间。", "exercise")) {
      this.setData({ minutesInput: "", editExerciseIndex: -1, details: { ...this.data.details, exercise: editing } });
    }
  },
  editExercise(event) {
    if (!this.state || this.data.editExerciseIndex >= 0) return;
    const selected = this.data.selected;
    this.refreshDate();
    if (selected !== this.data.selected) return;
    const index = Number(event.currentTarget.dataset.index);
    const record = Number.isInteger(index) && dayData(this.state, selected).exercise[index];
    if (!record) { this.showError("这条记录已不存在，请重新选择"); return; }
    this.setData({ editExerciseIndex: index, typeIndex: TYPES.indexOf(record.type), minutesInput: String(record.minutes),
      details: { ...this.data.details, exercise: true }, error: "", notice: "" },
    () => wx.pageScrollTo({ selector: "#exercise-editor", duration: 200 }));
  },
  cancelExerciseEdit() {
    this.setData({ editExerciseIndex: -1, minutesInput: "", typeIndex: 0, error: "", notice: "" });
  },
  removeExercise(event) {
    if (this.data.editExerciseIndex >= 0) return;
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
    this.commit({ ...this.state, goals: { ...this.data.goalsForm } }, "目标已保存");
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
  openJournal() { wx.navigateTo({ url: `/pages/journal/journal?date=${this.data.selected}` }); },
  openCelebration() {
    if (!this.state) return;
    this.refreshDate();
    const today = dateKey();
    const achievement = dailyAchievement(this.state, today);
    if (!achievement.complete || this.data.selected !== today) return;
    const day = dayData(this.state, today);
    const strength = goalProgress(this.state, today).find((item) => item.id === "strength");
    const exercise = {
      minutes: summary(this.state, today).minutes,
      detail: TYPES.filter((type) => day.exercise.some((item) => item.type === type))
        .map((type) => `${type} ${day.exercise.filter((item) => item.type === type).reduce((sum, item) => sum + item.minutes, 0)} 分钟`).join(" · "),
      strengthText: strength.valueText,
      strengthStatus: !strength.goal ? "未设周目标" : strength.percent >= 100 ? "周目标已达成" : "按周积累",
      restPlanned: day.plan === "rest",
    };
    wx.hideKeyboard();
    wx.hideTabBar({ animation: false });
    this.setData({ celebrationOpen: true, celebrationDate: today, celebrationGoals: achievement.goals, celebrationExercise: exercise,
      celebrationScrollHeight: Math.max(160, Math.min(448, wx.getWindowInfo().windowHeight - 200)) });
  },
  closeCelebration() {
    if (!this.data.celebrationOpen) return;
    this.setData({ celebrationOpen: false }, () => this.drawRings());
    wx.showTabBar({ animation: false });
  },
  keepCelebrationOpen() {},
  onShareAppMessage(event) {
    if (event?.from === "button" && this.state && this.data.selected === dateKey() &&
      dailyAchievement(this.state, dateKey()).complete) {
      const share = celebrationShare();
      return { ...share, imageUrl: this.celebrationImage || share.imageUrl };
    }
    return scenarioShare("habits");
  },
  onShareTimeline() { const share = scenarioShare("habits"); return { title: share.title, imageUrl: share.imageUrl }; },
});
