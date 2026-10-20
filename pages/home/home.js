const { SCENARIOS, isDecisionScenario } = require("../../utils/decision-data");
const { readDraft } = require("../../utils/decision-storage");
const { restoreOfferDraft } = require("../../utils/offer-session");
const { enableShareMenu, scenarioShare } = require("../../utils/share");

Page({
  data: { entries: [] },
  onLoad() { enableShareMenu(); },
  onShow() {
    const offer = restoreOfferDraft();
    this.setData({ entries: [
      { id: "offer", title: "换工作怎么算", description: "把收入、公积金和占用的时间放在一起比较。", saved: Boolean(offer.jobs && offer.jobs.some((job) => job.monthlySalary)) },
      ...Object.keys(SCENARIOS).map((id) => ({ id, title: SCENARIOS[id].title, entryTitle: SCENARIOS[id].entryTitle, description: SCENARIOS[id].entryDescription, saved: readDraft(id).status === "ready" })),
    ] });
  },
  openScenario(event) {
    const id = event.currentTarget.dataset.id;
    if (id !== "offer" && !isDecisionScenario(id)) return;
    wx.navigateTo({ url: id === "offer" ? "/pages/calculator/calculator" : `/pages/decision/decision?scenario=${id}` });
  },
  openAbout() { wx.navigateTo({ url: "/pages/about/about" }); },
  openChecks() { wx.navigateTo({ url: "/pages/decision-check/decision-check?scenario=offer" }); },
  onShareAppMessage() { return scenarioShare(); },
  onShareTimeline() { const share = scenarioShare(); return { title: share.title, imageUrl: share.imageUrl }; },
});
