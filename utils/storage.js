const DRAFT_KEY = "real-hike-mini-draft-v1";
const RESULT_KEY = "real-hike-mini-result-v1";
const METRICS_KEY = "real-hike-mini-metrics-v1";

function createMetrics() {
  return {
    sessionId: Math.random().toString(36).slice(2, 10).toUpperCase(),
    startedAt: Date.now(),
    calculations: 0,
    shares: 0,
  };
}

function getMetrics() {
  try {
    return wx.getStorageSync(METRICS_KEY) || createMetrics();
  } catch (_error) {
    return createMetrics();
  }
}

function updateMetrics(patch) {
  const nextMetrics = { ...getMetrics(), ...patch };
  try {
    wx.setStorageSync(METRICS_KEY, nextMetrics);
  } catch (_error) {
    // Metrics are optional; the calculator remains fully functional.
  }
  return nextMetrics;
}

module.exports = {
  DRAFT_KEY,
  RESULT_KEY,
  METRICS_KEY,
  getMetrics,
  updateMetrics,
};
