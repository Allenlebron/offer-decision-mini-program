const { SCENARIOS } = require("./decision-data");
const { calculateRent, calculateBudget, calculateStudy, calculatePurchase, calculateCity, calculateSide, formatMoney, formatHours } = require("./decision-analysis");

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
  const presentation = { rent: rentPresentation, budget: budgetPresentation, study: studyPresentation, purchase: purchasePresentation, city: cityPresentation, side: sidePresentation }[scenario](values);
  return { ...presentation, caveat: SCENARIOS[scenario].caveat, checks: SCENARIOS[scenario].checks };
}

function studyPresentation(values) {
  const result = calculateStudy(values);
  const { costCents, hours, targetMonths, gainCents, requiredGainCents, recoveryMonths } = result;
  let summary;
  if (!costCents) summary = `已填写的金钱投入为 0，另需 ${formatHours(hours)} 小时学习。`;
  else if (gainCents === null) summary = `想在增收后 ${targetMonths} 个月内回本，每月至少需多到账 ${formatMoney(requiredGainCents / 100)} 元。`;
  else if (!gainCents) summary = "假设月增收为 0，无法据此计算回本时间。";
  else summary = `按假设每月多到账 ${formatMoney(gainCents / 100)} 元，增收开始后约需 ${recoveryMonths} 个月回本金钱投入。`;
  const metrics = [moneyMetric("金钱投入（含停工损失）", costCents),
    { label: "另需学习时间", value: formatHours(hours), unit: "小时" },
    { ...moneyMetric(`增收后 ${targetMonths} 个月回本所需月增收`, requiredGainCents), unit: "元/月" }];
  if (recoveryMonths !== null && costCents > 0) metrics.push({ label: "按假设增收回本约需", value: String(recoveryMonths), unit: "个月" });
  return { summary, metrics,
    details: SCENARIOS.study.fields.map((field) => ({ label: field.label,
      value: field.key === "monthlyGain" && gainCents === null ? "未假设，不按 0 计算" : `${formatMoney(Number(values[field.key]))} ${field.unit}` })),
    assumptions: [
      "金钱投入 = 接下来要付的学费与考试费 + 其他学习支出 + 因学习减少的到账收入。已花且无法收回的费用不重复计入。",
      "学习时间单独展示，不再用时薪折算，避免与已填写的收入损失重复计算。",
      `所需月增收 = 金钱投入 ÷ ${targetMonths} 个月，向上取整到分；这是回本条件，不是涨薪预测。`,
      "回本时间 = 金钱投入 ÷ 假设月增收，向上保留一位小数，从增收开始算；前提是该增收持续发生。不含学习期、等待期和持续新增支出。",
      ...(gainCents === null ? ["未填写假设月增收，因此不展示预测回本月数。"] : []),
    ] };
}

function purchasePresentation(values) {
  const result = calculatePurchase(values);
  const { months, totalUses, options, lowest } = result;
  const unitCost = (cents) => cents > 0 && cents / totalUses < 1 ? "不足 0.01" : formatMoney(cents / totalUses / 100);
  return {
    summary: lowest.length === 3 ? "三种方案已填写的总成本相同。" : `按 ${months} 个月估算，${lowest.join("、")}的总成本${lowest.length > 1 ? "并列" : ""}较低。`,
    metrics: options.map((item) => moneyMetric(`${item.name} · ${months} 个月总成本`, item.costCents)),
    details: [
      { label: "统一比较周期", value: `${months} 个月 · 共预计使用 ${totalUses} 次` },
      ...options.map((item) => ({ label: `${item.name} · 单次使用成本`, value: totalUses ? `${unitCost(item.costCents)} 元/次` : "未计划使用，不计算单次成本" })),
      ...SCENARIOS.purchase.fields.filter((field) => !["months", "uses"].includes(field.key)).map((field) => ({ label: field.label, value: `${formatMoney(Number(values[field.key]))} ${field.unit}` })),
    ],
    assumptions: [
      "买的总成本 = 买入与期间总支出 − 新物品期末预计残值。租的总成本 = 每月租金 × 比较月数 + 额外总费用。",
      "继续用的总成本 = 现有物品当前可售净值 − 继续用后的期末残值 + 期间总支出。过去的买价是沉没成本，不再次计入。",
      "买或租时假设原物品可按当前净值出售；三种方案以相同的初始资产和周期末净值口径比较。不要再次从买入总支出扣旧物卖出款。",
      "单次成本 = 总成本 ÷（每月使用次数 × 月数）。租金按整月持续租用估算；预计使用次数为 0 时不计算单次成本。",
      "只比较金额，未把功能、便利、可靠性、环保或喜好折成分数。残值不是保证到账的钱，可退押金的资金占用需要另外核对。",
    ],
  };
}

