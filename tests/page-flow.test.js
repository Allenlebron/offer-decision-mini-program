const assert = require("node:assert/strict");
const test = require("node:test");

const {
  DRAFT_KEY,
  RESULT_KEY,
  METRICS_KEY,
} = require("../utils/storage");

function createWxHarness() {
  const storage = new Map();
  const modalResponses = [];
  const calls = {
    modals: [],
    navigationTitles: [],
    navigateBack: 0,
    navigateTo: [],
    pageScrollTo: [],
    reLaunch: [],
    shareMenus: [],
    toasts: [],
  };

  return {
    calls,
    modalResponses,
    storage,
    wx: {
      getStorageSync(key) {
        return storage.get(key);
      },
      setStorageSync(key, value) {
        storage.set(key, structuredClone(value));
      },
      removeStorageSync(key) {
        storage.delete(key);
      },
      showToast(options) {
        calls.toasts.push(options);
      },
      pageScrollTo(options) {
        calls.pageScrollTo.push(options);
      },
      navigateTo(options) {
        calls.navigateTo.push(options.url);
        options.complete?.();
      },
      navigateBack() {
        calls.navigateBack += 1;
      },
      setNavigationBarTitle(options) {
        calls.navigationTitles.push(options.title);
      },
      reLaunch(options) {
        calls.reLaunch.push(options.url);
      },
      showModal(options) {
        calls.modals.push(options);
        options.success?.(modalResponses.shift() || { confirm: false });
      },
      showShareMenu(options) {
        calls.shareMenus.push(options.menus);
      },
    },
  };
}

function loadPage(relativePath, wx, currentPages = []) {
  const modulePath = require.resolve(relativePath);
  let definition;

  global.wx = wx;
  global.getCurrentPages = () => currentPages;
  global.Page = (pageDefinition) => {
    definition = pageDefinition;
  };
  delete require.cache[modulePath];
  require(modulePath);

  const page = {
    ...definition,
    data: structuredClone(definition.data),
    setData(patch) {
      Object.assign(this.data, patch);
    },
  };
  return page;
}

test("runs the real calculator and result page flow", () => {
  const harness = createWxHarness();
  const calculator = loadPage(
    "../pages/calculator/calculator.js",
    harness.wx,
  );

  calculator.onLoad();
  assert.equal(calculator.data.jobs.length, 2);
  assert.ok(harness.storage.has(METRICS_KEY));

  calculator.fillExample();
  assert.equal(calculator.data.jobs.length, 3);
  assert.equal(calculator.data.jobs[1].monthlySalary, "32000");
  assert.equal(calculator.data.activeBenefitFilledCount, 3);
  assert.deepEqual(harness.storage.get(DRAFT_KEY), calculator.data.jobs);

  calculator.calculate();
  assert.deepEqual(harness.calls.navigateTo, ["/pages/result/result"]);
  assert.equal(harness.storage.get(RESULT_KEY).jobs.length, 3);
  assert.equal(harness.storage.get(METRICS_KEY).calculations, 1);

  const result = loadPage("../pages/result/result.js", harness.wx, [calculator]);
  result.onLoad();
  assert.equal(result.data.empty, false);
  assert.equal(result.data.resultCards.length, 3);
  assert.equal(result.data.hasBenefits, true);
  assert.equal(result.data.benefitRows[3].cells[0].value, "3.6万");
  assert.equal(
    result.data.headline,
    "Offer A的年综合价值最高，Offer B的综合时薪最高。",
  );
  assert.equal(result.data.breakEven.extraBonusMonths, "5.3");
  assert.equal(result.data.breakEven.weeklyHoursReduction, "13.4");
  assert.equal(
    result.data.summaryTitle,
    "Offer A 综合价值更高，Offer B 时间回报更高",
  );
  assert.equal(
    result.data.comparisonRows[0].cells[1].a11yLabel,
    "Offer A，年综合价值，47.5万",
  );
  assert.equal(
    result.data.comparisonRows[1].cells[1].a11yLabel,
    "Offer A，税前保证收入，44.8万",
  );

  result.openBreakEven();
  assert.deepEqual(harness.calls.navigateTo, [
    "/pages/result/result",
    "/pages/breakeven/breakeven",
  ]);

  const breakEven = loadPage(
    "../pages/breakeven/breakeven.js",
    harness.wx,
    [calculator, result],
  );
  breakEven.onLoad();
  assert.equal(breakEven.data.empty, false);
  assert.equal(breakEven.data.scenarios.length, 3);
  assert.deepEqual(
    breakEven.data.scenarios.map((scenario) => scenario.label),
    ["当前 vs A", "当前 vs B", "A vs B"],
  );
  breakEven.switchScenario({ currentTarget: { dataset: { index: 2 } } });
  assert.equal(breakEven.data.activeScenario.title, "Offer A 要追平 Offer B");
  assert.equal(breakEven.data.activeScenario.extraBonusText, "+5.8个月");
  assert.equal(breakEven.data.activeScenario.hoursReductionText, "−18.6小时");

  breakEven.changeBonus({ detail: { value: 5.8 } });
  assert.equal(breakEven.data.caughtUp, true);
  assert.equal(breakEven.data.statusText, "已经追平");
  assert.equal(harness.storage.get(RESULT_KEY).jobs[1].guaranteedBonusMonths, "0");
  breakEven.resetScenario();
  assert.equal(breakEven.data.draftBonusValue, 0);

  const share = result.onShareAppMessage();
  assert.equal(share.title, "这次跳槽，真的涨薪了吗？");
  assert.notEqual(share.title, result.data.headline);
  assert.equal(share.path, "/pages/calculator/calculator?source=result");
  assert.equal(share.imageUrl, "/images/share-entry.png");
  assert.equal(harness.storage.get(METRICS_KEY).shares, 1);

  const breakEvenShare = breakEven.onShareAppMessage();
  assert.equal(breakEvenShare.imageUrl, "/images/share-entry.png");
  assert.equal(
    breakEvenShare.path,
    "/pages/calculator/calculator?source=breakeven",
  );
  assert.equal(harness.storage.get(METRICS_KEY).shares, 2);
  assert.deepEqual(harness.calls.shareMenus, [
    ["shareAppMessage", "shareTimeline"],
    ["shareAppMessage", "shareTimeline"],
    ["shareAppMessage", "shareTimeline"],
  ]);
});

