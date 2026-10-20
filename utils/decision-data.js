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

const STUDY_FIELDS = [
  { key: "fees", label: "学费与考试费", unit: "元", max: 100000000, precision: 2, step: 0, hint: "只算接下来还要投入的钱，已花且无法收回的费用不重复计入" },
  { key: "extras", label: "其他学习支出", unit: "元", max: 100000000, precision: 2, step: 0, hint: "教材、交通、住宿等合计；没有请填 0" },
  { key: "lostIncome", label: "学习期间减少的到账收入", unit: "元", max: 100000000, precision: 2, step: 0, hint: "停工、减班等实际少拿的钱；不受影响请填 0，不用个人时薪折算学习时间" },
  { key: "hours", label: "预计总学习时间", unit: "小时", max: 100000, precision: 1, step: 0, hint: "课程、练习和备考合计；时间单独展示，不折算成钱" },
  { key: "targetMonths", label: "希望在增收后多久回本", unit: "个月", min: 1, max: 120, precision: 0, step: 1, hint: "从开始增收算起，不含学习和等待就业的时间；填写 1–120" },
  { key: "monthlyGain", label: "假设每月多到账", unit: "元/月", optional: true, max: 1000000, precision: 2, step: 1, hint: "不知道可留空，只看回本所需增收；填 0 表示假设没有增收，不是工资预测" },
];

const PURCHASE_FIELDS = [
  { key: "months", label: "统一比较周期", unit: "个月", min: 1, max: 120, precision: 0, step: 0, hint: "三种方案都使用这个周期；填写 1–120" },
  { key: "uses", label: "每月预计使用次数", unit: "次", max: 10000, precision: 0, step: 0, hint: "三种方案按相同次数比较；填 0 时只比较总成本" },
  { key: "buyCost", label: "买入与期间总支出", unit: "元", max: 100000000, precision: 2, step: 0, hint: "买价、运费、分期利息和期间维护使用费合计；不要扣旧物卖出款" },
  { key: "buyResale", label: "新物品期末预计残值", unit: "元", max: 100000000, precision: 2, step: 0, hint: "周期结束时的可售净值，是假设而非保证；不高于上方总支出，无残值填 0" },
  { key: "rentMonthly", label: "每月租金", unit: "元/月", max: 1000000, precision: 2, step: 1, hint: "按整个周期持续租用，不是每次使用的租金" },
  { key: "rentExtras", label: "租用的额外总费用", unit: "元", max: 100000000, precision: 2, step: 1, hint: "配送、手续费和期间使用费等；可退押金不计成本，但要另外准备资金" },
  { key: "currentValue", label: "现有物品当前可售净值", unit: "元", max: 100000000, precision: 2, step: 1, hint: "本场景要求现有物品仍能满足需求；买或租时，假设可以卖出原物品" },
  { key: "keepResale", label: "继续用的期末预计残值", unit: "元", max: 100000000, precision: 2, step: 1, hint: "不高于现有物品当前可售净值；不考虑物品升值" },
  { key: "keepCost", label: "继续用的期间总支出", unit: "元", max: 100000000, precision: 2, step: 1, hint: "维修、保养与使用费等合计；没有请填 0" },
];

const CITY_FIELDS = [
  { key: "aIncome", label: "当前每月到账收入", unit: "元/月", max: 1000000, precision: 2, step: 0, hint: "按月均税后到账填写；只算确定收入，公积金不当作可花现金" },
  { key: "aHousing", label: "当前每月住房支出", unit: "元/月", max: 1000000, precision: 2, step: 0, hint: "房租或房贷、物业、水电等合计；没有请填 0" },
  { key: "aOther", label: "当前每月其他支出", unit: "元/月", max: 1000000, precision: 2, step: 0, hint: "生活、交通、其他还款和自缴保障等；不要重复计住房费用" },
  { key: "bIncome", label: "迁居后每月到账收入", unit: "元/月", max: 1000000, precision: 2, step: 1, hint: "与当前使用相同口径；未确认的收入只是你的假设，不是预测" },
  { key: "bHousing", label: "迁居后每月住房支出", unit: "元/月", max: 1000000, precision: 2, step: 1, hint: "房租或房贷、物业、水电等合计" },
  { key: "bOther", label: "迁居后每月其他支出", unit: "元/月", max: 1000000, precision: 2, step: 1, hint: "生活、交通、其他还款和自缴保障等；两地按相同生活需求估算" },
  { key: "moveCost", label: "一次性迁居支出", unit: "元", max: 100000000, precision: 2, step: 1, hint: "搬家、中介、临时住宿、退租损失与停工少拿的钱；可退押金不计成本，但需另备资金" },
];

