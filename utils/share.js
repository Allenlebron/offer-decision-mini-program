const SHARE_ENTRY_PATH = "/pages/calculator/calculator";

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
};