test("guides users through one job at a time with direct numeric input", () => {
  const harness = createWxHarness();
  const calculator = loadPage(
    "../pages/calculator/calculator.js",
    harness.wx,
  );

  calculator.onLoad();
  assert.equal(calculator.data.activeJob.id, "current");
  assert.equal(calculator.data.primaryActionText, "下一份：Offer A");

  calculator.advance();
  assert.equal(calculator.data.activeJobIndex, 0);
  assert.equal(Object.keys(calculator.data.fieldErrors).length, 5);
  assert.match(calculator.data.generalError, /先检查当前工作的输入/);

  calculator.fillExample();
  calculator.toggleBenefits();
  assert.equal(calculator.data.showBenefits, true);
  assert.equal(calculator.data.activeBenefitFields.length, 3);
  calculator.advance();
  assert.equal(calculator.data.activeJob.id, "offerA");
  assert.equal(calculator.data.primaryActionText, "下一份：Offer B");

  calculator.switchJob({ currentTarget: { dataset: { index: 2 } } });
  calculator.onInput({
    currentTarget: {
      dataset: { jobId: "offerB", key: "commuteMinutes" },
    },
    detail: { value: "60" },
  });
  assert.equal(calculator.data.jobs[2].commuteMinutes, "60");
  assert.equal(calculator.data.activeJob.fields[4].value, "60");

  calculator.clearField({
    currentTarget: {
      dataset: { jobId: "offerB", key: "commuteMinutes" },
    },
  });
  assert.equal(calculator.data.jobs[2].commuteMinutes, "");
  calculator.onInput({
    currentTarget: {
      dataset: { jobId: "offerB", key: "commuteMinutes" },
    },
    detail: { value: "60" },
  });

  calculator.advance();
  assert.deepEqual(harness.calls.navigateTo, ["/pages/result/result"]);
});