const SIDE_FIELDS = [
  { key: "initialCost", label: "前期投入", unit: "元", max: 100000000, precision: 2, step: 0, hint: "接下来要投入的钱；已花且无法收回的不重复计入，设备按全额投入、不扣假设残值" },
  { key: "price", label: "每单收入", unit: "元/单", max: 1000000, precision: 2, step: 0, hint: "退款后、扣平台费和税费前的收入；按次收费也用一单计" },
  { key: "unitCost", label: "每单成本", unit: "元/单", max: 1000000, precision: 2, step: 0, hint: "材料、运费、平台费、税费等自行估算；不要重复扣已从收入减去的费用" },
  { key: "fixedMonthly", label: "每月固定支出", unit: "元/月", max: 1000000, precision: 2, step: 0, hint: "不随单量变化的订阅、场地等费用；与前期投入分开，没有请填 0" },
  { key: "hours", label: "每月总投入时间", unit: "小时/月", max: 744, precision: 1, step: 1, hint: "制作、获客、沟通、交付和售后合计；时间单列，不按工资再扣一次" },
  { key: "targetMonths", label: "希望多久回收前期投入", unit: "个月", min: 1, max: 120, precision: 0, step: 1, hint: "从开始接单算起；填写 1–120，假设月单量和成本保持稳定" },
  { key: "orders", label: "假设每月完成单量", unit: "单/月", optional: true, max: 100000, precision: 0, step: 1, hint: "不知道可留空，只看保本所需单量；填 0 表示没有订单，不预测获客能力" },
];

const SCENARIOS = {
  rent: {
    entryTitle: "租房与通勤", entryDescription: "多花的房租，换回多少时间？", resultTitle: "通勤成本结果",
    title: "住近一点值不值",
    description: "算清多花的钱，能换回多少通勤时间。",
    steps: ["住处 A", "住处 B"],
    fields: RENT_FIELDS,
    caveat: "仅比较经常性月支出，不含押金占用、搬家、中介费或退租损失。",
    checks: ["实测高峰通勤，包含步行与候车时间。", "另外核对搬家、中介和退租等一次性费用。", "现场确认噪声、采光与同住条件，这些没有折算成分数。"],
  },
  budget: {
    entryTitle: "空窗期预算", entryDescription: "暂时不工作，存款能撑多久？", resultTitle: "预算结果",
    title: "暂时不工作能撑多久",
    description: "按自己的现金和月预算，估算可覆盖时长。",
    steps: ["现金与月预算"],
    fields: BUDGET_FIELDS,
    caveat: "按月预算稳定、其他收入持续估算，不预测求职时间，也不是辞职或财务安全建议。",
    checks: ["检查大额账单、自缴保障、还款等是否漏项。", "确认其他收入能持续覆盖这段时间。", "确认一次性支出；月底到账不代表月初账单付得出。"],
  },
  study: {
    entryTitle: "学习投入", entryDescription: "学费与时间，要换回多少增收？", resultTitle: "学习投入试算",
    title: "学习投入怎么算", description: "学费、时间和停工损失分开看。增收由你假设，不预测考证或培训后的工资。",
    steps: ["钱与时间投入", "回本条件"], fields: STUDY_FIELDS,
    caveat: "回本试算从增收开始算，不含学习期与等待期。增收是否发生、持续多久均不确定；未计算通胀、折现或非金钱收益。",
    checks: ["核对真实岗位要求和证书用途，别把培训承诺当作收入事实。", "留出练习和备考时间，确认这些小时能放进日常安排。", "另外核对退款、补考和持续培训费用；未确认的补贴不扣减投入。"],
  },
  purchase: {
    entryTitle: "消费选择", entryDescription: "买、租、继续用，同周期算成本。", resultTitle: "消费成本对比",
    title: "买、租，还是继续用", description: "适合已有物品仍能满足需求的情况。按同一周期比较三种方案，不判断功能升级或体验值不值。",
    steps: ["使用计划与购买", "租用与继续用"], fields: PURCHASE_FIELDS,
    caveat: "只比较已填的金钱成本。残值和使用次数是假设；买或租时假设可出售原物品，继续用计入原物品价值减少。不含资金时间价值与可退押金占用。",
    checks: ["确认三种方案都能满足同一需求；旧物不能用时，不适用本场景。", "按同一周期估残值，核对租用额外费用和使用次数，别只看首月优惠。", "成本不是初期现金需求；购买需先付款，租用可能占用押金，另行核对预算。"],
  },
  city: {
    entryTitle: "换城市生活", entryDescription: "收入变了，月结余能多多少？", resultTitle: "迁居收支对比",
    title: "换城市后，能多留下多少", description: "比较当前与迁居后的月收支，再看多出的结余能否抵回一次性迁居支出。",
    steps: ["当前月收支", "迁居后的收支"], fields: CITY_FIELDS,
    caveat: "只比较已填的到账收入和现金支出；迁居后的数字是个人假设，不判断哪座城市更适合你。不含资金时间价值与可退押金占用。",
    checks: ["确认收入何时开始到账，把空窗期间少拿的钱计入迁居支出。", "另外准备押金及月初账单所需现金，核对退租、搬家和临时住宿费用。", "实地了解通勤、家人照护和生活适应；这些不折算成分数。"],
  },
  side: {
    entryTitle: "副业尝试", entryDescription: "要做多少单，才覆盖成本？", resultTitle: "副业保本试算",
    title: "先算清一单能留下多少", description: "适合按单或按次收费的轻量副业。看保本条件和时间投入，不预测销量或创业成功率。",
    steps: ["投入与每单收支", "时间与回收条件"], fields: SIDE_FIELDS,
    caveat: "保本单量是条件，不代表能获得订单。假设每单收入、成本和固定月支出稳定；不自动计算税率，不计资金时间价值、设备残值或停业退出成本。",
    checks: ["先小额验证付费需求，另定可承受的最大损失，不把家庭必需资金算作可试错预算。", "把获客、退款、售后和闲置时间算进去，确认收入与费用没有重复扣减。", "另行核对主业约定、平台规则及所需资质；本试算不代表合规审查或经营建议。"],
  },
};

