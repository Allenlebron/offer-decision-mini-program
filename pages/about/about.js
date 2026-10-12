const { SOURCES, METHOD_NOTES, CONTENT_NOTICE, PRIVACY_SECTIONS, getPublicSourceUrl } = require("../../utils/decision-sources");
const { clearAllData } = require("../../utils/decision-storage");
const { enableShareMenu, scenarioShare } = require("../../utils/share");
Page({
  data: { sources: SOURCES, methods: METHOD_NOTES, contentNotice: CONTENT_NOTICE, privacy: PRIVACY_SECTIONS },
  onLoad() { enableShareMenu(); },
  copySource(event) {
    const data = getPublicSourceUrl(event.currentTarget.dataset.id);
    if (!data) return;
    wx.setClipboardData({ data, fail: () => wx.showToast({ title: "复制失败，请稍后重试", icon: "none" }) });
  },
  clearData() {
    wx.showModal({ title: "清除全部本机数据？", content: "将删除 Offer、租房通勤、空窗期预算的草稿和结果，无法恢复。", confirmText: "全部清除", confirmColor: "#A12F39", success: (result) => {
      if (!result.confirm) return;
      if (!clearAllData()) { wx.showToast({ title: "部分数据未清除，请重试", icon: "none" }); return; }
      wx.reLaunch({ url: "/pages/home/home" });
    } });
  },
  goHome() { wx.reLaunch({ url: "/pages/home/home" }); },
  onShareAppMessage() { return scenarioShare(); },
  onShareTimeline() { const share = scenarioShare(); return { title: share.title, imageUrl: share.imageUrl }; },
});
