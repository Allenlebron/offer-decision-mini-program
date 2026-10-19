const { SCENARIOS } = require("../../utils/decision-data");
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
      ...["rent", "budget"].map((id) => ({ id, title: SCENARIOS[id].title, description: SCENARIOS[id].description, saved: readDraft(id).status === "ready" })),
    ] });
  },
  openScenario(event) {
    const id = event.currentTarget.dataset.id;
    if (id !== "offer" && !SCENARIOS[id]) return;
    wx.navigateTo({ url: id === "offer" ? "/pages/calculator/calculator" : `/pages/decision/decision?scenario=${id}` });
  },
  openAbout() { wx.navigateTo({ url: "/pages/about/about" }); },
  openHabits() { wx.navigateTo({ url: "/pages/habits/habits" }); },
  onShareAppMessage() { return scenarioShare(); },
  onShareTimeline() { const share = scenarioShare(); return { title: share.title, imageUrl: share.imageUrl }; },
});