const EXAMPLES = {
  rent: { aName: "", aHousing: "3000", aTransport: "300", aMinutes: "60", days: "22", bName: "", bHousing: "4000", bTransport: "100", bMinutes: "30" },
  budget: { cash: "60000", reserve: "12000", upfront: "6000", spending: "6000", income: "1000" },
  study: { fees: "6000", extras: "1000", lostIncome: "5000", hours: "120", targetMonths: "12", monthlyGain: "1000" },
  purchase: { months: "12", uses: "20", buyCost: "6000", buyResale: "3000", rentMonthly: "300", rentExtras: "200", currentValue: "1500", keepResale: "500", keepCost: "300" },
  city: { aIncome: "12000", aHousing: "3500", aOther: "4000", bIncome: "15000", bHousing: "4500", bOther: "4500", moveCost: "9000" },
  side: { initialCost: "3000", price: "100", unitCost: "40", fixedMonthly: "600", hours: "40", targetMonths: "6", orders: "30" },
};

const isDecisionScenario = (id) => Object.prototype.hasOwnProperty.call(SCENARIOS, id);

function createDraft(scenario) {
  return Object.fromEntries(SCENARIOS[scenario].fields.map((field) => [field.key, ""]));
}

function validateDecisionField(value, field) {
  const input = String(value ?? "").trim();
  if (field.text) {
    return Array.from(input).length > field.maxLength ? `最多填写 ${field.maxLength} 个字` : "";
  }
  if (!input) return field.optional ? "" : `请填写${field.label}${field.min ? "" : "，没有请填 0"}`;
  const pattern = field.precision === 0 ? /^\d+$/ : new RegExp(`^\\d+(?:\\.\\d{1,${field.precision}})?$`);
  if (!pattern.test(input)) {
    return field.precision === 0 ? "请填写非负整数" : `请填写非负数字，最多 ${field.precision} 位小数`;
  }
  if (Number(input) < (field.min || 0) || Number(input) > field.max) return `请填写 ${field.min || 0}–${field.max.toLocaleString("en-US")} ${field.unit}`;
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
  if (scenario === "purchase") {
    if (!errors.buyResale && !errors.buyCost && Number(values.buyResale) > Number(values.buyCost)) errors.buyResale = "期末残值不能高于买入与期间总支出";
    if (!errors.keepResale && !errors.currentValue && Number(values.keepResale) > Number(values.currentValue)) errors.keepResale = "期末残值不能高于现有物品当前可售净值";
  }
  return errors;
}

module.exports = { SCENARIOS, EXAMPLES, isDecisionScenario, createDraft, validateDecisionField, validateDecision };
