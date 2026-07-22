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
  assert.deepEqual(harness.storage.get(DRAFT_KEY), calculator.data.jobs);

  calculator.calculate();
  assert.deepEqual(harness.calls.navigateTo, ["/pages/result/result"]);
  assert.equal(harness.storage.get(RESULT_KEY).jobs.length, 3);
  assert.equal(harness.storage.get(METRICS_KEY).calculations, 1);

  const result = loadPage("../pages/result/result.js", harness.wx, [calculator]);
  result.onLoad();
  assert.equal(result.data.empty, false);
  assert.equal(result.data.resultCards.length, 3);
  assert.equal(
    result.data.headline,
    "Offer A的税前保证年收入最高，Offer B的税前有效时薪最高。",
  );
  assert.equal(result.data.breakEven.extraBonusMonths, "5.3");
  assert.equal(result.data.breakEven.weeklyHoursReduction, "18.3");
  assert.equal(
    result.data.summaryTitle,
    "Offer A 收入更高，Offer B 时间回报更高",
  );
  assert.equal(
    result.data.comparisonRows[0].cells[1].a11yLabel,
    "Offer A，保证年收入，44.8万",
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
  assert.equal(breakEven.data.activeScenario.extraBonusText, "+5.3个月");
  assert.equal(breakEven.data.activeScenario.hoursReductionText, "−18.3小时");

  breakEven.changeBonus({ detail: { value: 5.3 } });
  assert.equal(breakEven.data.caughtUp, true);
  assert.equal(breakEven.data.statusText, "已经追平");
  assert.equal(harness.storage.get(RESULT_KEY).jobs[1].guaranteedBonusMonths, "0");
  breakEven.resetScenario();
  assert.equal(breakEven.data.draftBonusValue, 0);

  const share = result.onShareAppMessage();
  assert.equal(share.title, result.data.headline);
  assert.equal(share.path, "/pages/calculator/calculator?source=result");
  assert.equal(harness.storage.get(METRICS_KEY).shares, 1);

  const breakEvenShare = breakEven.onShareAppMessage();
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

test("guides users through one job at a time and supports quick values", () => {
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
  assert.match(calculator.data.generalError, /先完成当前工作/);

  calculator.fillExample();
  calculator.advance();
  assert.equal(calculator.data.activeJob.id, "offerA");
  assert.equal(calculator.data.primaryActionText, "下一份：Offer B");

  calculator.switchJob({ currentTarget: { dataset: { index: 2 } } });
  calculator.selectPreset({
    currentTarget: {
      dataset: { jobId: "offerB", key: "commuteMinutes", value: "60" },
    },
  });
  assert.equal(calculator.data.jobs[2].commuteMinutes, "60");
  assert.equal(calculator.data.activeJob.fields[4].presets[3].selected, true);

  calculator.clearField({
    currentTarget: {
      dataset: { jobId: "offerB", key: "commuteMinutes" },
    },
  });
  assert.equal(calculator.data.jobs[2].commuteMinutes, "");
  calculator.selectPreset({
    currentTarget: {
      dataset: { jobId: "offerB", key: "commuteMinutes", value: "60" },
    },
  });

  calculator.advance();
  assert.deepEqual(harness.calls.navigateTo, ["/pages/result/result"]);
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
