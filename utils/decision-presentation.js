const { SCENARIOS } = require("./decision-data");
const { calculateRent, calculateBudget, formatMoney, formatHours } = require("./decision-analysis");

function moneyMetric(label, cents) {
  return { label, value: formatMoney(cents / 100), unit: "元" };
}

function rentPresentation(values) {
  const result = calculateRent(values);
  const { a, b, faster, cheaper, kind, savedHours, costDifferenceCents } = result;
  const options = { a, b };
  const costText = formatMoney(Math.abs(costDifferenceCents) / 100);
  const hoursText = formatHours(Math.abs(savedHours));
  let summary;
  const metrics = [];
  if (kind === "tradeoff") {
    summary = `${options[faster].name}每月多花 ${costText} 元，节省 ${hoursText} 小时通勤。`;
    metrics.push(moneyMetric("每月额外支出", Math.abs(costDifferenceCents)));
    metrics.push({ label: "每月节省通勤", value: hoursText, unit: "小时" });
    metrics.push({ label: "每换回一小时约花", value: result.costPerHour.toFixed(2), unit: "元" });
  } else if (kind === "dominant") {
    summary = `在已填写的支出与通勤上，${options[faster].name}均更低。`;
    metrics.push(moneyMetric("每月减少支出", Math.abs(costDifferenceCents)));
    metrics.push({ label: "每月减少通勤", value: hoursText, unit: "小时" });
  } else if (kind === "same-time") {
    summary = `通勤时间相同，${options[cheaper].name}每月少花 ${costText} 元。`;
    metrics.push(moneyMetric("每月减少支出", Math.abs(costDifferenceCents)));
  } else if (kind === "same-cost") {
    summary = `月支出相同，${options[faster].name}每月少通勤 ${hoursText} 小时，无需增加月支出。`;
    metrics.push({ label: "每月减少通勤", value: hoursText, unit: "小时" });
  } else {
    summary = "已填写的月支出与通勤时间相同。";
  }
  return {
    kind, summary, metrics,
    details: [a, b].map((option) => ({
      label: option.name,
      value: `${formatMoney(option.costCents / 100)} 元/月 · ${formatHours(option.hours)} 小时通勤/月`,
    })),
    assumptions: [
      `两处均按每月通勤 ${result.days} 天，单程时间乘 2 计算往返。`,
      "月支出 = 住房总支出 + 通勤交通费。没有将个人时薪当作空闲时间的价格。",
      ...(result.days === 0 ? ["本次通勤时间为 0；交通月票等已填写支出仍保留。"] : []),
    ],
  };
}

function budgetPresentation(values) {
  const result = calculateBudget(values);
  const { kind, availableCents, burnCents, shortfallCents, monthsText } = result;
  let summary;
  const metrics = [];
  if (kind === "shortfall") {
    summary = `预留资金与一次性支出超过当前资金 ${formatMoney(shortfallCents / 100)} 元。`;
    metrics.push(moneyMetric("起点资金缺口", shortfallCents));
  } else if (kind === "runway") {
    summary = `按当前固定月预算，可覆盖${monthsText.startsWith("不足") ? "" : "约 "}${monthsText} 个月。`;
    metrics.push({ label: "估算可覆盖", value: monthsText, unit: "个月" });
    metrics.push(moneyMetric("可用预算", availableCents));
    metrics.push(moneyMetric("每月净支出", burnCents));
  } else {
    summary = kind === "balanced"
      ? "按当前月预算收支相抵，未计算资金耗尽时间。"
      : `按当前月预算每月结余 ${formatMoney(-burnCents / 100)} 元，未计算资金耗尽时间。`;
    metrics.push(moneyMetric("可用预算", availableCents));
    metrics.push(moneyMetric(kind === "balanced" ? "每月净支出" : "每月结余", Math.abs(burnCents)));
  }
  return {
    kind, summary, metrics,
    details: SCENARIOS.budget.fields.map((field) => ({ label: field.label, value: `${formatMoney(Number(values[field.key]))} ${field.unit}` })),
    assumptions: [
      "可用预算 = 当前资金 − 预留资金 − 一次性支出；起点有缺口时不计算月数。",
      "每月净支出 = 月总支出 − 确定的其他到账收入；正数时以可用预算除以净支出。",
      "覆盖月数向下保留一位小数。未考虑月内到账时点，不生成具体耗尽日期。",
      "收入需持续、月预算需稳定；中途收入停止或支出变化时，应分阶段另算。",
      ...(Number(values.spending) === 0 ? ["本次每月总支出为 0，请确认房租、还款及生活等没有漏项。"] : []),
    ],
  };
}

function presentDecision(scenario, values) {
  const presentation = scenario === "rent" ? rentPresentation(values) : budgetPresentation(values);
  return { ...presentation, caveat: SCENARIOS[scenario].caveat, checks: SCENARIOS[scenario].checks };
}

module.exports = { presentDecision };
