const SHARE_ENTRY_PATH = "/pages/calculator/calculator";
const OFFER_SHARE_TITLE = "这次跳槽，真的涨薪了吗？";
const SHARE_IMAGE = "/images/share-entry.png";

function scenarioShare(scenario) {
  const entries = {
    habits: { title: "喝水、睡眠、运动，按自己的节奏记录", path: "/pages/habits/habits" },
    rent: { title: "住近一点值不值？算算房租与通勤", path: "/pages/decision/decision?scenario=rent" },
    budget: { title: "暂时不工作，现有预算能覆盖多久？", path: "/pages/decision/decision?scenario=budget" },
  };
  return { ...(entries[scenario] || { title: "真涨薪｜算清工作与生活的取舍", path: "/pages/home/home" }), imageUrl: SHARE_IMAGE };
}

function buildSharePath(source) {
  return `${SHARE_ENTRY_PATH}?source=${encodeURIComponent(source)}`;
}

function enableShareMenu() {
  if (typeof wx.showShareMenu !== "function") return;
  wx.showShareMenu({
    menus: ["shareAppMessage", "shareTimeline"],
  });
}

module.exports = {
  buildSharePath,
  enableShareMenu,
  OFFER_SHARE_TITLE,
  SHARE_IMAGE,
  scenarioShare,
};
