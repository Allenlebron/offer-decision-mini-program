const { SCENARIOS, EXAMPLES, createDraft, validateDecision, validateDecisionField } = require("../../utils/decision-data");
const { readDraft, saveDraft, clearDraft } = require("../../utils/decision-storage");
const { enableShareMenu, scenarioShare } = require("../../utils/share");

Page({
  data: { scenario: "", title: "", description: "", values: {}, fields: [], steps: [], step: 0, errors: {}, isExample: false, storageNotice: "", generalError: "", submitting: false, focusKey: "" },
  onLoad(options = {}) {
    const scenario = options.scenario === "budget" ? "budget" : "rent";
    const definition = SCENARIOS[scenario];
    const saved = readDraft(scenario);
    this.setData({ scenario, title: definition.title, description: definition.description, steps: definition.steps,
      values: saved.draft ? saved.draft.values : createDraft(scenario), step: saved.draft ? saved.draft.step : 0,
      isExample: Boolean(saved.draft && saved.draft.example),
      storageNotice: saved.status === "corrupt" ? "原草稿无法恢复；填写新内容后会替换原草稿。" : saved.status === "unavailable" ? "无法读取本机草稿，可以继续填写并计算。" : "",
    });
    wx.setNavigationBarTitle({ title: definition.title });
    enableShareMenu();
    this.refreshFields();
  },
  refreshFields(callback) {
    this.setData({ fields: SCENARIOS[this.data.scenario].fields.filter((field) => field.step === this.data.step).map((field) => ({ ...field, value: this.data.values[field.key], error: this.data.errors[field.key] || "" })) }, callback);
  },
  persist() {
    const saved = saveDraft(this.data.scenario, this.data.values, this.data.isExample, this.data.step);
    this.setData({ storageNotice: saved ? "" : "本次未能保存；仍可计算，退出后可能丢失。" });
  },
  onInput(event) {
    const key = event.currentTarget.dataset.key;
    if (!SCENARIOS[this.data.scenario].fields.some((field) => field.key === key)) return;
    const errors = { ...this.data.errors }; delete errors[key];
    this.setData({ values: { ...this.data.values, [key]: event.detail.value }, errors, generalError: "" });
    this.refreshFields();
    this.persist();
  },
  onBlur(event) {
    const field = SCENARIOS[this.data.scenario].fields.find((item) => item.key === event.currentTarget.dataset.key);
    if (!field) return;
    const errors = { ...this.data.errors, [field.key]: validateDecisionField(this.data.values[field.key], field) };
    this.setData({ errors, focusKey: this.data.focusKey === field.key ? "" : this.data.focusKey }); this.refreshFields();
  },
  focusNext(event) {
    const index = this.data.fields.findIndex((field) => field.key === event.currentTarget.dataset.key);
    const next = this.data.fields[index + 1];
    if (index >= 0 && next) this.setData({ focusKey: next.key });
  },
  showErrors(errors) {
    const first = SCENARIOS[this.data.scenario].fields.find((field) => errors[field.key]);
    this.setData({ errors, step: first.step, generalError: "请检查标出的项目；没有金额或时间请填 0。" });
    this.refreshFields(() => wx.pageScrollTo({ selector: `#field-${first.key}`, duration: 0 }));
  },
  next() {
    if (this.data.submitting) return;
    const errors = validateDecision(this.data.scenario, this.data.values);
    if (this.data.step < this.data.steps.length - 1) {
      const currentErrors = {};
      this.data.fields.forEach((field) => { if (errors[field.key]) currentErrors[field.key] = errors[field.key]; });
      if (Object.keys(currentErrors).length) return this.showErrors(currentErrors);
      this.setData({ step: this.data.step + 1, errors: {}, generalError: "" });
      this.refreshFields(); this.persist(); wx.pageScrollTo({ scrollTop: 0, duration: 0 });
      return;
    }
    if (Object.keys(errors).length) return this.showErrors(errors);
    this.persist(); this.setData({ submitting: true });
    wx.navigateTo({ url: `/pages/decision-result/decision-result?scenario=${this.data.scenario}`,
      fail: () => wx.showToast({ title: "页面未打开，请再试一次", icon: "none" }),
      complete: () => this.setData({ submitting: false }),
    });
  },
  previous() {
    if (!this.data.step) return;
    this.setData({ step: this.data.step - 1, generalError: "" }); this.refreshFields(); this.persist();
    wx.pageScrollTo({ scrollTop: 0, duration: 0 });
  },
  fillExample() {
    const apply = () => { this.setData({ values: { ...EXAMPLES[this.data.scenario] }, step: 0, isExample: true, errors: {}, generalError: "" }); this.refreshFields(); this.persist(); wx.pageScrollTo({ scrollTop: 0, duration: 0 }); };
    if (!Object.values(this.data.values).some((value) => value !== "")) return apply();
    wx.showModal({ title: "用示例覆盖当前内容？", content: "只替换当前场景，其他场景保持不变。", confirmText: "使用示例", success: (result) => { if (result.confirm) apply(); } });
  },
  reset() {
    wx.showModal({ title: "重新填写当前场景？", content: "将清除本场景草稿，其他场景不受影响。", confirmText: "重新填写", success: (result) => {
      if (!result.confirm) return;
      if (!clearDraft(this.data.scenario)) { wx.showToast({ title: "清除失败，内容已保留", icon: "none" }); return; }
      this.setData({ values: createDraft(this.data.scenario), step: 0, isExample: false, errors: {}, generalError: "", storageNotice: "" }); this.refreshFields();
      wx.pageScrollTo({ scrollTop: 0, duration: 0 });
    } });
  },
  goHome() { wx.reLaunch({ url: "/pages/home/home" }); },
  onShareAppMessage() { return scenarioShare(this.data.scenario); },
  onShareTimeline() { const share = scenarioShare(this.data.scenario); return { title: share.title, query: `scenario=${this.data.scenario}`, imageUrl: share.imageUrl }; },
});
