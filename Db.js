/** Db.gs — DB（バインド先スプレッドシート）アクセス
 * 部署・社員マスタの読み取りは Car-Management-System と同じ方式（ヘッダーなし・固定列）。
 */
function db_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function sh_(name) {
  const sheet = db_().getSheetByName(name);
  if (!sheet) throw new Error('Sheet not found: ' + name);
  return sheet;
}

/** 無ければ作成して返す */
function shEnsure_(name) {
  const ss = db_();
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

// ============================================================
// 部署マスタ / 作業員マスタ（Car-Management と同じ固定列リーダー）
// ============================================================

/**
 * DeptMaster はヘッダーなし。1行目タイトル、2行目からデータ。
 * A=dept_name, B=display_order, C=is_active, D=created_at, E=updated_at
 */
function readDeptMaster_() {
  const sheet = sh_(CONFIG.SHEETS.DEPT);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const data = sheet.getRange(2, 1, lastRow - 1, 5).getValues();
  return data
    .filter(row => row[0])
    .map(row => ({
      dept_name: String(row[0] || ''),
      display_order: row[1],
      is_active: row[2],
      created_at: row[3],
      updated_at: row[4],
    }));
}

/**
 * WorkerMaster は1行目がヘッダー、2行目からデータ。マスタ元「作業員マスタ」を全列コピーした6列構成。
 * A=worker_code, B=worker_name, C=dept_name, D=task(担当業務), E=location(拠点), F=staff_type(スタッフ種類)
 */
function readWorkerMaster_() {
  const sheet = sh_(CONFIG.SHEETS.WORKER);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const lastCol = Math.max(sheet.getLastColumn(), 6);
  const data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  return data
    .filter(row => row[0])
    .map(row => ({
      worker_code: String(row[0] || ''),
      worker_name: String(row[1] || ''),
      dept_name: String(row[2] || ''),
      task: String(row[3] || '').trim(),
      location: String(row[4] || '').trim(),     // 拠点（新工場 / 本社工場）
      staff_type: String(row[5] || '').trim(),   // スタッフ種類（事務所 / 工場）
    }));
}

// ============================================================
// 取引ログ（Transactions）— ヘッダーあり
// ============================================================

const TX_HEADERS = [
  'tx_id', 'worker_code', 'worker_name', 'dept_name',
  'type', 'label', 'amount', 'is_drink', 'created_at',
  'status', 'cancelled_at',
];

function ensureTxSheet_() {
  const sheet = shEnsure_(CONFIG.SHEETS.TX);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, TX_HEADERS.length).setValues([TX_HEADERS]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/** Transactions を全件オブジェクト配列で読む（先頭行=ヘッダー） */
function readAllTx_() {
  const sheet = ensureTxSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim());
  const data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  return data.map((row, idx) => {
    const obj = { _row: idx + 2 };
    headers.forEach((h, i) => { if (h) obj[h] = row[i]; });
    return obj;
  });
}

/** 取引を1件追記 */
function appendTx_(obj) {
  const sheet = ensureTxSheet_();
  const row = TX_HEADERS.map(h => (obj[h] !== undefined && obj[h] !== null ? obj[h] : ''));
  sheet.appendRow(row);
}

/** tx_id でステータスを cancelled に更新。更新件数を返す */
function cancelTxById_(txId) {
  const sheet = ensureTxSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  const idCol = TX_HEADERS.indexOf('tx_id') + 1;
  const statusCol = TX_HEADERS.indexOf('status') + 1;
  const cancelledAtCol = TX_HEADERS.indexOf('cancelled_at') + 1;
  const ids = sheet.getRange(2, idCol, lastRow - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(txId)) {
      const r = i + 2;
      sheet.getRange(r, statusCol).setValue(CONFIG.STATUS.CANCELLED);
      sheet.getRange(r, cancelledAtCol).setValue(nowIso_());
      return 1;
    }
  }
  return 0;
}
