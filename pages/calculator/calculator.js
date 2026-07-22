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
const { formatMoney, formatWan } = require("../../utils/format");
const {
  DRAFT_KEY,
  RESULT_KEY,
  METRICS_KEY,
  getMetrics,
  updateMetrics,
} = require("../../utils/storage");
const { buildSharePath, enableShareMenu } = require("../../utils/share");

const FIELD_PRESENTATION = {
  monthlySalary: {
    hint: "每月固定收入",
    placeholder: "输入金额",
    presets: [],
  },
  salaryMonths: {
    hint: "常见 12、13 或 14 薪",
    placeholder: "手动填写",
    presets: ["12", "13", "14", "16"],
  },
  guaranteedBonusMonths: {
    hint: "只填确定发放的部分",
    placeholder: "手动填写",
    presets: ["0", "1", "2", "3"],
  },
  weeklyHours: {
    hint: "按实际工时估算",
    placeholder: "手动填写",
    presets: ["40", "45", "50", "60"],
  },
  commuteMinutes: {
    hint: "单程；远程办公选 0",
    placeholder: "手动填写",
    presets: ["0", "30", "45", "60"],
  },
};

const JOB_COPY = {
  current: {
    heading: "当前工作",
    description: "先填收入和时间，作为比较基准。",
  },
  offerA: {
    heading: "Offer A",
    description: "按确定收入和实际工作强度填写。",
  },
  offerB: {
    heading: "Offer B",
    description: "按同一口径填写，方便直接比较。",
  },
};

function cloneJob(job) {
  return { ...job };
}

function createViewJobs(jobs, fieldErrors, activeJobIndex) {
  return jobs.map((job, index) => ({
    ...job,
    index,
    displayIndex: index < 9 ? `0${index + 1}` : String(index + 1),
    selected: index === activeJobIndex,
    isComplete: FIELDS.every(
      (field) => !validateField(job[field.key], field),
    ),
    filledCount: FIELDS.filter((field) => String(job[field.key]).trim()).length,
    fields: FIELDS.map((field) => ({
      ...field,
      ...FIELD_PRESENTATION[field.key],
      value: job[field.key],
      presets: FIELD_PRESENTATION[field.key].presets.map((value) => ({
        value,
        selected: job[field.key] === value,
      })),
      error: fieldErrors[`${job.id}-${field.key}`] || "",
    })),
  }));
}

function createPreview(job) {
  const complete = FIELDS.every(
    (field) => !validateField(job[field.key], field),
  );
  if (!complete) {
    return {
      ready: false,
      annualText: "—",
      hourlyText: "—",
    };
  }

  const result = calculateJob(job);
  return {
    ready: true,
    annualText: `¥${formatWan(result.guaranteedAnnual)}`,
    hourlyText: `${formatMoney(result.hourlyValue)}/时`,
  };
}

function scrollToField(selector) {
  const scroll = () => {
    wx.pageScrollTo({ selector, offsetTop: -120, duration: 220 });
  };
  if (typeof wx.nextTick === "function") wx.nextTick(scroll);
  else scroll();
}

