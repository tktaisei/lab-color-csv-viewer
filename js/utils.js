// ===== 共通ユーティリティ =====
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (s) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]
  ));
}
