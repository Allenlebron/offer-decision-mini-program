const test = require("node:test");
const assert = require("node:assert/strict");
const { SCENARIOS, EXAMPLES, createDraft, validateDecision } = require("../utils/decision-data");
const { calculateStudy, calculatePurchase, calculateCity, calculateSide } = require("../utils/decision-analysis");
const { presentDecision } = require("../utils/decision-presentation");
const { KEYS, readDraft, saveDraft, clearDraft, clearAllData } = require("../utils/decision-storage");
const { scenarioShare } = require("../utils/share");

test("study separates cash and time and derives a monthly recovery requirement", () => {
  const result = calculateStudy(EXAMPLES.study);
  assert.equal(result.costCents, 1200000);
  assert.equal(result.hours, 120);
  assert.equal(result.requiredGainCents, 100000);
  assert.equal(result.recoveryMonths, 12);
  assert.equal(calculateStudy({ ...EXAMPLES.study, hours: "99999.9" }).costCents, result.costCents);
});

test("unknown study gains are not zero, and zero gain never yields an infinite recovery period", () => {
  for (const monthlyGain of ["", " ", "0"]) {
    const values = { ...EXAMPLES.study, monthlyGain };
    assert.deepEqual(validateDecision("study", values), {});
    const result = calculateStudy(values);
    assert.equal(result.gainCents, monthlyGain.trim() ? 0 : null);
    assert.equal(result.recoveryMonths, null);
    assert.equal(result.requiredGainCents, 100000);
    assert.doesNotMatch(JSON.stringify(presentDecision("study", values)), /Infinity|NaN|undefined/);
  }
  assert.match(presentDecision("study", { ...EXAMPLES.study, monthlyGain: "" }).details.at(-1).value, /未假设/);
});

test("study recovery rounds upward, preserves cents and keeps zero cash distinct from time", () => {
  const result = calculateStudy({ ...EXAMPLES.study, fees: "1", extras: "0", lostIncome: "0", targetMonths: "3", monthlyGain: "3" });
  assert.equal(result.requiredGainCents, 34);
  assert.equal(result.recoveryMonths, 0.4);
  const tiny = calculateStudy({ ...EXAMPLES.study, fees: "0.01", extras: "0", lostIncome: "0", monthlyGain: "1000000", targetMonths: "120" });
  assert.equal(tiny.requiredGainCents, 1); assert.equal(tiny.recoveryMonths, 0.1);
  const zero = presentDecision("study", { ...EXAMPLES.study, fees: "0", extras: "0", lostIncome: "0" });
  assert.match(zero.summary, /金钱投入为 0，另需 120 小时/);
  assert.doesNotMatch(zero.summary, /免费|无需投入|值得/);
});

test("new fields reject missing required values, malformed gains and invalid periods", () => {
  assert.ok(Object.keys(validateDecision("study", createDraft("study"))).length);
  assert.ok(Object.keys(validateDecision("purchase", createDraft("purchase"))).length);
  for (const value of ["0", "-1", "1.5", "121", "12abc"]) {
    assert.ok(validateDecision("study", { ...EXAMPLES.study, targetMonths: value }).targetMonths);
    assert.ok(validateDecision("purchase", { ...EXAMPLES.purchase, months: value }).months);
  }
  for (const value of ["-1", "1e3", "1000000.01", "1.234", "not sure"]) assert.ok(validateDecision("study", { ...EXAMPLES.study, monthlyGain: value }).monthlyGain);
  assert.ok(validateDecision("study", { ...EXAMPLES.study, hours: "0.01" }).hours);
  assert.ok(validateDecision("purchase", { ...EXAMPLES.purchase, uses: "1.5" }).uses);
  assert.throws(() => calculateStudy(createDraft("study")), /输入/);
  assert.throws(() => calculatePurchase(createDraft("purchase")), /输入/);
});

