const {
  FIELDS,
  BLANK_JOBS,
  BLANK_OFFER_B,
  EXAMPLE_JOBS,
  cloneJobs,
} = require("../../utils/offer-data");
const {
  validateField,
  validateJobs,
  isValidDraft,
} = require("../../utils/offer-validation");
const { calculateJob, analyzeResults } = require("../../utils/offer-analysis");
const {
  DRAFT_KEY,
  RESULT_KEY,
  METRICS_KEY,
  getMetrics,
  updateMetrics,
} = require("../../utils/storage");

function cloneJob(job) {
  return { ...job };
}

function createViewJobs(jobs, fieldErrors) {
  return jobs.map((job, index) => ({
    ...job,
    displayIndex: index < 9 ? `0${index + 1}` : String(index + 1),
    fields: FIELDS.map((field) => ({
      ...field,
      value: job[field.key],
      error: fieldErrors[`${job.id}-${field.key}`] || "",
    })),
  }));
}

Page({
  data: {
    jobs: cloneJobs(BLANK_JOBS),
    viewJobs: [],
    fieldErrors: {},
    optionCount: 2,
    hasOfferB: false,
    generalError: "",
    removedOffer: null,
    undoOfferVisible: false,
    isSubmitting: false,
  },

  onLoad() {
    let jobs = cloneJobs(BLANK_JOBS);
    try {
      const storedDraft = wx.getStorageSync(DRAFT_KEY);
      if (isValidDraft(storedDraft)) jobs = cloneJobs(storedDraft);
    } catch (_error) {
      // A corrupt or unavailable draft should never block a fresh calculation.
    }

    const metrics = getMetrics();
    updateMetrics(metrics);
    this.syncJobs(jobs, {}, false);
  },

  onUnload() {
    if (this.undoTimer) clearTimeout(this.undoTimer);
  },

  syncJobs(jobs, fieldErrors = this.data.fieldErrors, persist = true) {
    this.setData({
      jobs,
      fieldErrors,
      viewJobs: createViewJobs(jobs, fieldErrors),
      optionCount: jobs.length,
      hasOfferB: jobs.some((job) => job.id === "offerB"),
    });

    if (persist) {
      try {
        wx.setStorageSync(DRAFT_KEY, jobs);
      } catch (_error) {
        wx.showToast({ title: "草稿未保存，请继续完成计算", icon: "none" });
      }
    }
  },

  onInput(event) {
    const { jobId, key } = event.currentTarget.dataset;
    const value = event.detail.value;
    const jobs = this.data.jobs.map((job) =>
      job.id === jobId ? { ...job, [key]: value } : job,
    );
    const fieldErrors = { ...this.data.fieldErrors };
    delete fieldErrors[`${jobId}-${key}`];
    this.setData({ generalError: "" });
    this.syncJobs(jobs, fieldErrors);
  },

  onBlur(event) {
    const { jobId, key } = event.currentTarget.dataset;
    const field = FIELDS.find((item) => item.key === key);
    if (!field) return;

    const fieldErrors = { ...this.data.fieldErrors };
    const message = validateField(event.detail.value, field);
    if (message) fieldErrors[`${jobId}-${key}`] = message;
    else delete fieldErrors[`${jobId}-${key}`];
    this.syncJobs(this.data.jobs, fieldErrors, false);
  },

  fillExample() {
    this.setData({
      generalError: "",
      removedOffer: null,
      undoOfferVisible: false,
    });
    this.syncJobs(cloneJobs(EXAMPLE_JOBS), {});
    wx.showToast({ title: "已填入示例", icon: "success" });
  },

  addOfferB() {
    if (this.data.hasOfferB) return;
    const offer = this.data.removedOffer
      ? cloneJob(this.data.removedOffer)
      : cloneJob(BLANK_OFFER_B);
    this.setData({ removedOffer: null, undoOfferVisible: false });
    this.syncJobs([...this.data.jobs, offer]);
  },

  removeOfferB() {
    const removedOffer = this.data.jobs.find((job) => job.id === "offerB");
    if (!removedOffer) return;

    const fieldErrors = Object.keys(this.data.fieldErrors).reduce(
      (remainingErrors, key) => {
        if (!key.startsWith("offerB-")) {
          remainingErrors[key] = this.data.fieldErrors[key];
        }
        return remainingErrors;
      },
      {},
    );
    this.setData({
      removedOffer: cloneJob(removedOffer),
      undoOfferVisible: true,
      generalError: "",
    });
    this.syncJobs(
      this.data.jobs.filter((job) => job.id !== "offerB"),
      fieldErrors,
    );

    if (this.undoTimer) clearTimeout(this.undoTimer);
    this.undoTimer = setTimeout(() => {
      this.setData({ undoOfferVisible: false, removedOffer: null });
    }, 5000);
  },

  undoRemoveOffer() {
    if (!this.data.removedOffer || this.data.hasOfferB) return;
    const restoredOffer = cloneJob(this.data.removedOffer);
    this.setData({ undoOfferVisible: false, removedOffer: null });
    this.syncJobs([...this.data.jobs, restoredOffer]);
  },

  calculate() {
    if (this.data.isSubmitting) return;

    const fieldErrors = validateJobs(this.data.jobs);
    const invalidFieldIds = Object.keys(fieldErrors);
    if (invalidFieldIds.length > 0) {
      this.setData({
        generalError: `还有 ${invalidFieldIds.length} 项需要检查，已在对应字段下标出。`,
      });
      this.syncJobs(this.data.jobs, fieldErrors, false);
      wx.pageScrollTo({
        selector: `#field-${invalidFieldIds[0]}`,
        offsetTop: -96,
        duration: 220,
      });
      return;
    }

    this.setData({ isSubmitting: true, generalError: "" });
    try {
      const results = this.data.jobs.map(calculateJob);
      analyzeResults(results);
      wx.setStorageSync(RESULT_KEY, {
        jobs: this.data.jobs,
        calculatedAt: Date.now(),
      });
      const metrics = getMetrics();
      updateMetrics({ calculations: metrics.calculations + 1 });
      wx.navigateTo({
        url: "/pages/result/result",
        fail: () => {
          wx.showToast({ title: "结果页未打开，请重试", icon: "none" });
        },
        complete: () => this.setData({ isSubmitting: false }),
      });
    } catch (_error) {
      this.setData({ isSubmitting: false });
      wx.showToast({ title: "暂时无法计算，请检查输入", icon: "none" });
    }
  },

  clearLocalData() {
    wx.showModal({
      title: "清除本机数据？",
      content: "会删除当前草稿、最近一次结果和匿名验证记录。",
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
        this.setData({
          generalError: "",
          removedOffer: null,
          undoOfferVisible: false,
        });
        this.syncJobs(cloneJobs(BLANK_JOBS), {}, false);
        updateMetrics({});
        wx.showToast({ title: "本机数据已清除", icon: "success" });
      },
    });
  },

  onShareAppMessage() {
    const metrics = getMetrics();
    updateMetrics({ shares: metrics.shares + 1 });
    return {
      title: "这次跳槽，真的涨薪了吗？",
      path: "/pages/calculator/calculator",
    };
  },

  onShareTimeline() {
    return {
      title: "真涨薪｜Offer 真实价值对比",
    };
  },
});
