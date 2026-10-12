const { calculateJob, analyzeResults } = require("../../utils/offer-analysis");
const {
  formatMoney,
  formatWan,
  formatHours,
} = require("../../utils/format");
const {
  getMetrics,
  updateMetrics,
} = require("../../utils/storage");
const { buildSharePath, enableShareMenu, OFFER_SHARE_TITLE, SHARE_IMAGE } = require("../../utils/share");
const { loadOfferResult } = require("../../utils/offer-session");
const { clearAllData } = require("../../utils/decision-storage");

function formatWanDifference(value) {
  const prefix = value >= 0 ? "+" : "−";
  if (Math.abs(value) < 1000) return `${prefix}${Math.abs(value).toLocaleString("en-US", { maximumFractionDigits: 2 })}元`;
  return `${prefix}${(Math.abs(value) / 10000).toFixed(1)}万`;
}

function formatHourlyDifference(value) {
  if (Math.abs(value) < 1 && value !== 0) return `${value >= 0 ? "+" : "−"}不足1元/时`;
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
  if (value === null) return "未计入";
  return value >= 10000 ? formatWan(value) : formatMoney(value);
}

function createInsightRows(analysis) {
  const current = analysis.current;
  const annualLeader = analysis.annualLeaders[0];
  const hourlyLeader = analysis.hourlyLeaders[0];
  const occupiedDelta = current.totalHours - hourlyLeader.totalHours;

  const rows = [];
  if (annualLeader.id !== current.id) {
    rows.push({
      id: "annual",
      label: `${annualLeader.title} 综合价值`,
      value: formatWanDifference(
        annualLeader.totalAnnualValue - current.totalAnnualValue,
      ),
      tone: "blue",
    });
  }
  if (hourlyLeader.id !== current.id) {
    rows.push({
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
      value: occupiedDelta === 0 ? "与当前相同" : `${occupiedDelta > 0 ? "少" : "多"}${Math.abs(occupiedDelta) < 1 ? "不足1" : Math.abs(Math.round(occupiedDelta))}小时`,
      tone: "amber",
    });
  }
  return rows;
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
    storageNotice: "",
  },

  onLoad(options = {}) {
    if (options.source === "timeline_result") { wx.redirectTo({ url: "/pages/calculator/calculator" }); return; }
    enableShareMenu();
    this.loadResult();
  },

  onShow() {
    this.loadResult();
  },

  loadResult() {
    const payload = loadOfferResult();
    if (!payload) {
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
      annualLeaderLabel: analysis.annualLeaders.length === results.length ? "价值持平" : analysis.annualLeaders.length > 1 ? "价值并列" : "价值领先",
      hourlyLeaderLabel: analysis.hourlyLeaders.length === results.length ? "时薪持平" : analysis.hourlyLeaders.length > 1 ? "时薪并列" : "时薪领先",
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
    let summaryTitle =
      analysis.annualLeaders.length === results.length && analysis.hourlyLeaders.length === results.length
        ? "已填写项目的综合价值和综合时薪持平"
        : annualLeaderText === hourlyLeaderText
        ? `${annualLeaderText}，综合价值和时间回报都领先`
        : `${annualLeaderText} 综合价值更高，${hourlyLeaderText} 时间回报更高`;
    if (analysis.hasMissingHousingFund) {
      summaryTitle = `按已填写项目比较：${summaryTitle}。部分公司公积金未计入。`;
    }

    this.setData({
      empty: false,
      isExample: Boolean(payload.example),
      storageNotice: payload.saved === false ? "草稿与结果未保存完整，退出微信后可能无法恢复。" : "",
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
      content: "会删除 Offer、租房通勤、空窗期预算的本机草稿与结果。此操作无法撤销。",
      confirmText: "清除数据",
      confirmColor: "#A12F39",
      cancelText: "保留数据",
      success: ({ confirm }) => {
        if (!confirm) return;
        if (!clearAllData()) {
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
      title: OFFER_SHARE_TITLE,
      path: buildSharePath("result"),
      imageUrl: SHARE_IMAGE,
    };
  },

  onShareTimeline() {
    return {
      title: "真涨薪｜Offer 真实价值对比",
      query: "source=timeline_result",
      imageUrl: SHARE_IMAGE,
    };
  },
});
