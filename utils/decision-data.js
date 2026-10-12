const RENT_FIELDS = [
  { key: "aName", label: "住处 A 名称", text: true, optional: true, maxLength: 12, step: 0, hint: "可留空，不需要填写真实地址" },
  { key: "aHousing", label: "每月住房总支出", unit: "元/月", max: 1000000, precision: 2, step: 0, hint: "月租、物业等；水电可填月均估算" },
  { key: "aTransport", label: "每月通勤交通费", unit: "元/月", max: 1000000, precision: 2, step: 0, hint: "没有支出请填 0；两处按相同天数估算" },
  { key: "aMinutes", label: "单程通勤时间", unit: "分钟", max: 720, precision: 1, step: 0, hint: "包括步行和候车，建议用高峰实测时间" },
  { key: "days", label: "每月通勤天数", unit: "天", max: 31, precision: 0, step: 0, hint: "两处住处共用；居家办公可填 0" },
  { key: "bName", label: "住处 B 名称", text: true, optional: true, maxLength: 12, step: 1, hint: "可留空，不需要填写真实地址" },
  { key: "bHousing", label: "每月住房总支出", unit: "元/月", max: 1000000, precision: 2, step: 1, hint: "月租、物业等；水电可填月均估算" },
  { key: "bTransport", label: "每月通勤交通费", unit: "元/月", max: 1000000, precision: 2, step: 1, hint: "没有支出请填 0；与住处 A 使用相同天数" },
  { key: "bMinutes", label: "单程通勤时间", unit: "分钟", max: 720, precision: 1, step: 1, hint: "包括步行和候车，建议用高峰实测时间" },
];

const BUDGET_FIELDS = [
  { key: "cash", label: "当前可动用资金", unit: "元", max: 100000000, precision: 2, step: 0, hint: "已到账的现金、存款；不含授信、公积金、未到账补偿或待变现资产" },
  { key: "reserve", label: "不计划动用的预留资金", unit: "元", max: 100000000, precision: 2, step: 0, hint: "已包含在上方资金中，没有预留请填 0" },
  { key: "upfront", label: "近期一次性支出", unit: "元", max: 100000000, precision: 2, step: 0, hint: "在起点扣除，不再算进月支出；没有请填 0" },
  { key: "spending", label: "每月总支出", unit: "元/月", max: 1000000, precision: 2, step: 0, hint: "合计房租、生活、还款和自缴保障等；填 0 时请确认没有漏项" },
  { key: "income", label: "每月确定的其他到账收入", unit: "元/月", max: 1000000, precision: 2, step: 0, hint: "需覆盖所算期间；没有请填 0，不含预计求职收入、投资收益或未确认补贴" },
];

const SCENARIOS = {
  rent: {
    title: "住近一点值不值",
    description: "算清多花的钱，能换回多少通勤时间。",
    steps: ["住处 A", "住处 B"],
    fields: RENT_FIELDS,
    caveat: "仅比较经常性月支出，不含押金占用、搬家、中介费或退租损失。",
    checks: ["实测高峰通勤，包含步行与候车时间。", "另外核对搬家、中介和退租等一次性费用。", "现场确认噪声、采光与同住条件，这些没有折算成分数。"],
  },
  budget: {
    title: "暂时不工作能撑多久",
    description: "按自己的现金和月预算，估算可覆盖时长。",
    steps: ["现金与月预算"],
    fields: BUDGET_FIELDS,
    caveat: "按月预算稳定、其他收入持续估算，不预测求职时间，也不是辞职或财务安全建议。",
    checks: ["检查大额账单、自缴保障、还款等是否漏项。", "确认其他收入能持续覆盖这段时间。", "确认一次性支出；月底到账不代表月初账单付得出。"],
  },
};

const EXAMPLES = {
  rent: { aName: "", aHousing: "3000", aTransport: "300", aMinutes: "60", days: "22", bName: "", bHousing: "4000", bTransport: "100", bMinutes: "30" },
  budget: { cash: "60000", reserve: "12000", upfront: "6000", spending: "6000", income: "1000" },
};

function createDraft(scenario) {
  return Object.fromEntries(SCENARIOS[scenario].fields.map((field) => [field.key, ""]));
}

function validateDecisionField(value, field) {
  const input = String(value ?? "").trim();
  if (field.text) {
    return Array.from(input).length > field.maxLength ? `最多填写 ${field.maxLength} 个字` : "";
  }
  if (!input) return `请填写${field.label}，没有请填 0`;
  const pattern = field.precision === 0 ? /^\d+$/ : new RegExp(`^\\d+(?:\\.\\d{1,${field.precision}})?$`);
  if (!pattern.test(input)) {
    return field.precision === 0 ? "请填写非负整数" : `请填写非负数字，最多 ${field.precision} 位小数`;
  }
  if (Number(input) > field.max) return `请填写 0–${field.max.toLocaleString("en-US")} ${field.unit}`;
  return "";
}

function validateDecision(scenario, values) {
  const errors = {};
  SCENARIOS[scenario].fields.forEach((field) => {
    const message = validateDecisionField(values[field.key], field);
    if (message) errors[field.key] = message;
  });
  if (scenario === "budget" && !errors.reserve && !errors.cash && Number(values.reserve) > Number(values.cash)) {
    errors.reserve = "预留资金不能超过当前可动用资金";
  }
  return errors;
}

module.exports = { SCENARIOS, EXAMPLES, createDraft, validateDecisionField, validateDecision };
