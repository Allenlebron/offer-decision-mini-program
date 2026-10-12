const {
  FIELDS,
  BENEFIT_FIELDS,
  BLANK_JOBS,
  BLANK_OFFER_B,
  EXAMPLE_JOBS,
  cloneJobs,
} = require("../../utils/offer-data");
const {
  validateField,
  validateJobs,
} = require("../../utils/offer-validation");
const { calculateJob, analyzeResults } = require("../../utils/offer-analysis");
const { formatMoney, formatWan } = require("../../utils/format");
const {
  getMetrics,
  updateMetrics,
} = require("../../utils/storage");
const { restoreOfferDraft, saveOfferDraft, saveOfferResult } = require("../../utils/offer-session");
const { clearAllData, clearOfferData } = require("../../utils/decision-storage");
const { buildSharePath, enableShareMenu, SHARE_IMAGE } = require("../../utils/share");

const ALL_FIELDS = [...FIELDS, ...BENEFIT_FIELDS];
const BENEFIT_FIELD_KEYS = new Set(BENEFIT_FIELDS.map((field) => field.key));

const FIELD_PRESENTATION = {
  monthlySalary: {
    hint: "每月固定收入",
    placeholder: "输入金额",
  },
  salaryMonths: {
    hint: "常见 12、13 或 14 薪",
    placeholder: "手动填写",
  },
  guaranteedBonusMonths: {
    hint: "只填确定发放、且未计入固定发薪的部分",
    placeholder: "手动填写",
  },
  weeklyHours: {
    hint: "按实际工时估算",
    placeholder: "手动填写",
  },
  commuteMinutes: {
    hint: "单程；远程办公选 0",
    placeholder: "手动填写",
  },
  socialInsuranceBase: {
    hint: "每月 · 按公司实际申报",
    placeholder: "可留空",
    money: true,
  },
  housingFundBase: {
    hint: "每月 · 按公司实际申报",
    placeholder: "可留空",
    money: true,
  },
  employerHousingFundRate: {
    hint: "只填公司缴存比例",
    placeholder: "可留空",
    money: false,
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
    isComplete: ALL_FIELDS.every(
      (field) => !validateField(job[field.key], field),
    ),
    filledCount: FIELDS.filter((field) => String(job[field.key]).trim()).length,
    benefitFilledCount: BENEFIT_FIELDS.filter((field) =>
      String(job[field.key]).trim(),
    ).length,
    fields: FIELDS.map((field) => ({
      ...field,
      ...FIELD_PRESENTATION[field.key],
      value: job[field.key],
      error: fieldErrors[`${job.id}-${field.key}`] || "",
    })),
    benefitFields: BENEFIT_FIELDS.map((field) => ({
      ...field,
      ...FIELD_PRESENTATION[field.key],
      value: job[field.key],
      error: fieldErrors[`${job.id}-${field.key}`] || "",
    })),
  }));
}

function createPreview(job) {
  const complete = ALL_FIELDS.every(
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
    annualText: `¥${formatWan(result.totalAnnualValue)}`,
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
    activeBenefitFields: [],
    activeBenefitFilledCount: 0,
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
    showBenefits: false,
    isExample: false,
    storageNotice: "",
  },

  onLoad() {
    enableShareMenu();
    let jobs = cloneJobs(BLANK_JOBS);
    const restored = restoreOfferDraft();
    if (restored.status === "ready") {
      jobs = cloneJobs(restored.jobs);
      this.setData({ isExample: restored.example, storageNotice: restored.saved === false ? "草稿未保存完整，退出微信后可能无法恢复。" : "" });
    } else if (restored.status === "corrupt" || restored.status === "unavailable") {
      wx.showToast({ title: "草稿暂时无法恢复，可以重新填写", icon: "none" });
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
      activeBenefitFields: activeJob.benefitFields,
      activeBenefitFilledCount: activeJob.benefitFilledCount,
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
      const saved = saveOfferDraft(jobs, this.data.isExample);
      this.setData({ storageNotice: saved ? "" : "草稿未保存完整，仍可计算；退出微信后可能无法恢复。" });
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
    ALL_FIELDS.forEach((field) => delete fieldErrors[`${job.id}-${field.key}`]);
    ALL_FIELDS.forEach((field) => {
      const message = validateField(job[field.key], field);
      if (message) fieldErrors[`${job.id}-${field.key}`] = message;
    });

    const invalidFieldId = Object.keys(fieldErrors).find((key) =>
      key.startsWith(`${job.id}-`),
    );
    if (!invalidFieldId) return true;

    const invalidKey = invalidFieldId.slice(job.id.length + 1);
    this.setData({
      generalError: `先检查${job.title}的输入。`,
      showBenefits:
        this.data.showBenefits || BENEFIT_FIELD_KEYS.has(invalidKey),
    });
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

  toggleBenefits() {
    this.setData({ showBenefits: !this.data.showBenefits });
  },

  onBlur(event) {
    const { jobId, key } = event.currentTarget.dataset;
    const field = ALL_FIELDS.find((item) => item.key === key);
    if (!field) return;

    const fieldErrors = { ...this.data.fieldErrors };
    const message = validateField(event.detail.value, field);
    if (message) fieldErrors[`${jobId}-${key}`] = message;
    else delete fieldErrors[`${jobId}-${key}`];
    this.syncJobs(this.data.jobs, fieldErrors, false);
  },

  applyExample() {
    this.setData({
      isExample: true,
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
      ALL_FIELDS.some((field) => String(job[field.key]).trim()),
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
        showBenefits:
          this.data.showBenefits ||
          invalidFieldIds.some((id) =>
            BENEFIT_FIELD_KEYS.has(id.slice(id.indexOf("-") + 1)),
          ),
      });
      this.syncJobs(this.data.jobs, fieldErrors, false);
      scrollToField(`#field-${invalidFieldIds[0]}`);
      return;
    }

    this.setData({ isSubmitting: true, generalError: "" });
    try {
      const results = this.data.jobs.map(calculateJob);
      analyzeResults(results);
      const saved = saveOfferResult(this.data.jobs, this.data.isExample);
      this.setData({ storageNotice: saved ? "" : "草稿与结果未保存完整，退出微信后可能无法恢复。" });
      if (!saved) wx.showToast({ title: "结果可查看，但本次未能保存", icon: "none" });
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

  goHome() { wx.reLaunch({ url: "/pages/home/home" }); },
  openAbout() { wx.navigateTo({ url: "/pages/about/about" }); },
  resetOffer() {
    wx.showModal({ title: "重新填写 Offer？", content: "只清除 Offer 草稿与结果，租房和预算保持不变。", confirmText: "重新填写", success: ({ confirm }) => {
      if (!confirm) return;
      if (!clearOfferData()) { wx.showToast({ title: "清除失败，请重试", icon: "none" }); return; }
      this.setData({ activeJobIndex: 0, generalError: "", removedOffer: null, undoOfferVisible: false, showBenefits: false, isExample: false, storageNotice: "" });
      this.syncJobs(cloneJobs(BLANK_JOBS), {}, false);
    } });
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
        this.setData({
          activeJobIndex: 0,
          generalError: "",
          removedOffer: null,
          undoOfferVisible: false,
          showGuide: false,
          showBenefits: false,
          isExample: false,
          storageNotice: "",
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
      imageUrl: SHARE_IMAGE,
    };
  },

  onShareTimeline() {
    return {
      title: "真涨薪｜Offer 真实价值对比",
      query: "source=timeline_calculator",
      imageUrl: SHARE_IMAGE,
    };
  },
});
