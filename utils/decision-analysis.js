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

function calculateStudy(values) {
  assertValid("study", values);
  const costCents = scaled(values.fees, 2) + scaled(values.extras, 2) + scaled(values.lostIncome, 2);
  const targetMonths = Number(values.targetMonths);
  const gainCents = String(values.monthlyGain ?? "").trim() === "" ? null : scaled(values.monthlyGain, 2);
  return { costCents, hours: Number(values.hours), targetMonths, gainCents,
    requiredGainCents: Math.ceil(costCents / targetMonths),
    // Round up: never present a shorter recovery period than the assumption supports.
    recoveryMonths: gainCents > 0 ? Math.ceil(costCents * 10 / gainCents) / 10 : null,
  };
}

function calculatePurchase(values) {
  assertValid("purchase", values);
  const months = Number(values.months);
  const totalUses = Number(values.uses) * months;
  const options = [
    { id: "buy", name: "买", costCents: scaled(values.buyCost, 2) - scaled(values.buyResale, 2) },
    { id: "rent", name: "租", costCents: scaled(values.rentMonthly, 2) * months + scaled(values.rentExtras, 2) },
    { id: "keep", name: "继续用", costCents: scaled(values.currentValue, 2) - scaled(values.keepResale, 2) + scaled(values.keepCost, 2) },
  ];
  const minimum = Math.min(...options.map((item) => item.costCents));
  return { months, totalUses, options, lowest: options.filter((item) => item.costCents === minimum).map((item) => item.name) };
}

function formatHours(value) {
  if (value > 0 && value < 0.1) return "不足 0.1";
  return value.toFixed(1).replace(/\.0$/, "");
}

function calculateCity(values) {
  assertValid("city", values);
  const options = ["a", "b"].map((id) => ({ id,
    incomeCents: scaled(values[`${id}Income`], 2),
    spendingCents: scaled(values[`${id}Housing`], 2) + scaled(values[`${id}Other`], 2),
  })).map((item) => ({ ...item, surplusCents: item.incomeCents - item.spendingCents }));
  const [a, b] = options;
  const gainCents = b.surplusCents - a.surplusCents;
  const moveCents = scaled(values.moveCost, 2);
  return { a, b, gainCents, moveCents,
    recoveryMonths: gainCents > 0 && b.surplusCents > 0 ? Math.ceil(moveCents * 10 / gainCents) / 10 : null,
  };
}

function calculateSide(values) {
  assertValid("side", values);
  const initialCents = scaled(values.initialCost, 2);
  const marginCents = scaled(values.price, 2) - scaled(values.unitCost, 2);
  const fixedCents = scaled(values.fixedMonthly, 2);
  const targetMonths = Number(values.targetMonths);
  const orders = String(values.orders ?? "").trim() === "" ? null : Number(values.orders);
  const surplusCents = orders === null ? null : orders * marginCents - fixedCents;
  const hours = Number(values.hours);
  return { initialCents, marginCents, fixedCents, targetMonths, orders, hours, surplusCents,
    breakEvenOrders: marginCents > 0 ? Math.ceil(fixedCents / marginCents) : null,
    targetOrders: marginCents > 0 ? Math.ceil((fixedCents * targetMonths + initialCents) / (marginCents * targetMonths)) : null,
    recoveryMonths: surplusCents > 0 ? Math.ceil(initialCents * 10 / surplusCents) / 10 : null,
    hourlySurplus: surplusCents !== null && hours > 0 ? surplusCents / 100 / hours : null,
  };
}

module.exports = { calculateRent, calculateBudget, calculateStudy, calculatePurchase, calculateCity, calculateSide, formatMoney, formatHours };