function cityPresentation(values) {
  const { a, b, gainCents, moveCents, recoveryMonths } = calculateCity(values);
  const difference = `迁居后每月${gainCents > 0 ? "多" : "少"}结余 ${formatMoney(Math.abs(gainCents) / 100)} 元。`;
  const summary = b.surplusCents < 0
    ? `迁居后每月仍有 ${formatMoney(-b.surplusCents / 100)} 元缺口，不计算迁居支出回收时间。`
    : b.surplusCents === 0 ? "迁居后月收支相抵，没有月结余可用于回收迁居支出。"
      : gainCents === 0 ? "两地已填写的月结余相同，迁居没有增加月结余。" : difference;
  const metrics = [moneyMetric("当前月结余（负数为缺口）", a.surplusCents), moneyMetric("迁居后月结余（负数为缺口）", b.surplusCents),
    moneyMetric("月结余变化（迁居后 − 当前）", gainCents), moneyMetric("一次性迁居支出", moveCents)];
  if (recoveryMonths !== null && moveCents > 0) metrics.push({ label: "以月结余改善抵回迁居支出约需", value: String(recoveryMonths), unit: "个月" });
  return { summary, metrics,
    details: SCENARIOS.city.fields.map((field) => ({ label: field.label, value: `${formatMoney(Number(values[field.key]))} ${field.unit}` })),
    assumptions: [
      "每月结余 = 到账收入 − 住房支出 − 其他支出；负数表示现金收支缺口。月结余变化 = 迁居后结余 − 当前结余。",
      "仅在迁居后月结余为正、且比当前增加时，以一次性迁居支出 ÷ 月结余增加额估算抵回时间，向上保留一位小数。",
      "抵回时间是相对留在原地的差额比较，不代表实际现金积累速度。月收支需稳定，也不代表迁居前资金足够。",
      ...(moveCents === 0 ? ["本次一次性迁居支出为 0，没有这部分支出需要抵回；请确认没有漏项。"] : []),
      "不把公积金当作可自由使用的现金，不自动估税或套用城市平均工资、房价。通勤时间、照护和适应成本另行核对。",
    ] };
}

function sidePresentation(values) {
  const result = calculateSide(values);
  const { initialCents, marginCents, fixedCents, targetMonths, orders, hours, surplusCents, breakEvenOrders, targetOrders, recoveryMonths, hourlySurplus } = result;
  let summary;
  if (marginCents <= 0) summary = "每单收入不高于每单成本，没有正结余用于摊薄固定支出或回收投入，不计算保本单量。";
  else if (orders === null) summary = `想在 ${targetMonths} 个月内覆盖固定支出并回收前期投入，每月至少需完成 ${targetOrders} 单。这不是单量预测。`;
  else if (surplusCents < 0) summary = `按假设每月完成 ${orders} 单，每月仍亏 ${formatMoney(-surplusCents / 100)} 元，无法据此回收前期投入。`;
  else if (surplusCents === 0) summary = "按假设单量，月经营收支相抵，没有结余用于回收前期投入。";
  else summary = `按假设每月完成 ${orders} 单，月经营结余 ${formatMoney(surplusCents / 100)} 元；还需投入 ${formatHours(hours)} 小时。`;
  const metrics = [moneyMetric("每单结余（未扣固定支出）", marginCents), moneyMetric("前期投入", initialCents)];
  if (breakEvenOrders !== null) {
    metrics.push({ label: "仅覆盖固定月支出所需单量", value: String(breakEvenOrders), unit: "单/月" });
    metrics.push({ label: `${targetMonths} 个月内覆盖固定支出并回收投入`, value: String(targetOrders), unit: "单/月" });
  }
  if (surplusCents !== null) metrics.push(moneyMetric("假设月经营结余（负数为亏损）", surplusCents));
  if (initialCents > 0 && recoveryMonths !== null) metrics.push({ label: "按假设经营结余回收投入约需", value: String(recoveryMonths), unit: "个月" });
  let hourlyText = "未假设单量，不计算";
  if (orders !== null) hourlyText = hours === 0 ? "投入时间为 0，不计算" : `${Math.abs(hourlySurplus) > 0 && Math.abs(hourlySurplus) < 0.01 ? (hourlySurplus < 0 ? "亏损不足 0.01" : "不足 0.01") : formatMoney(hourlySurplus)} 元/小时`;
  return { summary, metrics,
    details: [
      { label: "经营结余 ÷ 总投入小时（不是工资）", value: hourlyText },
      ...SCENARIOS.side.fields.map((field) => ({ label: field.label, value: field.key === "orders" && orders === null ? "未假设，不按 0 计算" : `${formatMoney(Number(values[field.key]))} ${field.unit}` })),
    ],
    assumptions: [
      "每单结余 = 每单收入 − 每单成本；月经营结余 = 假设完成单量 × 每单结余 − 固定月支出。前期投入不再作为月支出重复扣除。",
      "仅覆盖固定月支出的单量 = 固定月支出 ÷ 每单结余；目标月单量 =（固定月支出 × 目标月数 + 前期投入）÷（每单结余 × 目标月数）。单量向上取整，每单结余不为正时不计算。",
      "回收时间 = 前期投入 ÷ 正的月经营结余，向上保留一位小数，从开始接单算起；前提是该收入与支出持续发生。不含筹备等待期。",
      "总投入时间包含获客与售后，不再按工资扣成成本。经营结余除以投入小时仅作观察，不等于到手时薪或已计所有风险的利润。",
      ...(initialCents === 0 ? ["本次前期投入为 0，没有前期款项需要回收；固定支出与亏损风险仍存在。"] : []),
      ...(fixedCents === 0 ? ["固定月支出为 0 时，覆盖它所需单量为 0，不代表无需工作就能获得收入。"] : []),
      ...(hours === 0 ? ["本次每月投入时间为 0，请核对获客、交付与售后是否漏填；不计算每小时结余。"] : []),
    ] };
}

module.exports = { presentDecision };