test("purchase compares one horizon and counts depreciation instead of past purchase price", () => {
  const result = calculatePurchase(EXAMPLES.purchase);
  assert.equal(result.months, 12); assert.equal(result.totalUses, 240);
  assert.deepEqual(result.options.map((item) => item.costCents), [300000, 380000, 130000]);
  assert.deepEqual(result.lowest, ["继续用"]);
  const presentation = presentDecision("purchase", EXAMPLES.purchase);
  assert.equal(presentation.metrics[2].value, "1,300");
  assert.equal(presentation.details[1].value, "12.5 元/次");
  assert.match(presentation.assumptions.join(""), /过去的买价是沉没成本/);
});

test("purchase validates residual assumptions and never creates negative costs", () => {
  assert.ok(validateDecision("purchase", { ...EXAMPLES.purchase, buyResale: "6000.01" }).buyResale);
  assert.ok(validateDecision("purchase", { ...EXAMPLES.purchase, keepResale: "1500.01" }).keepResale);
  const values = { ...EXAMPLES.purchase, buyCost: "0.30", buyResale: "0.10", rentMonthly: "0.01", rentExtras: "0.08", currentValue: "0.30", keepResale: "0.20", keepCost: "0.10" };
  assert.deepEqual(calculatePurchase(values).options.map((item) => item.costCents), [20, 20, 20]);
  assert.equal(calculatePurchase(values).lowest.length, 3);
  assert.match(presentDecision("purchase", values).summary, /成本相同/);
});

test("purchase handles all minimum sets, unused items and tiny nonzero per-use costs", () => {
  const values = { ...EXAMPLES.purchase, buyCost: "10", buyResale: "0", rentMonthly: "1", rentExtras: "0", currentValue: "10", keepResale: "0", keepCost: "0" };
  assert.deepEqual(calculatePurchase(values).lowest, ["买", "继续用"]);
  assert.deepEqual(calculatePurchase({ ...values, rentMonthly: "0" }).lowest, ["租"]);
  assert.deepEqual(calculatePurchase({ ...values, buyResale: "10" }).lowest, ["买"]);
  const idle = presentDecision("purchase", { ...values, uses: "0" });
  assert.match(idle.details[1].value, /不计算/);
  assert.doesNotMatch(JSON.stringify(idle), /Infinity|NaN|undefined/);
  const tiny = presentDecision("purchase", { ...values, buyCost: "0.01", uses: "10000" });
  assert.equal(tiny.details[1].value, "不足 0.01 元/次");
});

test("new scenario maximum values stay finite and integer arithmetic remains exact", () => {
  const study = calculateStudy({ ...EXAMPLES.study, fees: "100000000", extras: "100000000", lostIncome: "100000000", monthlyGain: "0.01", targetMonths: "1" });
  assert.equal(study.costCents, 30000000000); assert.equal(study.recoveryMonths, 30000000000);
  const purchase = calculatePurchase({ months: "120", uses: "10000", buyCost: "100000000", buyResale: "0", rentMonthly: "1000000", rentExtras: "100000000", currentValue: "100000000", keepResale: "0", keepCost: "100000000" });
  assert.equal(purchase.totalUses, 1200000);
  for (const option of purchase.options) assert.equal(Number.isSafeInteger(option.costCents), true);
});

test("study and purchase storage restores step and remains isolated from old drafts", () => {
  const data = new Map();
  global.wx = { getStorageSync: (key) => structuredClone(data.get(key)), setStorageSync: (key, value) => data.set(key, structuredClone(value)), removeStorageSync: (key) => data.delete(key) };
  for (const id of Object.keys(EXAMPLES)) saveDraft(id, EXAMPLES[id], true, 0);
  saveDraft("study", { ...EXAMPLES.study, monthlyGain: "" }, false, 1);
  assert.equal(readDraft("study").draft.step, 1); assert.equal(readDraft("study").draft.values.monthlyGain, "");
  assert.equal(readDraft("purchase").draft.values.currentValue, "1500");
  clearDraft("purchase"); assert.equal(data.has(KEYS.study), true); assert.equal(data.has(KEYS.budget), true);
  clearAllData(); assert.equal(data.size, 0);
});

