const { calculateJob, analyzeResults } = require("../../utils/offer-analysis");
const { validateJobs, isValidDraft } = require("../../utils/offer-validation");
const {
  formatMoney,
  formatWan,
  formatDelta,
  formatHours,
} = require("../../utils/format");
const {
  DRAFT_KEY,
  RESULT_KEY,
  METRICS_KEY,
  getMetrics,
  updateMetrics,
} = require("../../utils/storage");

const FEEDBACK_OPTIONS = ["补问 HR", "重新谈薪", "更确定原选择", "没有帮助"];

function optionColor(id) {
  return {
    current: "#74827B",
    offerA: "#79A6DF",
    offerB: "#A8C936",
  }[id];
}

function barWidth(value, maximum) {
  if (!maximum) return "8%";
  return `${Math.max(8, (value / maximum) * 100).toFixed(1)}%`;
}

Page({
  data: {
    empty: false,
    headline: "",
    resultCards: [],
    annualRows: [],
    hourlyRows: [],
    breakEven: null,
    feedbackOptions: [],
    selectedFeedback: "",
    receiptStatus: "",
    isCopying: false,
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
    const current = analysis.current;
    const annualMaximum = Math.max(...results.map((item) => item.guaranteedAnnual));
    const hourlyMaximum = Math.max(...results.map((item) => item.hourlyValue));
    const metrics = getMetrics();

    const resultCards = results.map((item) => ({
      ...item,
      color: optionColor(item.id),
      annualText: formatWan(item.guaranteedAnnual),
      hourlyText: formatMoney(item.hourlyValue),
      workHoursText: formatHours(item.totalHours),
      commuteHoursText: formatHours(item.annualCommuteHours),
      annualDelta:
        item.id === "current"
          ? "当前基准"
          : `年收入 ${formatDelta(item.guaranteedAnnual, current.guaranteedAnnual)}`,
      hourlyDelta:
        item.id === "current"
          ? ""
          : `有效时薪 ${formatDelta(item.hourlyValue, current.hourlyValue)}`,
      annualLeader: analysis.annualLeaders.some((leader) => leader.id === item.id),
      hourlyLeader: analysis.hourlyLeaders.some((leader) => leader.id === item.id),
    }));

    const annualRows = results.map((item) => ({
      id: item.id,
      title: item.title,
      color: optionColor(item.id),
      valueText: formatWan(item.guaranteedAnnual),
      width: barWidth(item.guaranteedAnnual, annualMaximum),
    }));
    const hourlyRows = results.map((item) => ({
      id: item.id,
      title: item.title,
      color: optionColor(item.id),
      valueText: `${Math.round(item.hourlyValue)}元`,
      width: barWidth(item.hourlyValue, hourlyMaximum),
    }));

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
    this.setData({
      empty: false,
      headline: analysis.headline,
      resultCards,
      annualRows,
      hourlyRows,
      breakEven,
      selectedFeedback: metrics.feedback || "",
      feedbackOptions: FEEDBACK_OPTIONS.map((label) => ({
        label,
        selected: metrics.feedback === label,
      })),
    });
  },

  editConditions() {
    const pages = getCurrentPages();
    if (pages.length > 1) wx.navigateBack();
    else wx.reLaunch({ url: "/pages/calculator/calculator" });
  },

  backToCalculator() {
    wx.reLaunch({ url: "/pages/calculator/calculator" });
  },

  selectFeedback(event) {
    const value = event.currentTarget.dataset.value;
    updateMetrics({ feedback: value });
    this.setData({
      selectedFeedback: value,
      receiptStatus: "",
      feedbackOptions: FEEDBACK_OPTIONS.map((label) => ({
        label,
        selected: label === value,
      })),
    });
  },

  copyReceipt() {
    if (this.data.isCopying || !this.data.selectedFeedback) return;
    const metrics = getMetrics();
    const elapsedMinutes = Math.max(
      1,
      Math.round((Date.now() - metrics.startedAt) / 60000),
    );
    const receipt = [
      `真涨薪匿名验证回执 ${metrics.sessionId}`,
      `完成用时：约 ${elapsedMinutes} 分钟`,
      `计算次数：${metrics.calculations}`,
      `分享结果：${metrics.shares > 0 ? "是" : "否"}`,
      `下一步：${this.data.selectedFeedback}`,
    ].join("\n");

    this.setData({ isCopying: true, receiptStatus: "正在复制回执…" });
    wx.setClipboardData({
      data: receipt,
      success: () => {
        this.setData({ receiptStatus: "匿名验证回执已复制" });
      },
      fail: () => {
        this.setData({ receiptStatus: "复制失败，请检查剪贴板权限后重试" });
      },
      complete: () => this.setData({ isCopying: false }),
    });
  },

  clearLocalData() {
    wx.showModal({
      title: "清除本机数据？",
      content: "会删除输入草稿、结果和匿名验证记录。",
      confirmText: "清除数据",
      confirmColor: "#8D2618",
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
