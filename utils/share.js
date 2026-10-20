const SHARE_ENTRY_PATH = "/pages/calculator/calculator";
const OFFER_SHARE_TITLE = "这次跳槽，真的涨薪了吗？";
const SHARE_IMAGE = "/images/share-entry.png";

function scenarioShare(scenario) {
  const entries = {
    habits: { title: "薄肌、大水、大睡，把生活过得更有劲", path: "/pages/habits/habits", imageUrl: "/images/share-habits.png" },
    rent: { title: "住近一点值不值？算算房租与通勤", path: "/pages/decision/decision?scenario=rent" },
    budget: { title: "暂时不工作，现有预算能覆盖多久？", path: "/pages/decision/decision?scenario=budget" },
    study: { title: "学习投入：算清费用、时间和回本条件", path: "/pages/decision/decision?scenario=study" },
    purchase: { title: "买、租、继续用，同周期算成本", path: "/pages/decision/decision?scenario=purchase" },
    city: { title: "换城市生活：比较月结余与迁居支出", path: "/pages/decision/decision?scenario=city" },
    side: { title: "副业尝试：先算清一单能留下多少", path: "/pages/decision/decision?scenario=side" },
  };
  const entry = Object.prototype.hasOwnProperty.call(entries, scenario) ? entries[scenario] : { title: "真涨薪｜算清工作与生活的取舍", path: "/pages/home/home" };
  return { imageUrl: SHARE_IMAGE, ...entry };
}

function buildSharePath(source) {
  return `${SHARE_ENTRY_PATH}?source=${encodeURIComponent(source)}`;
}

function celebrationShare() {
  return { title: "今天的小目标完成了，一起照顾好自己", path: "/pages/habits/habits", imageUrl: "/images/share-celebration.png" };
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
  celebrationShare,
};
