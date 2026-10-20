// Adapted question prompts, not policy or health conclusions. Attribution is in decision-sources.
const CHECKS = {
  offer: {
    title: "换工作", tool: "继续 Offer 对比", path: "/pages/calculator/calculator",
    items: [
      { id: "terms", title: "承诺的钱，写清楚了吗？", action: "向 HR 核对固定发薪、奖金条件、试用期与五险一金，把已确认条件更新到对比里。", reference: "钱账；新单位签合同时" },
      { id: "time", title: "实际工时和通勤，确认了吗？", action: "问清加班、轮班与响应要求；在工作日高峰试走一次通勤，别只用地图的理想时间。", reference: "健康账；时间账" },
      { id: "life", title: "这份工作，会改变怎样的日常？", action: "把睡眠、陪伴和固定活动放进新的一周，看看哪些安排需要让步；这部分没有计入综合时薪。", reference: "健康账；人和关系" },
      { id: "exit", title: "不合适时，怎样退出？", action: "核对入职、离职与搬迁安排，给试一段的选择定一个复看日期和停止条件。涉及合同疑问时另行咨询。", reference: "时间账；递辞职之前" },
    ],
  },
  rent: {
    title: "租房搬家", tool: "继续租房与通勤计算", path: "/pages/decision/decision?scenario=rent",
    items: [
      { id: "upfront", title: "月租之外，还要先拿出多少钱？", action: "单列押金占用、搬家、中介和旧房退租支出。当前计算器只比较经常性月支出，不包含这些。", reference: "在新城市找住处；钱账" },
      { id: "route", title: "省下的通勤时间，真实可得吗？", action: "按实际出门时段试走往返路线，包含步行和等车；再用同一通勤天数比较两处。", reference: "时间账" },
      { id: "living", title: "住进去以后，能休息好吗？", action: "现场看噪声、采光、通风与同住条件，也看看见家人朋友和日常活动是否方便。", reference: "人和关系；在新城市找住处" },
      { id: "contract", title: "签约与退租条件，能核对清楚吗？", action: "核实出租方身份与房屋信息，逐项确认付款、押金退还和提前退租条款；不清楚的先问清再签。", reference: "在新城市找住处" },
    ],
  },
  budget: {
    title: "空窗期", tool: "继续空窗期预算计算", path: "/pages/decision/decision?scenario=budget",
    items: [
      { id: "cash", title: "可用的钱，已经到账了吗？", action: "用已到账资金重算，不把预计补偿、未来工资或未确认补贴放进去；预留资金单独保留。", reference: "钱账" },
      { id: "bills", title: "保障和大额账单，漏了吗？", action: "检查房租、还款、自缴保障与近期大额支出；参保与待遇问题向当地经办机构核实，不在这里推断资格。", reference: "钱账；搬过去以后：社保、医保和看病" },
      { id: "rhythm", title: "没有工作日程，日子怎么安排？", action: "先排一周的求职或学习、运动、休息与见面时间。需要时可到「日常」记录，不要求每天全部完成。", reference: "离开旧单位那几天；人和关系" },
      { id: "review", title: "什么时候重新看这份计划？", action: "自己写下复看日期、愿意动用的资金底线和备选方案。预算覆盖月数不是求职时间预测，也不是辞职许可。", reference: "时间账；钱账" },
    ],
  },
};
const CHECK_KEYS = { offer: "life-check-offer-v1", rent: "life-check-rent-v1", budget: "life-check-budget-v1" };
const CHECK_STATUSES = ["待核对", "已核对", "不适用"];
const isCheckScenario = (id) => Object.prototype.hasOwnProperty.call(CHECKS, id);
const emptyChecks = (scenario) => Object.fromEntries(CHECKS[scenario].items.map((item) => [item.id, 0]));

function readChecks(scenario) {
  if (!isCheckScenario(scenario)) throw new Error("不支持的核对场景");
  const values = emptyChecks(scenario);
  let saved;
  try { saved = wx.getStorageSync(CHECK_KEYS[scenario]); }
  catch (_error) { return { values, blocked: true, notice: "无法读取本机核对记录；本页仍可查看，暂不覆盖原记录。" }; }
  if (saved === undefined || saved === null || saved === "") return { values, notice: "" };
  if (saved.version !== 1 || !saved.values || !CHECKS[scenario].items.every((item) => Number.isInteger(saved.values[item.id]) && saved.values[item.id] >= 0 && saved.values[item.id] < CHECK_STATUSES.length)) {
    return { values, blocked: true, notice: "原核对记录无法恢复；如需替换，请确认开始新一轮核对。" };
  }
  Object.keys(values).forEach((id) => { values[id] = saved.values[id]; });
  return { values, notice: "" };
}

function saveChecks(scenario, values) {
  const clean = emptyChecks(scenario);
  Object.keys(clean).forEach((id) => { clean[id] = values[id]; });
  try { wx.setStorageSync(CHECK_KEYS[scenario], { version: 1, values: clean }); return true; }
  catch (_error) { return false; }
}

module.exports = { CHECKS, CHECK_KEYS, CHECK_STATUSES, isCheckScenario, emptyChecks, readChecks, saveChecks };
