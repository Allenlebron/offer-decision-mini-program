const { SCENARIOS, createDraft } = require("./decision-data");
const { DRAFT_KEY, RESULT_KEY, METRICS_KEY, OFFER_META_KEY } = require("./storage");
const { clearOfferSession } = require("./offer-session");

const KEYS = { rent: "life-decision-rent-v1", budget: "life-decision-budget-v1" };
const SCHEMA_VERSION = 1;
const CALCULATION_VERSION = 1;

function isSupportedDraft(scenario, draft) {
  const definition = SCENARIOS[scenario];
  return Boolean(
    definition && draft && draft.schemaVersion === SCHEMA_VERSION &&
    draft.calculationVersion === CALCULATION_VERSION &&
    draft.scenario === scenario && draft.values &&
    typeof draft.example === "boolean" &&
    Number.isInteger(draft.step) && draft.step >= 0 && draft.step < definition.steps.length &&
    Number.isFinite(draft.updatedAt) &&
    definition.fields.every((field) => typeof draft.values[field.key] === "string"),
  );
}

function readDraft(scenario) {
  if (!KEYS[scenario]) throw new Error("不支持的场景");
  let draft;
  try {
    draft = wx.getStorageSync(KEYS[scenario]);
  } catch (_error) {
    return { status: "unavailable", draft: null };
  }
  if (draft === undefined || draft === null || draft === "") return { status: "empty", draft: null };
  if (!isSupportedDraft(scenario, draft)) return { status: "corrupt", draft: null };
  return { status: "ready", draft };
}

function saveDraft(scenario, values, example, step) {
  if (!KEYS[scenario]) throw new Error("不支持的场景");
  const cleanValues = createDraft(scenario);
  Object.keys(cleanValues).forEach((key) => { cleanValues[key] = String(values[key] ?? ""); });
  const draft = {
    schemaVersion: SCHEMA_VERSION, calculationVersion: CALCULATION_VERSION,
    scenario, values: cleanValues, example, step, updatedAt: Date.now(),
  };
  if (!isSupportedDraft(scenario, draft)) throw new Error("草稿格式错误");
  try {
    wx.setStorageSync(KEYS[scenario], draft);
    return true;
  } catch (_error) {
    return false;
  }
}

function clearKeys(keys) {
  let complete = true;
  keys.forEach((key) => {
    try { wx.removeStorageSync(key); } catch (_error) { complete = false; }
  });
  return complete;
}

function clearDraft(scenario) {
  if (!KEYS[scenario]) throw new Error("不支持的场景");
  return clearKeys([KEYS[scenario]]);
}

function clearAllData() {
  clearOfferSession();
  return clearKeys([DRAFT_KEY, RESULT_KEY, METRICS_KEY, OFFER_META_KEY, ...Object.values(KEYS)]);
}

function clearOfferData() {
  clearOfferSession();
  return clearKeys([DRAFT_KEY, RESULT_KEY, OFFER_META_KEY]);
}

module.exports = { KEYS, isSupportedDraft, readDraft, saveDraft, clearDraft, clearAllData, clearOfferData };