test("new scenario shares are fixed entries with no financial assumptions or results", () => {
  for (const id of ["study", "purchase", "city", "side"]) {
    const share = scenarioShare(id);
    assert.equal(share.path, `/pages/decision/decision?scenario=${id}`);
    assert.equal(share.imageUrl, "/images/share-entry.png");
    assert.doesNotMatch(JSON.stringify(share), /6000|1500|12000|monthlyGain|keepResale/);
  }
  for (const id of ["constructor", "__proto__", "https://example.com", null]) assert.equal(scenarioShare(id).path, "/pages/home/home");
});

test("city compares exact cash surpluses and recovers relocation cost from the difference", () => {
  const result = calculateCity(EXAMPLES.city);
  assert.equal(result.a.surplusCents, 450000); assert.equal(result.b.surplusCents, 600000);
  assert.equal(result.gainCents, 150000); assert.equal(result.moveCents, 900000);
  assert.equal(result.recoveryMonths, 6);
  assert.equal(calculateCity({ ...EXAMPLES.city, moveCost: "1", bIncome: "13503" }).recoveryMonths, 0.4);
});

test("city prioritizes destination shortfall, suppresses recovery at zero or lower surpluses", () => {
  for (const [aIncome, bIncome, expected] of [["12000", "8000", /仍有 1,000 元缺口/], ["0", "9000", /收支相抵/], ["12000", "13500", /月结余相同/], ["12000", "10000", /少结余 3,500/]]) {
    const values = { ...EXAMPLES.city, aIncome, bIncome };
    assert.equal(calculateCity(values).recoveryMonths, null);
    assert.match(presentDecision("city", values).summary, expected);
  }
  const zero = presentDecision("city", { ...EXAMPLES.city, moveCost: "0" });
  assert.equal(zero.metrics.length, 4); assert.match(zero.assumptions.join(""), /没有这部分支出需要抵回/);
});

test("city difference is relative to staying, not a claim of actual cash accumulation", () => {
  const values = { ...EXAMPLES.city, aIncome: "6500", bIncome: "10000" };
  const result = calculateCity(values);
  assert.equal(result.a.surplusCents, -100000); assert.equal(result.b.surplusCents, 100000);
  assert.equal(result.recoveryMonths, 4.5);
  assert.match(presentDecision("city", values).assumptions.join(""), /不代表实际现金积累速度/);
});

test("side calculates operating break-even, target orders and separates time", () => {
  const result = calculateSide(EXAMPLES.side);
  assert.equal(result.marginCents, 6000); assert.equal(result.breakEvenOrders, 10);
  assert.equal(result.targetOrders, 19); assert.equal(result.surplusCents, 120000);
  assert.equal(result.recoveryMonths, 2.5); assert.equal(result.hourlySurplus, 30);
  assert.equal(calculateSide({ ...EXAMPLES.side, hours: "744" }).surplusCents, result.surplusCents);
});

test("unknown side orders stay unknown and zero orders retain fixed losses", () => {
  for (const orders of ["", " "]) {
    const values = { ...EXAMPLES.side, orders };
    assert.deepEqual(validateDecision("side", values), {});
    const result = calculateSide(values);
    assert.equal(result.orders, null); assert.equal(result.surplusCents, null);
    assert.equal(result.recoveryMonths, null); assert.equal(result.hourlySurplus, null);
    assert.match(presentDecision("side", values).summary, /每月至少需完成 19 单/);
  }
  const zero = calculateSide({ ...EXAMPLES.side, orders: "0" });
  assert.equal(zero.surplusCents, -60000); assert.equal(zero.recoveryMonths, null);
  assert.match(presentDecision("side", { ...EXAMPLES.side, orders: "0" }).summary, /每月仍亏 600/);
});

