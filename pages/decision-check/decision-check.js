const { CHECKS, CHECK_KEYS, CHECK_STATUSES, isCheckScenario, emptyChecks, readChecks, saveChecks } = require("../../utils/decision-checks");
const { SOURCES, getPublicSourceUrl } = require("../../utils/decision-sources");
const { enableShareMenu, SHARE_IMAGE } = require("../../utils/share");

Page({
  data: { scenario: "offer", topics: Object.values(CHECKS).map((item) => item.title), topicIndex: 0, statuses: CHECK_STATUSES, items: [], checked: 0, skipped: 0, notice: "", tool: "", source: SOURCES[0] },
  onLoad(options = {}) {
    this.setData({ scenario: isCheckScenario(options.scenario) ? options.scenario : "offer" });
    enableShareMenu();
  },
  onShow() { this.restore(); },
  restore() {
    const saved = readChecks(this.data.scenario);
    this.values = saved.values;
    this.blocked = Boolean(saved.blocked);
    this.setData({ notice: saved.notice }); this.refresh();
  },
  refresh() {
    const definition = CHECKS[this.data.scenario];
    this.setData({ topicIndex: Object.keys(CHECKS).indexOf(this.data.scenario), tool: definition.tool,
      items: definition.items.map((item) => ({ ...item, status: this.values[item.id] })),
      checked: Object.values(this.values).filter((value) => value === 1).length,
      skipped: Object.values(this.values).filter((value) => value === 2).length,
    });
  },
  changeTopic(event) {
    const scenario = Object.keys(CHECKS)[Number(event.detail.value)];
    if (!scenario) return;
    this.setData({ scenario }); this.restore(); wx.pageScrollTo({ scrollTop: 0, duration: 0 });
  },
  changeStatus(event) {
    const id = event.currentTarget.dataset.id;
    const value = Number(event.detail.value);
    if (!CHECKS[this.data.scenario].items.some((item) => item.id === id) || !Number.isInteger(value) || value < 0 || value >= CHECK_STATUSES.length) return;
    if (this.blocked) { this.setData({ notice: "原核对记录不可用，未覆盖。请先确认开始新一轮核对，或重新进入本页重试读取。" }); return; }
    const values = { ...this.values, [id]: value };
    if (!saveChecks(this.data.scenario, values)) { this.setData({ notice: "状态未能保存，原记录保持不变。请重试。" }); return; }
    this.values = values; this.setData({ notice: "" }); this.refresh();
  },
  startAgain() {
    wx.showModal({ title: "开始新一轮核对？", content: "只清除当前场景的核对状态，计算草稿和其他场景保持不变。", confirmText: "重新核对", success: ({ confirm }) => {
      if (!confirm) return;
      try { wx.removeStorageSync(CHECK_KEYS[this.data.scenario]); }
      catch (_error) { this.setData({ notice: "未能清除，原核对状态已保留。" }); return; }
      this.blocked = false; this.values = emptyChecks(this.data.scenario); this.setData({ notice: "" }); this.refresh();
    } });
  },
  openTool() { wx.navigateTo({ url: CHECKS[this.data.scenario].path }); },
  openHabits() { wx.switchTab({ url: "/pages/habits/habits" }); },
  openAbout() { wx.navigateTo({ url: "/pages/about/about" }); },
  copySource() { wx.setClipboardData({ data: getPublicSourceUrl("article"), fail: () => wx.showToast({ title: "复制失败，请重试", icon: "none" }) }); },
  onShareAppMessage() { return { title: "做决定前，看看还有什么没问清", path: `/pages/decision-check/decision-check?scenario=${this.data.scenario}`, imageUrl: SHARE_IMAGE }; },
  onShareTimeline() { return { title: "做决定前，看看还有什么没问清", query: `scenario=${this.data.scenario}`, imageUrl: SHARE_IMAGE }; },
});
