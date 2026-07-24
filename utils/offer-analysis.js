const WORK_WEEKS = 48;
const COMMUTE_DAYS = 240;
const TOLERANCE = 0.01;

function toNumber(value) {
  return Number.parseFloat(value);
}

function toOptionalNumber(value) {
  if (String(value ?? "").trim() === "") return null;
  const parsed = toNumber(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function calculateJob(job) {
  const monthlySalary = toNumber(job.monthlySalary);
  const socialInsuranceBase = toOptionalNumber(job.socialInsuranceBase);
  const housingFundBase = toOptionalNumber(job.housingFundBase);
  const employerHousingFundRate = toOptionalNumber(
    job.employerHousingFundRate,
  );
  const employerHousingFundAnnual =
    housingFundBase === null || employerHousingFundRate === null
      ? null
      : housingFundBase * (employerHousingFundRate / 100) * 12;
  const guaranteedAnnual =
    monthlySalary *
    (toNumber(job.salaryMonths) + toNumber(job.guaranteedBonusMonths));
  const totalAnnualValue =
    guaranteedAnnual + (employerHousingFundAnnual ?? 0);
  const annualWorkHours = toNumber(job.weeklyHours) * WORK_WEEKS;
  const annualCommuteHours =
    (toNumber(job.commuteMinutes) * 2 * COMMUTE_DAYS) / 60;
  const totalHours = annualWorkHours + annualCommuteHours;

  return {
    id: job.id,
    title: job.title,
    monthlySalary,
    guaranteedAnnual,
    totalAnnualValue,
    socialInsuranceBase,
    housingFundBase,
    employerHousingFundRate,
    employerHousingFundAnnual,
    hasBenefitData:
      socialInsuranceBase !== null ||
      housingFundBase !== null ||
      employerHousingFundRate !== null,
    annualWorkHours,
    annualCommuteHours,
    totalHours,
    hourlyValue: totalAnnualValue / totalHours,
  };
}

function findLeaders(results, value) {
  const maximum = Math.max(...results.map(value));
  return results.filter(
    (result) => Math.abs(value(result) - maximum) <= TOLERANCE,
  );
}

function joinNames(results) {
  return results.map((result) => result.title).join("、");
}

function sameLeaders(left, right) {
  return (
    left.length === right.length &&
    left.every((result) => right.some((other) => other.id === result.id))
  );
}

function summarizeLeaders(results, metric) {
  if (results.length === 1) return `${results[0].title}的${metric}最高`;
  return `${joinNames(results)}的${metric}并列最高`;
}

function calculateBreakEven(results) {
  const ranked = [...results].sort((a, b) => b.hourlyValue - a.hourlyValue);
  if (
    ranked.length < 2 ||
    Math.abs(ranked[0].hourlyValue - ranked[1].hourlyValue) <= TOLERANCE
  ) {
    return null;
  }

  const winner = ranked[0];
  const challenger = ranked[1];
  const targetAnnual = winner.hourlyValue * challenger.totalHours;
  const extraBonusMonths = Math.max(
    0,
    (targetAnnual - challenger.totalAnnualValue) / challenger.monthlySalary,
  );
  const targetTotalHours = challenger.totalAnnualValue / winner.hourlyValue;
  const canCatchUpByHours =
    targetTotalHours + TOLERANCE >= challenger.annualCommuteHours;
  const targetWeeklyHours = canCatchUpByHours
    ? (targetTotalHours - challenger.annualCommuteHours) / WORK_WEEKS
    : 0;
  const currentWeeklyHours = challenger.annualWorkHours / WORK_WEEKS;
  const weeklyHoursReduction = canCatchUpByHours
    ? Math.max(0, currentWeeklyHours - targetWeeklyHours)
    : null;

  return {
    winner,
    challenger,
    extraBonusMonths,
    weeklyHoursReduction,
  };
}

function analyzeResults(results) {
  if (results.length < 2) {
    throw new Error("至少需要两个选项才能分析");
  }

  const current =
    results.find((result) => result.id === "current") || results[0];
  const annualLeaders = findLeaders(
    results,
    (result) => result.totalAnnualValue,
  );
  const hourlyLeaders = findLeaders(results, (result) => result.hourlyValue);
  const annualSummary = summarizeLeaders(annualLeaders, "年综合价值");
  const hourlySummary = summarizeLeaders(hourlyLeaders, "综合时薪");
  let headline;

  if (sameLeaders(annualLeaders, hourlyLeaders)) {
    if (annualLeaders.length === results.length) {
      headline = "所有选项的年综合价值和综合时薪持平。";
    } else if (annualLeaders.length === 1) {
      headline = `${annualLeaders[0].title}在年综合价值和综合时薪上都领先。`;
    } else {
      headline = `${joinNames(annualLeaders)}在年综合价值和综合时薪上并列领先。`;
    }
  } else {
    headline = `${annualSummary}，${hourlySummary}。`;
  }

  return {
    current,
    annualLeaders,
    hourlyLeaders,
    annualSummary,
    hourlySummary,
    headline,
    breakEven: calculateBreakEven(results),
  };
}

module.exports = {
  WORK_WEEKS,
  COMMUTE_DAYS,
  calculateJob,
  analyzeResults,
};
