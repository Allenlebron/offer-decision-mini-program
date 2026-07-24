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
    "Offer A的年综合价值最高，Offer B的综合时薪最高。",
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
    "当前工作在年综合价值和综合时薪上都领先。",
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
    "所有选项的年综合价值和综合时薪持平。",
  );
  assert.equal(analysis.breakEven, null);
});

test("includes employer housing fund in annual value and hourly value", () => {
  const result = calculateJob({
    id: "current",
    title: "当前工作",
    monthlySalary: "25000",
    salaryMonths: "13",
    guaranteedBonusMonths: "1",
    weeklyHours: "45",
    commuteMinutes: "45",
    socialInsuranceBase: "25000",
    housingFundBase: "25000",
    employerHousingFundRate: "12",
  });

  assert.equal(result.guaranteedAnnual, 350000);
  assert.equal(result.socialInsuranceBase, 25000);
  assert.equal(result.housingFundBase, 25000);
  assert.equal(result.employerHousingFundRate, 12);
  assert.equal(result.employerHousingFundAnnual, 36000);
  assert.equal(result.totalAnnualValue, 386000);
  closeTo(result.hourlyValue, 153.17);
  assert.equal(result.hasBenefitData, true);
});

test("uses annual value including housing fund to decide the leader", () => {
  const current = calculateJob({
    id: "current",
    title: "当前工作",
    monthlySalary: "25000",
    salaryMonths: "13",
    guaranteedBonusMonths: "1",
    weeklyHours: "40",
    commuteMinutes: "0",
    housingFundBase: "25000",
    employerHousingFundRate: "12",
  });
  const offerA = calculateJob({
    id: "offerA",
    title: "Offer A",
    monthlySalary: "27000",
    salaryMonths: "14",
    guaranteedBonusMonths: "0",
    weeklyHours: "40",
    commuteMinutes: "0",
  });
  const analysis = analyzeResults([current, offerA]);

  assert.equal(current.guaranteedAnnual, 350000);
  assert.equal(offerA.guaranteedAnnual, 378000);
  assert.equal(current.totalAnnualValue, 386000);
  assert.equal(analysis.annualLeaders[0].id, "current");
  assert.equal(analysis.hourlyLeaders[0].id, "current");
});