Page({
  data: {
    jobs: cloneJobs(BLANK_JOBS),
    viewJobs: [],
    activeJobIndex: 0,
    activeJob: null,
    activeIncomeFields: [],
    activeTimeFields: [],
    activePreview: {
      ready: false,
      annualText: "—",
      hourlyText: "—",
    },
    activeHeading: "",
    activeDescription: "",
    progressWidth: "50%",
    primaryActionText: "下一份：Offer A",
    fieldErrors: {},
    optionCount: 2,
    hasOfferB: false,
    generalError: "",
    removedOffer: null,
    undoOfferVisible: false,
    isSubmitting: false,
    showGuide: false,
  },

  onLoad() {
    enableShareMenu();
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
    const activeJobIndex = Math.min(this.data.activeJobIndex, jobs.length - 1);
    const viewJobs = createViewJobs(jobs, fieldErrors, activeJobIndex);
    const activeJob = viewJobs[activeJobIndex];
    const nextJob = viewJobs[activeJobIndex + 1];
    const copy = JOB_COPY[activeJob.id];
    const activePreview = createPreview(activeJob);

    this.setData({
      jobs,
      fieldErrors,
      viewJobs,
      activeJobIndex,
      activeJob,
      activeIncomeFields: activeJob.fields.slice(0, 3),
      activeTimeFields: activeJob.fields.slice(3),
      activePreview,
      activeHeading: copy.heading,
      activeDescription: copy.description,
      progressWidth: `${((activeJobIndex + 1) / jobs.length) * 100}%`,
      primaryActionText: nextJob ? `下一份：${nextJob.title}` : "生成对比",
      optionCount: jobs.length,
      hasOfferB: jobs.some((job) => job.id === "offerB"),
    });

    if (typeof wx.setNavigationBarTitle === "function") {
      wx.setNavigationBarTitle({ title: activeJob.title });
    }

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

  selectPreset(event) {
    const { jobId, key, value } = event.currentTarget.dataset;
    const jobs = this.data.jobs.map((job) =>
      job.id === jobId ? { ...job, [key]: String(value) } : job,
    );
    const fieldErrors = { ...this.data.fieldErrors };
    delete fieldErrors[`${jobId}-${key}`];
    this.setData({ generalError: "" });
    this.syncJobs(jobs, fieldErrors);
  },

  clearField(event) {
    const { jobId, key } = event.currentTarget.dataset;
    const jobs = this.data.jobs.map((job) =>
      job.id === jobId ? { ...job, [key]: "" } : job,
    );
    const fieldErrors = { ...this.data.fieldErrors };
    delete fieldErrors[`${jobId}-${key}`];
    this.setData({ generalError: "" });
    this.syncJobs(jobs, fieldErrors);
  },

  switchJob(event) {
    const index = Number(event.currentTarget.dataset.index);
    if (!Number.isInteger(index) || !this.data.jobs[index]) return;
    this.setData({ activeJobIndex: index, generalError: "" });
    this.syncJobs(this.data.jobs, this.data.fieldErrors, false);
    wx.pageScrollTo({ scrollTop: 0, duration: 180 });
  },

  validateActiveJob() {
    const job = this.data.jobs[this.data.activeJobIndex];
    if (!job) return false;

    const fieldErrors = { ...this.data.fieldErrors };
    FIELDS.forEach((field) => delete fieldErrors[`${job.id}-${field.key}`]);
    FIELDS.forEach((field) => {
      const message = validateField(job[field.key], field);
      if (message) fieldErrors[`${job.id}-${field.key}`] = message;
    });

    const invalidFieldId = Object.keys(fieldErrors).find((key) =>
      key.startsWith(`${job.id}-`),
    );
    if (!invalidFieldId) return true;

    this.setData({ generalError: `先完成${job.title}的必填项。` });
    this.syncJobs(this.data.jobs, fieldErrors, false);
    scrollToField(`#field-${invalidFieldId}`);
    return false;
  },

  advance() {
    if (!this.validateActiveJob()) return;
    if (this.data.activeJobIndex >= this.data.jobs.length - 1) {
      this.calculate();
      return;
    }

    this.setData({
      activeJobIndex: this.data.activeJobIndex + 1,
      generalError: "",
    });
    this.syncJobs(this.data.jobs, this.data.fieldErrors, false);
    wx.pageScrollTo({ scrollTop: 0, duration: 220 });
  },

  previousJob() {
    if (this.data.activeJobIndex === 0) return;
    this.setData({
      activeJobIndex: this.data.activeJobIndex - 1,
      generalError: "",
    });
    this.syncJobs(this.data.jobs, this.data.fieldErrors, false);
    wx.pageScrollTo({ scrollTop: 0, duration: 180 });
  },

  toggleGuide() {
    this.setData({ showGuide: !this.data.showGuide });
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

  applyExample() {
    this.setData({
      activeJobIndex: 0,
      generalError: "",
      removedOffer: null,
      undoOfferVisible: false,
    });
    this.syncJobs(cloneJobs(EXAMPLE_JOBS), {});
    wx.showToast({ title: "已填入示例", icon: "success" });
  },

  fillExample() {
    const hasInput = this.data.jobs.some((job) =>
      FIELDS.some((field) => String(job[field.key]).trim()),
    );
    if (!hasInput) {
      this.applyExample();
      return;
    }

    wx.showModal({
      title: "用示例覆盖当前内容？",
      content: "会替换当前已填写的工作数据。",
      confirmText: "使用示例",
      cancelText: "保留内容",
      success: ({ confirm }) => {
        if (confirm) this.applyExample();
      },
    });
  },

  addOfferB() {
    if (this.data.hasOfferB) return;
    const offer = this.data.removedOffer
      ? cloneJob(this.data.removedOffer)
      : cloneJob(BLANK_OFFER_B);
    this.setData({
      activeJobIndex: this.data.jobs.length,
      removedOffer: null,
      undoOfferVisible: false,
    });
    this.syncJobs([...this.data.jobs, offer]);
    wx.pageScrollTo({ scrollTop: 0, duration: 220 });
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
      activeJobIndex: Math.min(this.data.activeJobIndex, 1),
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
    this.setData({
      activeJobIndex: this.data.jobs.length,
      undoOfferVisible: false,
      removedOffer: null,
    });
    this.syncJobs([...this.data.jobs, restoredOffer]);
  },

  calculate() {
    if (this.data.isSubmitting) return;

    const fieldErrors = validateJobs(this.data.jobs);
    const invalidFieldIds = Object.keys(fieldErrors);
    if (invalidFieldIds.length > 0) {
      const firstInvalidJobId = invalidFieldIds[0].split("-")[0];
      const activeJobIndex = this.data.jobs.findIndex(
        (job) => job.id === firstInvalidJobId,
      );
      this.setData({
        activeJobIndex: Math.max(0, activeJobIndex),
        generalError: `还有 ${invalidFieldIds.length} 项需要检查，已在对应字段下标出。`,
      });
      this.syncJobs(this.data.jobs, fieldErrors, false);
      scrollToField(`#field-${invalidFieldIds[0]}`);
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
      content: "会删除当前草稿和最近一次计算结果。",
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
        this.setData({
          activeJobIndex: 0,
          generalError: "",
          removedOffer: null,
          undoOfferVisible: false,
          showGuide: false,
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
      path: buildSharePath("calculator"),
    };
  },

  onShareTimeline() {
    return {
      title: "真涨薪｜Offer 真实价值对比",
      query: "source=timeline_calculator",
    };
  },
});
