const { SCENARIOS, isDecisionScenario, validateDecision } = require("../../utils/decision-data");
const { isCheckScenario } = require("../../utils/decision-checks");
const { readDraft } = require("../../utils/decision-storage");
const { presentDecision } = require("../../utils/decision-presentation");
const { enableShareMenu, scenarioShare } = require("../../utils/share");

Page({
  data: { scenario: "rent", empty: true, result: null, isExample: false, storageNotice: "", showMethod: false },
  onLoad(options = {}) {
    const scenario = isDecisionScenario(options.scenario) ? options.scenario : "rent";
    this.setData({ scenario, hasChecks: isCheckScenario(scenario) });
    if (options.source === "timeline") { wx.redirectTo({ url: `/pages/decision/decision?scenario=${this.data.scenario}` }); return; }
    wx.setNavigationBarTitle({ title: SCENARIOS[scenario].resultTitle });
    enableShareMenu();
  },
  inputPage() {
    const pages = getCurrentPages();
    const previous = pages[pages.length - 2];
    return previous && previous.data.scenario === this.data.scenario && previous.data.values && typeof previous.refreshFields === "function" ? previous : null;
  },
  onShow() {
    // Read the current inputs, not a stored result. A preceding form also keeps
    // this calculation usable if device storage is unavailable or full.
    const input = this.inputPage();
    const saved = input ? null : readDraft(this.data.scenario).draft;
    const values = input ? input.data.values : saved && saved.values;
    if (!values || Object.keys(validateDecision(this.data.scenario, values)).length) {
      this.setData({ empty: true, result: null }); return;
    }
    this.setData({ empty: false, result: presentDecision(this.data.scenario, values),
      isExample: input ? input.data.isExample : saved.example,
      storageNotice: input ? input.data.storageNotice : "",
    });
  },
  edit() {
    if (this.inputPage()) wx.navigateBack();
    else wx.redirectTo({ url: `/pages/decision/decision?scenario=${this.data.scenario}` });
  },
  toggleMethod() { this.setData({ showMethod: !this.data.showMethod }); },
  openAbout() { wx.navigateTo({ url: "/pages/about/about" }); },
  openChecks() { if (isCheckScenario(this.data.scenario)) wx.navigateTo({ url: `/pages/decision-check/decision-check?scenario=${this.data.scenario}` }); },
  goHome() { wx.reLaunch({ url: "/pages/home/home" }); },
  onShareAppMessage() { return scenarioShare(this.data.scenario); },
  onShareTimeline() { const share = scenarioShare(this.data.scenario); return { title: share.title, query: `scenario=${this.data.scenario}&source=timeline`, imageUrl: share.imageUrl }; },
});
