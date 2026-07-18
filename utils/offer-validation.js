const { FIELDS } = require("./offer-data");

function validateField(value, field) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed < field.min || parsed > field.max) {
    return field.invalidMessage;
  }
  return "";
}

function validateJobs(jobs) {
  const errors = {};
  jobs.forEach((job) => {
    FIELDS.forEach((field) => {
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
    FIELDS.every((field) => typeof job[field.key] === "string")
  );
}

function isValidDraft(value) {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    value.length <= 3 &&
    value.every(isSupportedJob) &&
    value[0].id === "current" &&
    value[1].id === "offerA"
  );
}

module.exports = {
  validateField,
  validateJobs,
  isValidDraft,
};
