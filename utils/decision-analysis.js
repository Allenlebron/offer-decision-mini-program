const { validateDecision } = require("./decision-data");

// Inputs are validated first. Scale decimal strings directly, not via binary floats.
function scaled(value, precision) {
  const [whole, fraction = ""] = String(value).trim().split(".");
  return Number(whole) * 10 ** precision + Number(fraction.padEnd(precision, "0"));
}

function assertValid(scenario, values) {
  if (Object.keys(validateDecision(scenario, values)).length) throw new Error("请检查输入后重新计算");
}

function calculateRent(values) {
  assertValid("rent", values);
  const days = Number(values.days);
  const options = ["a", "b"].map((id) => {
    const timeTenths = scaled(values[`${id}Minutes`], 1) * 2 * days;
    return {
      id,
      name: String(values[`${id}Name`] || "").trim() || `住处 ${id.toUpperCase()}`,
      costCents: scaled(values[`${id}Housing`], 2) + scaled(values[`${id}Transport`], 2),
      timeTenths,
      hours: timeTenths / 600,
    };
  });
  const [a, b] = options;
  const costDifferenceCents = b.costCents - a.costCents;
  const savedTenths = a.timeTenths - b.timeTenths;
  const savedHours = savedTenths / 600;
  const faster = savedTenths > 0 ? "b" : savedTenths < 0 ? "a" : null;
  const cheaper = costDifferenceCents > 0 ? "a" : costDifferenceCents < 0 ? "b" : null;
  let kind;
  if (!savedTenths && !costDifferenceCents) kind = "equal";
  else if (!savedTenths) kind = "same-time";
  else if (!costDifferenceCents) kind = "same-cost";
  else if (faster === cheaper) kind = "dominant";
  else kind = "tradeoff";

  return {
    a, b, days, costDifferenceCents, savedHours, faster, cheaper, kind,
    costPerHour: kind === "tradeoff" ? Math.abs(costDifferenceCents) * 6 / Math.abs(savedTenths) : null,
  };
}

function calculateBudget(values) {
  assertValid("budget", values);
  const rawAvailableCents = scaled(values.cash, 2) - scaled(values.reserve, 2) - scaled(values.upfront, 2);
  const availableCents = Math.max(0, rawAvailableCents);
  const burnCents = scaled(values.spending, 2) - scaled(values.income, 2);
  const kind = rawAvailableCents < 0 ? "shortfall" : burnCents > 0 ? "runway" : burnCents === 0 ? "balanced" : "surplus";
  let monthsText = null;
  if (kind === "runway") {
    const tenths = Math.floor(availableCents * 10 / burnCents);
    monthsText = availableCents === 0 ? "0" : tenths === 0 ? "不足 0.1" : (tenths / 10).toFixed(1);
  }
  return { kind, availableCents, burnCents, shortfallCents: Math.max(0, -rawAvailableCents), monthsText };
}

function formatMoney(value) {
  return value.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatHours(value) {
  if (value > 0 && value < 0.1) return "不足 0.1";
  return value.toFixed(1).replace(/\.0$/, "");
}

module.exports = { calculateRent, calculateBudget, formatMoney, formatHours };
