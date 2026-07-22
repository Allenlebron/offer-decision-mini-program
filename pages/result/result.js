const { calculateJob, analyzeResults } = require("../../utils/offer-analysis");
const { validateJobs, isValidDraft } = require("../../utils/offer-validation");
const {
  formatMoney,
  formatWan,
  formatHours,
} = require("../../utils/format");
const {
  DRAFT_KEY,
  RESULT_KEY,
  METRICS_KEY,
  getMetrics,
  updateMetrics,
} = require("../../utils/storage");

function formatWanDifference(value) {
  const prefix = value >= 0 ? "+" : "−";
  return `${prefix}${(Math.abs(value) / 10000).toFixed(1)}万`;
}

function formatHourlyDifference(value) {
  const rounded = Math.round(Math.abs(value));
  return `${value >= 0 ? "+" : "−"}${rounded}/时`;
}

function createInsightRows(analysis) {
  const current = analysis.current;
  const annualLeader = analysis.annualLeaders[0];
  const hourlyLeader = analysis.hourlyLeaders[0];
  const occupiedDelta = current.totalHours - hourlyLeader.totalHours;

  return [
    {
      id: "annual",
      label: `${annualLeader.title} 年收入`,
      value: formatWanDifference(
        annualLeader.guaranteedAnnual - current.guaranteedAnnual,
      ),
      tone: "blue",
    },
    {
      id: "hourly",
      label: `${hourlyLeader.title} 有效时薪`,
      value: formatHourlyDifference(
        hourlyLeader.hourlyValue - current.hourlyValue,
      ),
      tone: "blue",
    },
    {
      id: "occupied",
      label: `${hourlyLeader.title} 年度占用`,
      value: `${occupiedDelta >= 0 ? "少" : "多"}${Math.abs(
        Math.round(occupiedDelta),
      )}小时`,
      tone: "amber",
    },
  ];
}

Page({
  data: {
    empty: false,
    headline: "",
    summaryTitle: "",
    resultCards: [],
    comparisonTitle: "两方对比",
    comparisonRows: [],
    insightRows: [],
    breakEven: null,
    hasBreakEven: false,
  },

  onLoad() {
    this.loadResult();
  },

  loadResult() {
    let payload;
    try {
      payload = wx.getStorageSync(RESULT_KEY);
    } catch (_error) {
      payload = null;
    }

    if (
      !payload ||
      !isValidDraft(payload.jobs) ||
      Object.keys(validateJobs(payload.jobs)).length > 0
    ) {
      this.setData({ empty: true });
      return;
    }

    const results = payload.jobs.map(calculateJob);
    const analysis = analyzeResults(results);
    const resultCards = results.map((item) => ({
      ...item,
      annualText: formatWan(item.guaranteedAnnual),
      hourlyText: formatMoney(item.hourlyValue),
      workHoursText: formatHours(item.totalHours),
      commuteHoursText: formatHours(item.annualCommuteHours),
      annualLeader: analysis.annualLeaders.some((leader) => leader.id === item.id),
      hourlyLeader: analysis.hourlyLeaders.some((leader) => leader.id === item.id),
    }));

    const comparisonRows = [
      {
        metric: "annual",
        label: "保证年收入",
        cells: resultCards.map((item) => ({
          id: item.id,
          value: item.annualText,
          highlighted: item.annualLeader,
          a11yLabel: `${item.title}，保证年收入，${item.annualText}`,
        })),
      },
      {
        metric: "hourly",
        label: "有效时薪",
        cells: resultCards.map((item) => ({
          id: item.id,
          value: `${item.hourlyText}/时`,
          highlighted: item.hourlyLeader,
          a11yLabel: `${item.title}，有效时薪，${item.hourlyText}每小时`,
        })),
      },
      {
        metric: "occupied",
        label: "年度占用",
        cells: resultCards.map((item) => ({
          id: item.id,
          value: item.workHoursText,
          highlighted: false,
          a11yLabel: `${item.title}，年度占用，${item.workHoursText}`,
        })),
      },
      {
        metric: "commute",
        label: "通勤",
        cells: resultCards.map((item) => ({
          id: item.id,
          value: item.commuteHoursText,
          highlighted: false,
          a11yLabel: `${item.title}，年度通勤，${item.commuteHoursText}`,
        })),
      },
    ];

    let breakEven = null;
    if (analysis.breakEven) {
      breakEven = {
        winnerTitle: analysis.breakEven.winner.title,
        challengerTitle: analysis.breakEven.challenger.title,
        extraBonusMonths: analysis.breakEven.extraBonusMonths.toFixed(1),
        weeklyHoursReduction:
          analysis.breakEven.weeklyHoursReduction === null
            ? null
            : analysis.breakEven.weeklyHoursReduction.toFixed(1),
      };
    }

    this.analysis = analysis;
    const annualLeaderText = analysis.annualLeaders
      .map((item) => item.title)
      .join(" / ");
    const hourlyLeaderText = analysis.hourlyLeaders
      .map((item) => item.title)
      .join(" / ");
    const summaryTitle =
      annualLeaderText === hourlyLeaderText
        ? `${annualLeaderText}，收入和时间回报都领先`
        : `${annualLeaderText} 收入更高，${hourlyLeaderText} 时间回报更高`;

    this.setData({
      empty: false,
      headline: analysis.headline,
      summaryTitle,
      resultCards,
      comparisonTitle: `${results.length === 3 ? "三方" : "两方"}对比`,
      comparisonRows,
      insightRows: createInsightRows(analysis),
      breakEven,
      hasBreakEven: Boolean(breakEven),
    });
  },

  editConditions() {
    const pages = getCurrentPages();
    if (pages.length > 1) wx.navigateBack();
    else wx.reLaunch({ url: "/pages/calculator/calculator" });
  },

  openBreakEven() {
    if (!this.data.hasBreakEven) {
      wx.showToast({ title: "当前结果没有可计算的反超条件", icon: "none" });
      return;
    }
    wx.navigateTo({ url: "/pages/breakeven/breakeven" });
  },

  backToCalculator() {
    wx.reLaunch({ url: "/pages/calculator/calculator" });
  },

  clearLocalData() {
    wx.showModal({
      title: "清除本机数据？",
      content: "会删除输入草稿和最近一次计算结果。",
      confirmText: "清除数据",
      confirmColor: "#A12F39",
      cancelText: "保留数据",
      success: ({ confirm }) => {
        if (!confirm) return;
        try {
          wx.removeStorageSync(DRAFT_KEY);
          wx.removeStorageSync(RESULT_KEY);
          wx.removeStorageSync(METRICS_KEY);
        } catch (_error) {
          wx.showToast({ title: "数据未完全清除，请重试", icon: "none" });
          return;
        }
        wx.reLaunch({ url: "/pages/calculator/calculator" });
      },
    });
  },

  onShareAppMessage() {
    const metrics = getMetrics();
    updateMetrics({ shares: metrics.shares + 1 });
    return {
      title: this.data.headline || "这次跳槽，真的涨薪了吗？",
      path: "/pages/calculator/calculator",
    };
  },

  onShareTimeline() {
    return {
      title: this.data.headline || "真涨薪｜Offer 真实价值对比",
    };
  },
});