test("keeps benefit fields optional and expands them when entered values are invalid", () => {
  const harness = createWxHarness();
  const calculator = loadPage(
    "../pages/calculator/calculator.js",
    harness.wx,
  );

  calculator.onLoad();
  calculator.fillExample();
  calculator.onInput({
    currentTarget: {
      dataset: {
        jobId: "current",
        key: "employerHousingFundRate",
      },
    },
    detail: { value: "101" },
  });
  calculator.calculate();

  assert.equal(calculator.data.showBenefits, true);
  assert.equal(
    calculator.data.fieldErrors["current-employerHousingFundRate"],
    "请填写 0–100%",
  );
  assert.equal(harness.calls.navigateTo.length, 0);
});

test("invalid benefit values suppress the live estimate and completion check", () => {
  const harness = createWxHarness();
  const calculator = loadPage("../pages/calculator/calculator.js", harness.wx);
  calculator.onLoad();
  calculator.fillExample();
  calculator.onInput({ currentTarget: { dataset: { jobId: "current", key: "employerHousingFundRate" } }, detail: { value: "101" } });
  assert.equal(calculator.data.activePreview.ready, false);
  assert.equal(calculator.data.activeJob.isComplete, false);
  calculator.clearField({ currentTarget: { dataset: { jobId: "current", key: "employerHousingFundRate" } } });
  assert.equal(calculator.data.activePreview.ready, true);
  assert.equal(calculator.data.activeJob.isComplete, true);
});

test("blocks an incomplete calculation and points to the first field", () => {
  const harness = createWxHarness();
  const calculator = loadPage(
    "../pages/calculator/calculator.js",
    harness.wx,
  );

  calculator.onLoad();
  calculator.calculate();

  assert.match(calculator.data.generalError, /还有 10 项需要检查/);
  assert.equal(Object.keys(calculator.data.fieldErrors).length, 10);
  assert.equal(harness.calls.navigateTo.length, 0);
  assert.equal(
    harness.calls.pageScrollTo[0].selector,
    "#field-current-monthlySalary",
  );
});

test("asks before example data replaces a populated draft", () => {
  const harness = createWxHarness();
  const calculator = loadPage(
    "../pages/calculator/calculator.js",
    harness.wx,
  );

  calculator.onLoad();
  calculator.onInput({
    currentTarget: {
      dataset: { jobId: "current", key: "monthlySalary" },
    },
    detail: { value: "18888" },
  });
  calculator.fillExample();

  assert.equal(calculator.data.jobs[0].monthlySalary, "18888");
  assert.equal(harness.calls.modals[0].title, "用示例覆盖当前内容？");
  assert.equal(harness.calls.modals[0].confirmText, "使用示例");

  harness.modalResponses.push({ confirm: true });
  calculator.fillExample();
  assert.equal(calculator.data.jobs[0].monthlySalary, "25000");
});

test("a storage quota failure still opens current offer results and break-even", () => {
  const harness = createWxHarness();
  harness.wx.setStorageSync = () => { throw new Error("quota exceeded"); };
  const calculator = loadPage("../pages/calculator/calculator.js", harness.wx);
  calculator.onLoad();
  calculator.fillExample();
  calculator.calculate();
  assert.equal(calculator.data.isSubmitting, false);
  assert.deepEqual(harness.calls.navigateTo, ["/pages/result/result"]);
  assert.ok(harness.calls.toasts.some((toast) => toast.title === "结果可查看，但本次未能保存"));
  const result = loadPage("../pages/result/result.js", harness.wx);
  result.onLoad();
  assert.equal(result.data.empty, false);
  assert.equal(result.data.isExample, true);
  const breakeven = loadPage("../pages/breakeven/breakeven.js", harness.wx);
  breakeven.onLoad();
  assert.equal(breakeven.data.empty, false);
});

test("editing an offer invalidates results even when disk invalidation fails", () => {
  const harness = createWxHarness();
  const calculator = loadPage("../pages/calculator/calculator.js", harness.wx);
  calculator.onLoad();
  calculator.fillExample();
  calculator.calculate();
  const result = loadPage("../pages/result/result.js", harness.wx);
  result.onLoad();
  const breakeven = loadPage("../pages/breakeven/breakeven.js", harness.wx);
  breakeven.onLoad();
  harness.wx.setStorageSync = () => { throw new Error("write failure"); };
  harness.wx.removeStorageSync = () => { throw new Error("remove failure"); };
  calculator.onInput({ currentTarget: { dataset: { jobId: "current", key: "monthlySalary" } }, detail: { value: "12abc" } });
  result.onShow();
  breakeven.onShow();
  assert.equal(result.data.empty, true);
  assert.equal(breakeven.data.empty, true);
  assert.equal(harness.storage.get(RESULT_KEY).jobs[0].monthlySalary, "25000");
});

