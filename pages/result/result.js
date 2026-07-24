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
const { buildSharePath, enableShareMenu } = require("../../utils/share");

function formatWanDifference(value) {
  const prefix = value >= 0 ? "+" : "−";
  return `${prefix}${(Math.abs(value) / 10000).toFixed(1)}万`;
}

function formatHourlyDifference(value) {
  const rounded = Math.round(Math.abs(value));
  return `${value >= 0 ? "+" : "−"}${rounded}/时`;
}

function formatOptionalMoney(value) {
  return value === null ? "未填" : formatMoney(value);
}

function formatOptionalRate(value) {
  if (value === null) return "未填";
  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
}

function formatOptionalAnnual(value) {
  if (value === null) return "未计算";
  return value >= 10000 ? formatWan(value) : formatMoney(value);
}

function createInsightRows(analysis) {
  const current = analysis.current;
  const annualLeader = analysis.annualLeaders[0];
  const hourlyLeader = analysis.hourlyLeaders[0];
  const occupiedDelta = current.totalHours - hourlyLeader.totalHours;

  return [
    {
      id: "annual",
      label: `${annualLeader.title} 综合价值`,
      value: formatWanDifference(
        annualLeader.totalAnnualValue - current.totalAnnualValue,
      ),
      tone: "blue",
    },
    {
      id: "hourly",
      label: `${hourlyLeader.title} 综合时薪`,
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
    benefitRows: [],
    hasBenefits: false,
    insightRows: [],
    breakEven: null,
    hasBreakEven: false,
  },

  onLoad() {
    enableShareMenu();
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
      totalAnnualValueText: formatWan(item.totalAnnualValue),
      guaranteedAnnualText: formatWan(item.guaranteedAnnual),
      hourlyText: formatMoney(item.hourlyValue),
      workHoursText: formatHours(item.totalHours),
      commuteHoursText: formatHours(item.annualCommuteHours),
      socialInsuranceBaseText: formatOptionalMoney(item.socialInsuranceBase),
      housingFundBaseText: formatOptionalMoney(item.housingFundBase),
      employerHousingFundRateText: formatOptionalRate(
        item.employerHousingFundRate,
      ),
      employerHousingFundAnnualText: formatOptionalAnnual(
        item.employerHousingFundAnnual,
      ),
      annualLeader: analysis.annualLeaders.some((leader) => leader.id === item.id),
      hourlyLeader: analysis.hourlyLeaders.some((leader) => leader.id === item.id),
    }));

    const comparisonRows = [
      {
        metric: "annual",
        label: "年综合价值",
        cells: resultCards.map((item) => ({
          id: item.id,
          value: item.totalAnnualValueText,
          highlighted: item.annualLeader,
          a11yLabel: `${item.title}，年综合价值，${item.totalAnnualValueText}`,
        })),
      },
      {
        metric: "cash",
        label: "税前保证收入",
        cells: resultCards.map((item) => ({
          id: item.id,
          value: item.guaranteedAnnualText,
          highlighted: false,
          a11yLabel: `${item.title}，税前保证收入，${item.guaranteedAnnualText}`,
        })),
      },
      {
        metric: "hourly",
        label: "综合时薪",
        cells: resultCards.map((item) => ({
          id: item.id,
          value: `${item.hourlyText}/时`,
          highlighted: item.hourlyLeader,
          a11yLabel: `${item.title}，综合时薪，${item.hourlyText}每小时`,
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
    const benefitRows = [
      {
        metric: "social-insurance-base",
        label: "五险基数",
        cells: resultCards.map((item) => ({
          id: item.id,
          value: item.socialInsuranceBaseText,
          a11yLabel: `${item.title}，五险缴费基数，${item.socialInsuranceBaseText}`,
        })),
      },
      {
        metric: "housing-fund-base",
        label: "公积金基数",
        cells: resultCards.map((item) => ({
          id: item.id,
          value: item.housingFundBaseText,
          a11yLabel: `${item.title}，公积金缴存基数，${item.housingFundBaseText}`,
        })),
      },
      {
        metric: "housing-fund-rate",
        label: "公司比例",
        cells: resultCards.map((item) => ({
          id: item.id,
          value: item.employerHousingFundRateText,
          a11yLabel: `${item.title}，公司公积金比例，${item.employerHousingFundRateText}`,
        })),
      },
      {
        metric: "housing-fund-annual",
        label: "公司年缴",
        cells: resultCards.map((item) => ({
          id: item.id,
          value: item.employerHousingFundAnnualText,
          a11yLabel: `${item.title}，公司公积金年缴存，${item.employerHousingFundAnnualText}`,
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
        ? `${annualLeaderText}，综合价值和时间回报都领先`
        : `${annualLeaderText} 综合价值更高，${hourlyLeaderText} 时间回报更高`;

    this.setData({
      empty: false,
      headline: analysis.headline,
      summaryTitle,
      resultCards,
      comparisonTitle: `${results.length === 3 ? "三方" : "两方"}对比`,
      comparisonRows,
      benefitRows,
      hasBenefits: resultCards.some((item) => item.hasBenefitData),
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
      path: buildSharePath("result"),
    };
  },

  onShareTimeline() {
    return {
      title: this.data.headline || "真涨薪｜Offer 真实价值对比",
      query: "source=timeline_result",
    };
  },
});
