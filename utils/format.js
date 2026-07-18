function addThousands(value) {
  const rounded = String(Math.round(value));
  return rounded.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatMoney(value) {
  return `¥${addThousands(value)}`;
}

function formatWan(value) {
  return `${(value / 10000).toFixed(1)}万`;
}

function formatDelta(value, base) {
  if (!base) return "—";
  const percentage = (value / base - 1) * 100;
  return `${percentage >= 0 ? "+" : ""}${percentage.toFixed(1)}%`;
}

function formatHours(value) {
  return `${Math.round(value)}小时`;
}

module.exports = {
  formatMoney,
  formatWan,
  formatDelta,
  formatHours,
};