test("nonpositive unit margins never yield fabricated break-even order counts", () => {
  for (const unitCost of ["100", "120"]) {
    const values = { ...EXAMPLES.side, unitCost };
    const result = calculateSide(values);
    assert.equal(result.breakEvenOrders, null); assert.equal(result.targetOrders, null);
    assert.equal(result.recoveryMonths, null);
    assert.match(presentDecision("side", values).summary, /没有正结余/);
  }
  assert.match(presentDecision("side", { ...EXAMPLES.side, orders: "10" }).summary, /收支相抵/);
});

test("side rounds whole orders and recovery upward without rounding intermediate cents", () => {
  const result = calculateSide({ ...EXAMPLES.side, price: "0.03", unitCost: "0.01", fixedMonthly: "0.01", initialCost: "0.01", targetMonths: "3", orders: "2" });
  assert.equal(result.marginCents, 2); assert.equal(result.breakEvenOrders, 1);
  assert.equal(result.targetOrders, 1); assert.equal(result.recoveryMonths, 0.4);
  // N orders must cover all target-period costs; N-1 must fail unless no cost exists.
  for (const initialCost of ["0", "0.01", "3000", "100000000"]) {
    const r = calculateSide({ ...EXAMPLES.side, initialCost });
    const total = r.fixedCents * r.targetMonths + r.initialCents;
    assert.ok(r.targetOrders * r.marginCents * r.targetMonths >= total);
    if (r.targetOrders) assert.ok((r.targetOrders - 1) * r.marginCents * r.targetMonths < total);
  }
});

test("zero side costs and time do not imply free income or infinite hourly earnings", () => {
  const values = { ...EXAMPLES.side, fixedMonthly: "0", initialCost: "0", hours: "0" };
  const result = calculateSide(values);
  assert.equal(result.breakEvenOrders, 0); assert.equal(result.targetOrders, 0);
  assert.equal(result.hourlySurplus, null);
  const presentation = presentDecision("side", values);
  assert.match(presentation.details[0].value, /不计算/);
  assert.match(presentation.assumptions.join(""), /不代表无需工作/);
  assert.equal(presentation.metrics.some((item) => item.label.includes("回收投入约需")), false);
  const tiny = presentDecision("side", { ...EXAMPLES.side, price: "0", unitCost: "0.01", orders: "1", fixedMonthly: "0", hours: "744" });
  assert.match(tiny.details[0].value, /亏损不足 0.01/);
});

test("city and side field limits, maximum amounts and finite presentations", () => {
  for (const scenario of ["city", "side"]) {
    assert.ok(Object.keys(validateDecision(scenario, createDraft(scenario))).length);
    for (const field of SCENARIOS[scenario].fields) {
      for (const invalid of ["-1", "1e3", "NaN", "1.111", String(field.max + 1)]) {
        assert.ok(validateDecision(scenario, { ...EXAMPLES[scenario], [field.key]: invalid })[field.key]);
      }
    }
    const maximum = Object.fromEntries(SCENARIOS[scenario].fields.map((field) => [field.key, String(field.max)]));
    const presentation = presentDecision(scenario, maximum);
    assert.doesNotMatch(JSON.stringify(presentation), /Infinity|NaN|undefined/);
  }
  const largest = calculateSide({ ...EXAMPLES.side, price: "1000000", unitCost: "0", orders: "100000", initialCost: "100000000", fixedMonthly: "1000000", targetMonths: "120" });
  assert.equal(Number.isSafeInteger(largest.surplusCents), true);
  assert.equal(largest.surplusCents, 9999900000000);
  for (const scenario of ["city", "side"]) assert.doesNotMatch(JSON.stringify(presentDecision(scenario, EXAMPLES[scenario])), /Infinity|NaN|undefined/);
});
