const { calculateJob, analyzeResults } = require("../../utils/offer-analysis");
const { validateJobs, isValidDraft } = require("../../utils/offer-validation");
const { RESULT_KEY, getMetrics, updateMetrics } = require("../../utils/storage");
const { buildSharePath, enableShareMenu } = require("../../utils/share");

function toNumber(value) {
  return Number.parseFloat(value);
}

function shortJobTitle(job) {
  return {
    current: "当前",
    offerA: "A",
    offerB: "B",
  }[job.id] || job.title;
}

function formatMinimum(value) {
  return (Math.ceil(value * 10) / 10).toFixed(1);
}

function buildScenario(leftJob, rightJob, index) {
  const rawJobs = [leftJob, rightJob];
  const results = rawJobs.map(calculateJob);
  const analysis = analyzeResults(results);
  if (!analysis.breakEven) return null;

  const { winner, challenger, extraBonusMonths, weeklyHoursReduction } =
    analysis.breakEven;
  const challengerJob = rawJobs.find((job) => job.id === challenger.id);
  const originalBonus = toNumber(challengerJob.guaranteedBonusMonths);
  const originalWeeklyHours = toNumber(challengerJob.weeklyHours);
  const targetBonus = originalBonus + extraBonusMonths;
  const targetWeeklyHours =
    weeklyHoursReduction === null
      ? null
      : Math.max(0, originalWeeklyHours - weeklyHoursReduction);

  return {
    id: `${leftJob.id}-${rightJob.id}`,
    index,
    label: `${shortJobTitle(leftJob)} vs ${shortJobTitle(rightJob)}`,
    title: `${challenger.title} 要追平 ${winner.title}`,
    winner,
    challengerJob: { ...challengerJob },
    extraBonusText: `+${formatMinimum(extraBonusMonths)}个月`,
    hoursReductionText:
      weeklyHoursReduction === null
        ? "仅靠工时无法追平"
        : `−${formatMinimum(weeklyHoursReduction)}小时`,
    originalBonus,
    originalWeeklyHours,
    bonusMin: 0,
    bonusMax: Math.max(6, Math.ceil(targetBonus + 1)),
    hoursMin:
      targetWeeklyHours === null
        ? Math.max(1, Math.floor(originalWeeklyHours - 20))
        : Math.max(1, Math.floor(targetWeeklyHours - 5)),
    hoursMax: Math.max(60, Math.ceil(originalWeeklyHours + 5)),
  };
}

function evaluateScenario(scenario, bonusValue, weeklyHoursValue) {
  const simulatedJob = {
    ...scenario.challengerJob,
    guaranteedBonusMonths: String(bonusValue),
    weeklyHours: String(weeklyHoursValue),
  };
  const simulated = calculateJob(simulatedJob);
  const delta = scenario.winner.hourlyValue - simulated.hourlyValue;
  const caughtUp = delta <= 0.01;

  return {
    caughtUp,
    statusText: caughtUp ? "已经追平" : "还未追平",
    statusDelta: caughtUp ? "当前假设已达到目标" : `差 ¥${Math.ceil(delta)}/时`,
  };
}

Page({
  data: {
    empty: false,
    scenarios: [],
    activeScenarioIndex: 0,
    activeScenario: null,
    draftBonusValue: 0,
    draftBonusText: "0.0",
    draftWeeklyHours: 0,
    draftWeeklyHoursText: "0.0",
    statusText: "",
    statusDelta: "",
    caughtUp: false,
  },

  onLoad() {
    enableShareMenu();
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

    const pairs = [];
    for (let left = 0; left < payload.jobs.length - 1; left += 1) {
      for (let right = left + 1; right < payload.jobs.length; right += 1) {
        pairs.push([payload.jobs[left], payload.jobs[right]]);
      }
    }

    const scenarios = pairs
      .map(([leftJob, rightJob], index) =>
        buildScenario(leftJob, rightJob, index),
      )
      .filter(Boolean)
      .map((scenario, index) => ({
        ...scenario,
        index,
        selected: index === 0,
      }));

    if (!scenarios.length) {
      this.setData({ empty: true });
      return;
    }

    this.setData({ scenarios, empty: false });
    this.syncScenario(0);
  },

  syncScenario(index) {
    const activeScenario = this.data.scenarios[index];
    if (!activeScenario) return;
    const evaluation = evaluateScenario(
      activeScenario,
      activeScenario.originalBonus,
      activeScenario.originalWeeklyHours,
    );

    this.setData({
      activeScenarioIndex: index,
      activeScenario,
      scenarios: this.data.scenarios.map((scenario, scenarioIndex) => ({
        ...scenario,
        selected: scenarioIndex === index,
      })),
      draftBonusValue: activeScenario.originalBonus,
      draftBonusText: activeScenario.originalBonus.toFixed(1),
      draftWeeklyHours: activeScenario.originalWeeklyHours,
      draftWeeklyHoursText: activeScenario.originalWeeklyHours.toFixed(1),
      ...evaluation,
    });
  },

  switchScenario(event) {
    const index = Number(event.currentTarget.dataset.index);
    if (!Number.isInteger(index)) return;
    this.syncScenario(index);
  },

  changeBonus(event) {
    const value = Number(event.detail.value);
    const evaluation = evaluateScenario(
      this.data.activeScenario,
      value,
      this.data.draftWeeklyHours,
    );
    this.setData({
      draftBonusValue: value,
      draftBonusText: value.toFixed(1),
      ...evaluation,
    });
  },

  changeWeeklyHours(event) {
    const value = Number(event.detail.value);
    const evaluation = evaluateScenario(
      this.data.activeScenario,
      this.data.draftBonusValue,
      value,
    );
    this.setData({
      draftWeeklyHours: value,
      draftWeeklyHoursText: value.toFixed(1),
      ...evaluation,
    });
  },

  resetScenario() {
    this.syncScenario(this.data.activeScenarioIndex);
  },

  backToResult() {
    const pages = getCurrentPages();
    if (pages.length > 1) wx.navigateBack();
    else wx.reLaunch({ url: "/pages/result/result" });
  },

  onShareAppMessage() {
    const metrics = getMetrics();
    updateMetrics({ shares: metrics.shares + 1 });
    return {
      title: "算清收入和时间，看看哪个 Offer 更值",
      path: buildSharePath("breakeven"),
    };
  },

  onShareTimeline() {
    return {
      title: "真涨薪｜关键反超条件",
      query: "source=timeline_breakeven",
    };
  },
});
