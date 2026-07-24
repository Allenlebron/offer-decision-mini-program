const assert = require("node:assert/strict");
const test = require("node:test");

const {
  BLANK_JOBS,
  EXAMPLE_JOBS,
  cloneJobs,
} = require("../utils/offer-data");
const {
  isValidDraft,
  validateJobs,
} = require("../utils/offer-validation");

test("reports each missing field beside its job", () => {
  const errors = validateJobs(cloneJobs(BLANK_JOBS));

  assert.equal(Object.keys(errors).length, 10);
  assert.equal(
    errors["current-monthlySalary"],
    "请填写 1–10,000,000 元",
  );
  assert.equal(errors["offerA-commuteMinutes"], "请填写 0–720 分钟");
});

test("accepts the complete example and rejects values outside limits", () => {
  assert.deepEqual(validateJobs(cloneJobs(EXAMPLE_JOBS)), {});

  const invalid = cloneJobs(EXAMPLE_JOBS);
  invalid[1].weeklyHours = "169";
  invalid[2].commuteMinutes = "721";
  invalid[0].socialInsuranceBase = "-1";
  invalid[1].employerHousingFundRate = "101";
  const errors = validateJobs(invalid);

  assert.equal(errors["offerA-weeklyHours"], "请填写 1–168 小时");
  assert.equal(errors["offerB-commuteMinutes"], "请填写 0–720 分钟");
  assert.equal(
    errors["current-socialInsuranceBase"],
    "请填写 0–10,000,000 元",
  );
  assert.equal(
    errors["offerA-employerHousingFundRate"],
    "请填写 0–100%",
  );
});

test("only restores supported two- or three-option drafts", () => {
  assert.equal(isValidDraft(cloneJobs(EXAMPLE_JOBS)), true);
  assert.equal(isValidDraft(cloneJobs(BLANK_JOBS)), true);
  assert.equal(isValidDraft([{ id: "current" }]), false);

  const wrongOrder = cloneJobs(BLANK_JOBS).reverse();
  assert.equal(isValidDraft(wrongOrder), false);

  const legacyDraft = cloneJobs(EXAMPLE_JOBS).map((job) => {
    const legacyJob = { ...job };
    delete legacyJob.socialInsuranceBase;
    delete legacyJob.housingFundBase;
    delete legacyJob.employerHousingFundRate;
    return legacyJob;
  });
  assert.equal(isValidDraft(legacyDraft), true);
});
