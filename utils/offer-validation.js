const { FIELDS, BENEFIT_FIELDS } = require("./offer-data");

const ALL_FIELDS = [...FIELDS, ...BENEFIT_FIELDS];

function validateField(value, field) {
  if (field.optional && String(value ?? "").trim() === "") return "";
  const input = String(value ?? "").trim();
  const parsed = Number(input);
  if (!/^\d+(?:\.\d{1,2})?$/.test(input) || !Number.isFinite(parsed) || parsed < field.min || parsed > field.max) {
    return field.invalidMessage;
  }
  return "";
}

function validateJobs(jobs) {
  const errors = {};
  jobs.forEach((job) => {
    ALL_FIELDS.forEach((field) => {
      const message = validateField(job[field.key], field);
      if (message) errors[`${job.id}-${field.key}`] = message;
    });
  });
  return errors;
}

function isSupportedJob(job) {
  const supportedIds = ["current", "offerA", "offerB"];
  return (
    job &&
    supportedIds.includes(job.id) &&
    typeof job.title === "string" &&
    FIELDS.every((field) => typeof job[field.key] === "string") &&
    BENEFIT_FIELDS.every(
      (field) =>
        job[field.key] === undefined || typeof job[field.key] === "string",
    )
  );
}

function isValidDraft(value) {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    value.length <= 3 &&
    value.every(isSupportedJob) &&
    value[0].id === "current" &&
    value[1].id === "offerA" &&
    (value.length === 2 || value[2].id === "offerB")
  );
}

module.exports = {
  validateField,
  validateJobs,
  isValidDraft,
};
