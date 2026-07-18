const assert = require("node:assert/strict");
const test = require("node:test");

const {
  DRAFT_KEY,
  RESULT_KEY,
  METRICS_KEY,
} = require("../utils/storage");

function createWxHarness() {
  const storage = new Map();
  const calls = {
    clipboard: [],
    navigateTo: [],
    pageScrollTo: [],
    reLaunch: [],
    toasts: [],
  };

  return {
    calls,
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
      navigateBack() {},
      reLaunch(options) {
        calls.reLaunch.push(options.url);
      },
      showModal(options) {
        options.success?.({ confirm: false });
      },
      setClipboardData(options) {
        calls.clipboard.push(options.data);
        options.success?.();
        options.complete?.();
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

  result.selectFeedback({ currentTarget: { dataset: { value: "重新谈薪" } } });
  assert.equal(result.data.selectedFeedback, "重新谈薪");
  assert.equal(harness.storage.get(METRICS_KEY).feedback, "重新谈薪");

  result.copyReceipt();
  assert.equal(result.data.isCopying, false);
  assert.equal(result.data.receiptStatus, "匿名验证回执已复制");
  assert.match(harness.calls.clipboard[0], /下一步：重新谈薪/);

  const share = result.onShareAppMessage();
  assert.equal(share.title, result.data.headline);
  assert.equal(harness.storage.get(METRICS_KEY).shares, 1);
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
