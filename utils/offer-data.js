const FIELDS = [
  {
    key: "monthlySalary",
    label: "税前月薪",
    suffix: "元",
    placeholder: "25000",
    min: 1,
    max: 10000000,
    invalidMessage: "请填写 1–10,000,000 元",
  },
  {
    key: "salaryMonths",
    label: "全年固定发薪",
    suffix: "个月",
    placeholder: "13",
    min: 1,
    max: 36,
    invalidMessage: "请填写 1–36 个月",
  },
  {
    key: "guaranteedBonusMonths",
    label: "另有保证奖金",
    suffix: "月薪",
    placeholder: "1",
    min: 0,
    max: 60,
    invalidMessage: "请填写 0–60 个月月薪",
  },
  {
    key: "weeklyHours",
    label: "每周实际工作",
    suffix: "小时",
    placeholder: "45",
    min: 1,
    max: 168,
    invalidMessage: "请填写 1–168 小时",
  },
  {
    key: "commuteMinutes",
    label: "单程通勤",
    suffix: "分钟",
    placeholder: "45",
    min: 0,
    max: 720,
    invalidMessage: "请填写 0–720 分钟",
  },
];

const BENEFIT_FIELDS = [
  {
    key: "socialInsuranceBase",
    label: "五险缴费基数",
    suffix: "元",
    placeholder: "可留空",
    min: 0,
    max: 10000000,
    optional: true,
    invalidMessage: "请填写 0–10,000,000 元",
  },
  {
    key: "housingFundBase",
    label: "公积金缴存基数",
    suffix: "元",
    placeholder: "可留空",
    min: 0,
    max: 10000000,
    optional: true,
    invalidMessage: "请填写 0–10,000,000 元",
  },
  {
    key: "employerHousingFundRate",
    label: "公司公积金比例",
    suffix: "%",
    placeholder: "可留空",
    min: 0,
    max: 100,
    optional: true,
    invalidMessage: "请填写 0–100%",
  },
];

const EMPTY_BENEFITS = {
  socialInsuranceBase: "",
  housingFundBase: "",
  employerHousingFundRate: "",
};

const BLANK_JOBS = [
  {
    id: "current",
    title: "当前工作",
    monthlySalary: "",
    salaryMonths: "",
    guaranteedBonusMonths: "",
    weeklyHours: "",
    commuteMinutes: "",
    ...EMPTY_BENEFITS,
  },
  {
    id: "offerA",
    title: "Offer A",
    monthlySalary: "",
    salaryMonths: "",
    guaranteedBonusMonths: "",
    weeklyHours: "",
    commuteMinutes: "",
    ...EMPTY_BENEFITS,
  },
];

const BLANK_OFFER_B = {
  id: "offerB",
  title: "Offer B",
  monthlySalary: "",
  salaryMonths: "",
  guaranteedBonusMonths: "",
  weeklyHours: "",
  commuteMinutes: "",
  ...EMPTY_BENEFITS,
};

const EXAMPLE_JOBS = [
  {
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
  },
  {
    id: "offerA",
    title: "Offer A",
    monthlySalary: "32000",
    salaryMonths: "14",
    guaranteedBonusMonths: "0",
    weeklyHours: "55",
    commuteMinutes: "70",
    socialInsuranceBase: "32000",
    housingFundBase: "32000",
    employerHousingFundRate: "7",
  },
  {
    id: "offerB",
    title: "Offer B",
    monthlySalary: "29000",
    salaryMonths: "13",
    guaranteedBonusMonths: "2",
    weeklyHours: "42",
    commuteMinutes: "30",
    socialInsuranceBase: "20000",
    housingFundBase: "20000",
    employerHousingFundRate: "12",
  },
];

function cloneJobs(jobs) {
  return jobs.map((job) => ({ ...EMPTY_BENEFITS, ...job }));
}

module.exports = {
  FIELDS,
  BENEFIT_FIELDS,
  BLANK_JOBS,
  BLANK_OFFER_B,
  EXAMPLE_JOBS,
  cloneJobs,
};
