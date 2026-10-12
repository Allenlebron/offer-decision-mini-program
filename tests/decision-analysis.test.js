const assert = require("node:assert/strict");
const test = require("node:test");
const { createDraft, EXAMPLES, validateDecision } = require("../utils/decision-data");
const { calculateRent, calculateBudget, formatMoney, formatHours } = require("../utils/decision-analysis");

test("rent sample uses cents and round-trip commuting days", () => {
  const result = calculateRent(EXAMPLES.rent);
  assert.equal(result.a.costCents, 330000);
  assert.equal(result.b.costCents, 410000);
  assert.equal(result.a.hours, 44);
  assert.equal(result.b.hours, 22);
  assert.equal(result.costDifferenceCents, 80000);
  assert.equal(result.savedHours, 22);
  assert.equal(result.kind, "tradeoff");
  assert.equal(result.faster, "b");
  assert.equal(result.costPerHour.toFixed(2), "36.36");
});

test("rent tradeoff is symmetric and never produces a negative exchange rate", () => {
  const reversed = { ...EXAMPLES.rent };
  for (const key of ["Name", "Housing", "Transport", "Minutes"]) {
    reversed[`a${key}`] = EXAMPLES.rent[`b${key}`];
    reversed[`b${key}`] = EXAMPLES.rent[`a${key}`];
  }
  const result = calculateRent(reversed);
  assert.equal(result.faster, "a");
  assert.equal(result.costDifferenceCents, -80000);
  assert.equal(result.savedHours, -22);
  assert.equal(result.costPerHour.toFixed(2), "36.36");
});

test("rent handles all dominance and tie branches without dividing by zero", () => {
  assert.equal(calculateRent({ ...EXAMPLES.rent, bHousing: "2000" }).kind, "dominant");
  assert.equal(calculateRent({ ...EXAMPLES.rent, bMinutes: "90" }).kind, "dominant");
  const sameTime = calculateRent({ ...EXAMPLES.rent, days: "0" });
  assert.equal(sameTime.kind, "same-time");
  assert.equal(sameTime.a.costCents, 330000);
  assert.equal(sameTime.costPerHour, null);
  assert.equal(calculateRent({ ...EXAMPLES.rent, bHousing: "3200" }).kind, "same-cost");
  assert.equal(calculateRent({ ...EXAMPLES.rent, bHousing: "3200", bMinutes: "60" }).kind, "equal");
});

test("money arithmetic does not invent cent differences and small hours stay visible", () => {
  const result = calculateRent({ ...EXAMPLES.rent, aHousing: "0.10", aTransport: "0.20", bHousing: "0.30", bTransport: "0" });
  assert.equal(result.costDifferenceCents, 0);
  assert.equal(formatMoney(123456789.12), "123,456,789.12");
  assert.equal(formatHours(0.003), "不足 0.1");
  assert.equal(formatHours(0), "0");
});

test("budget sample subtracts reserve and one-time costs only once", () => {
  const result = calculateBudget(EXAMPLES.budget);
  assert.equal(result.availableCents, 4200000);
  assert.equal(result.burnCents, 500000);
  assert.equal(result.kind, "runway");
  assert.equal(result.monthsText, "8.4");
});

test("budget prioritizes an initial shortfall even with a monthly surplus", () => {
  const result = calculateBudget({ ...EXAMPLES.budget, cash: "10000", reserve: "8000", upfront: "5000", income: "10000" });
  assert.equal(result.kind, "shortfall");
  assert.equal(result.shortfallCents, 300000);
  assert.equal(result.monthsText, null);
});

test("budget zero burn and surplus never yield infinity or a freedom claim", () => {
  assert.equal(calculateBudget({ ...EXAMPLES.budget, income: "6000" }).kind, "balanced");
  const result = calculateBudget({ ...EXAMPLES.budget, income: "7000" });
  assert.equal(result.kind, "surplus");
  assert.equal(result.monthsText, null);
});

test("budget conservatively truncates months and distinguishes tiny from zero", () => {
  const zero = { cash: "0", reserve: "0", upfront: "0", spending: "3", income: "0" };
  assert.equal(calculateBudget(zero).monthsText, "0");
  assert.equal(calculateBudget({ ...zero, cash: "0.01" }).monthsText, "不足 0.1");
  assert.equal(calculateBudget({ ...zero, cash: "1" }).monthsText, "0.3");
  assert.equal(calculateBudget({ ...zero, cash: "0.30", spending: "0.10" }).monthsText, "3.0");
});

test("decision validation distinguishes unknown from explicit zero", () => {
  assert.equal(Object.keys(validateDecision("rent", createDraft("rent"))).length, 7);
  assert.equal(Object.keys(validateDecision("budget", createDraft("budget"))).length, 5);
  assert.deepEqual(validateDecision("rent", EXAMPLES.rent), {});
  assert.deepEqual(validateDecision("budget", EXAMPLES.budget), {});
  assert.deepEqual(validateDecision("budget", { cash: "0", reserve: "0", upfront: "0", spending: "0", income: "0" }), {});
});

test("validation rejects malformed values, limits, names and fractional days", () => {
  for (const value of ["", "-1", "12abc", "1e3", "Infinity", "NaN", "1,000", "0.001", "100000001", "  "]) {
    assert.ok(validateDecision("budget", { ...EXAMPLES.budget, cash: value }).cash, value);
  }
  assert.ok(validateDecision("rent", { ...EXAMPLES.rent, days: "22.5" }).days);
  assert.ok(validateDecision("rent", { ...EXAMPLES.rent, days: "32" }).days);
  assert.ok(validateDecision("rent", { ...EXAMPLES.rent, aMinutes: "720.1" }).aMinutes);
  assert.ok(validateDecision("rent", { ...EXAMPLES.rent, aName: "很长的住处名称不能超过十二个字" }).aName);
  assert.ok(validateDecision("budget", { ...EXAMPLES.budget, reserve: "60000.01" }).reserve);
  assert.throws(() => calculateRent(createDraft("rent")), /输入/);
  assert.throws(() => calculateBudget(createDraft("budget")), /输入/);
});

test("maximum supported amounts stay finite and retain exact cents", () => {
  const result = calculateBudget({ cash: "100000000", reserve: "0", upfront: "0", spending: "0.01", income: "0" });
  assert.equal(result.availableCents, 10000000000);
  assert.equal(result.monthsText, "10000000000.0");
  const rent = calculateRent({ ...EXAMPLES.rent, aHousing: "1000000", aTransport: "1000000", aMinutes: "720", days: "31" });
  assert.equal(rent.a.costCents, 200000000);
  assert.equal(rent.a.hours, 744);
});
