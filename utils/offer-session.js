const { DRAFT_KEY, RESULT_KEY, OFFER_META_KEY } = require("./storage");
const { isValidDraft, validateJobs } = require("./offer-validation");

// Runtime-only fallback: a storage failure must not stop the current calculation.
// A new WeChat runtime starts empty; nothing is sent to a server.
const sessions = new WeakMap();

function session() {
  if (!sessions.has(wx)) sessions.set(wx, { draft: null, example: false, result: null, draftSaved: true, resultSaved: false });
  return sessions.get(wx);
}

function snapshot(jobs) {
  return jobs.map((job) => ({ ...job }));
}

function sameJobs(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function restoreOfferDraft() {
  const current = session();
  if (current.draft) return { status: "ready", jobs: snapshot(current.draft), example: current.example, saved: current.draftSaved };
  try {
    const jobs = wx.getStorageSync(DRAFT_KEY);
    if (jobs === undefined || jobs === null || jobs === "") return { status: "empty" };
    if (!isValidDraft(jobs)) return { status: "corrupt" };
    const metadata = wx.getStorageSync(OFFER_META_KEY);
    return {
      status: "ready", jobs, saved: true,
      example: Boolean(metadata && metadata.example && metadata.fingerprint === JSON.stringify(jobs)),
    };
  } catch (_error) {
    return { status: "unavailable" };
  }
}

function saveOfferDraft(jobs, example) {
  const current = session();
  current.draft = snapshot(jobs);
  current.example = Boolean(example);
  current.result = null;
  current.resultSaved = false;
  let saved = true;
  try {
    wx.setStorageSync(DRAFT_KEY, jobs);
    wx.setStorageSync(OFFER_META_KEY, { example: Boolean(example), fingerprint: JSON.stringify(jobs) });
  } catch (_error) {
    saved = false;
  }
  try { wx.removeStorageSync(RESULT_KEY); } catch (_error) { saved = false; }
  current.draftSaved = saved;
  return saved;
}

function saveOfferResult(jobs, example) {
  if (!isValidDraft(jobs) || Object.keys(validateJobs(jobs)).length) throw new Error("输入不完整");
  // Retry the draft too: a newer result with an older disk draft cannot be restored.
  const draftSaved = saveOfferDraft(jobs, example);
  const current = session();
  const payload = { jobs: snapshot(jobs), example: Boolean(example), calculatedAt: Date.now() };
  current.draft = snapshot(jobs);
  current.example = Boolean(example);
  current.result = payload;
  try {
    wx.setStorageSync(RESULT_KEY, payload);
    current.resultSaved = draftSaved;
    return current.resultSaved;
  } catch (_error) {
    return false;
  }
}

function loadOfferResult() {
  const current = session();
  let payload;
  let draft;
  try {
    if (current.draft) {
      payload = current.result;
      draft = current.draft;
    } else {
      payload = wx.getStorageSync(RESULT_KEY);
      draft = wx.getStorageSync(DRAFT_KEY);
    }
  } catch (_error) {
    return null;
  }
  if (!payload || !isValidDraft(payload.jobs) || Object.keys(validateJobs(payload.jobs)).length) return null;
  // Preserve legacy result-only sessions, but never display a result for a newer draft.
  if (draft !== undefined && draft !== null && draft !== "" &&
      (!isValidDraft(draft) || !sameJobs(draft, payload.jobs))) return null;
  return { ...payload, jobs: snapshot(payload.jobs), saved: current.draft ? current.resultSaved : true };
}

function clearOfferSession() {
  sessions.delete(wx);
}

module.exports = { restoreOfferDraft, saveOfferDraft, saveOfferResult, loadOfferResult, clearOfferSession };
