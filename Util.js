/** Util.gs — 共通ユーティリティ */
function ok(data) {
  return { ok: true, data };
}
function fail(code, message, extra) {
  return Object.assign({ ok: false, code: code, message: message }, extra || {});
}

function toISODate_(d) {
  const tz = Session.getScriptTimeZone();
  return Utilities.formatDate(d, tz, 'yyyy-MM-dd');
}

function toMonthKey_(d) {
  const tz = Session.getScriptTimeZone();
  return Utilities.formatDate(d, tz, 'yyyy-MM');
}

function nowIso_() {
  const tz = Session.getScriptTimeZone();
  return Utilities.formatDate(new Date(), tz, "yyyy-MM-dd'T'HH:mm:ss");
}

/** Date型または文字列を Date に正規化（取引ログの created_at 用） */
function toDate_(val) {
  if (val instanceof Date) return val;
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

/** 衝突しにくい取引ID */
function genTxId_() {
  const ts = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss');
  const rnd = Math.floor(Math.random() * 1e6).toString();
  return 'T' + ts + '-' + ('000000' + rnd).slice(-6);
}

/** is_active / TRUE 系の値を真偽に正規化 */
function truthy_(v) {
  if (v === undefined || v === null || v === '') return true; // 既定は有効扱い
  return v === true || v === 1 || v === '1' || String(v).toUpperCase() === 'TRUE';
}
