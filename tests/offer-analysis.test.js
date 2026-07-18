const assert = require("node:assert/strict");
const test = require("node:test");

const {
  analyzeResults,
  calculateJob,
} = require("../utils/offer-analysis");

function job(id, title, monthlySalary, salaryMonths, bonus, weeklyHours, commute) {
  return calculateJob({
    id,
    title,
    monthlySalary: String(monthlySalary),
    salaryMonths: String(salaryMonths),
    guaranteedBonusMonths: String(bonus),
    weeklyHours: String(weeklyHours),
    commuteMinutes: String(commute),
  });
}

function closeTo(actual, expected, precision = 0.01) {
  assert.ok(
    Math.abs(actual - expected) <= precision,
    `expected ${actual} to be within ${precision} of ${expected}`,
  );
}

test("calculates the website example with the same result", () => {
  const current = job("current", "当前工作", 25000, 13, 1, 45, 45);
  const offerA = job("offerA", "Offer A", 32000, 14, 0, 55, 70);
  const offerB = job("offerB", "Offer B", 29000, 13, 2, 42, 30);
  const analysis = analyzeResults([current, offerA, offerB]);

  assert.equal(current.guaranteedAnnual, 350000);
  assert.equal(current.totalHours, 2520);
  closeTo(current.hourlyValue, 138.89);
  assert.equal(offerA.guaranteedAnnual, 448000);
  closeTo(offerB.hourlyValue, 192.82);
  assert.equal(
    analysis.headline,
    "Offer A的税前保证年收入最高，Offer B的税前有效时薪最高。",
  );
  closeTo(analysis.breakEven.extraBonusMonths, 5.28);
  closeTo(analysis.breakEven.weeklyHoursReduction, 18.26);
});

test("handles a current job winner and an impossible hours catch-up", () => {
  const current = job("current", "当前工作", 50000, 14, 2, 40, 10);
  const offerA = job("offerA", "Offer A", 20000, 12, 0, 60, 90);
  const analysis = analyzeResults([current, offerA]);

  assert.equal(
    analysis.headline,
    "当前工作在税前保证年收入和税前有效时薪上都领先。",
  );
  closeTo(analysis.breakEven.extraBonusMonths, 60);
  assert.equal(analysis.breakEven.weeklyHoursReduction, null);
});

test("does not invent a break-even target for ties", () => {
  const current = job("current", "当前工作", 25000, 13, 1, 45, 45);
  const offerA = job("offerA", "Offer A", 25000, 13, 1, 45, 45);
  const analysis = analyzeResults([current, offerA]);

  assert.equal(
    analysis.headline,
    "所有选项的税前保证年收入和税前有效时薪持平。",
  );
  assert.equal(analysis.breakEven, null);
});