test("offer share titles and queries never expose a customized result", () => {
  const harness = createWxHarness();
  const result = loadPage("../pages/result/result.js", harness.wx);
  result.data.headline = "PRIVATE_NAME 薪资 1234567";
  assert.doesNotMatch(JSON.stringify(result.onShareAppMessage()), /PRIVATE_NAME|1234567/);
  assert.doesNotMatch(JSON.stringify(result.onShareTimeline()), /PRIVATE_NAME|1234567/);
});

test("corrupt offer draft is reported, not silently removed", () => {
  const harness = createWxHarness();
  harness.storage.set(DRAFT_KEY, { unsupported: true });
  const calculator = loadPage("../pages/calculator/calculator.js", harness.wx);
  calculator.onLoad();
  assert.deepEqual(harness.storage.get(DRAFT_KEY), { unsupported: true });
  assert.ok(harness.calls.toasts.some((toast) => /无法恢复/.test(toast.title)));
  assert.equal(calculator.data.jobs[0].monthlySalary, "");
});

test("confirmed clear-all removes the three scenarios and runtime offer fallback", () => {
  const { KEYS } = require("../utils/decision-storage");
  const { loadOfferResult } = require("../utils/offer-session");
  const harness = createWxHarness();
  const calculator = loadPage("../pages/calculator/calculator.js", harness.wx);
  calculator.onLoad();
  calculator.fillExample();
  calculator.calculate();
  harness.storage.set(KEYS.rent, { private: "rent" });
  harness.storage.set(KEYS.budget, { private: "budget" });
  calculator.clearLocalData();
  assert.ok(harness.storage.has(KEYS.rent));
  harness.modalResponses.push({ confirm: true });
  calculator.clearLocalData();
  assert.equal(harness.storage.has(KEYS.rent), false);
  assert.equal(harness.storage.has(KEYS.budget), false);
  assert.equal(loadOfferResult(), null);
});

test("offer result qualifies incomplete housing fund data and does not label ties as wins", () => {
  const { EXAMPLE_JOBS, cloneJobs } = require("../utils/offer-data");
  const harness = createWxHarness();
  const jobs = cloneJobs(EXAMPLE_JOBS).slice(0, 2);
  jobs[1] = { ...jobs[0], id: "offerA", title: "Offer A" };
  harness.storage.set(RESULT_KEY, { jobs, calculatedAt: 1 });
  const result = loadPage("../pages/result/result.js", harness.wx);
  result.onLoad();
  assert.match(result.data.summaryTitle, /持平/);
  assert.doesNotMatch(result.data.summaryTitle, /领先/);
  assert.equal(result.data.resultCards[0].annualLeaderLabel, "价值持平");
  assert.equal(result.data.resultCards[1].hourlyLeaderLabel, "时薪持平");
  assert.deepEqual(result.data.insightRows, []);
  jobs[1].housingFundBase = "";
  harness.storage.set(RESULT_KEY, { jobs, calculatedAt: 2 });
  result.onShow();
  assert.match(result.data.summaryTitle, /按已填写项目比较/);
  assert.match(result.data.summaryTitle, /部分公司公积金未计入/);
  assert.equal(result.data.benefitRows[3].cells[1].value, "未计入");
});

test("small genuine differences are not presented as zero", () => {
  const { EXAMPLE_JOBS, cloneJobs } = require("../utils/offer-data");
  const harness = createWxHarness();
  const jobs = cloneJobs(EXAMPLE_JOBS).slice(0, 2);
  jobs[1] = { ...jobs[0], id: "offerA", title: "Offer A", monthlySalary: "25010" };
  harness.storage.set(RESULT_KEY, { jobs, calculatedAt: 1 });
  const result = loadPage("../pages/result/result.js", harness.wx);
  result.onLoad();
  assert.equal(result.data.insightRows[0].value, "+140元");
  assert.equal(result.data.insightRows[1].value, "+不足1元/时");
  assert.equal(result.data.insightRows[2].value, "与当前相同");
});
