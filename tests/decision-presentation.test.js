const assert = require("node:assert/strict");
const test = require("node:test");
const { EXAMPLES } = require("../utils/decision-data");
const { presentDecision } = require("../utils/decision-presentation");

test("rent presents factual tradeoffs, assumptions and a bounded next step list", () => {
  const result = presentDecision("rent", EXAMPLES.rent);
  assert.equal(result.summary, "住处 B每月多花 800 元，节省 22 小时通勤。");
  assert.equal(result.metrics.length, 3);
  assert.equal(result.metrics[2].value, "36.36");
  assert.match(result.details[0].value, /3,300 元\/月 · 44 小时/);
  assert.match(result.caveat, /不含押金/);
  assert.equal(result.checks.length, 3);
});

test("presentation covers ties and one-dimensional differences without recommendations", () => {
  for (const patch of [{ bHousing: "3200", bMinutes: "60" }, { days: "0" }, { bHousing: "3200" }, { bHousing: "2000" }]) {
    const result = presentDecision("rent", { ...EXAMPLES.rent, ...patch });
    assert.doesNotMatch(JSON.stringify(result), /undefined|NaN|Infinity|推荐|最佳/);
    assert.equal(result.metrics.some((metric) => metric.label.includes("换回")), false);
  }
});

test("budget result discloses cashflow assumptions and never promises safety", () => {
  const result = presentDecision("budget", EXAMPLES.budget);
  assert.match(result.summary, /8.4 个月/);
  assert.match(result.assumptions.join(""), /月内到账/);
  assert.match(result.assumptions.join(""), /收入需持续/);
  assert.match(result.caveat, /不是辞职或财务安全建议/);
});

test("budget exceptional outputs remain legible and do not fabricate a duration", () => {
  for (const patch of [{ income: "6000" }, { income: "7000" }, { cash: "12000" }]) {
    const result = presentDecision("budget", { ...EXAMPLES.budget, ...patch });
    assert.equal(result.metrics.some((metric) => metric.unit === "个月"), false);
    assert.doesNotMatch(result.summary, /无限|安全|放心|自由/);
  }
  const zero = presentDecision("budget", { cash: "0", reserve: "0", upfront: "0", spending: "0", income: "0" });
  assert.match(zero.assumptions.join(""), /总支出为 0/);
});
