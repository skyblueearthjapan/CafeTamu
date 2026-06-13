/** MasterSync.gs
 * マスタ元スプレッドシートの「部署マスタ」「作業員マスタ」を
 * DB（バインド先）の DeptMaster / WorkerMaster に全置換コピーする。
 * Car-Management-System と同一方式。
 */
function syncMastersCore_() {
  const src = SpreadsheetApp.openById(CONFIG.MASTER_SOURCE_SPREADSHEET_ID);

  const deptSrc = src.getSheetByName(CONFIG.SOURCE_SHEETS.DEPT);
  const workerSrc = src.getSheetByName(CONFIG.SOURCE_SHEETS.WORKER);
  if (!deptSrc || !workerSrc) {
    throw new Error('同期元に「' + CONFIG.SOURCE_SHEETS.DEPT + '」または「' + CONFIG.SOURCE_SHEETS.WORKER + '」がありません。');
  }

  const deptValues = deptSrc.getDataRange().getValues();
  const workerValues = workerSrc.getDataRange().getValues();

  replaceSheetData_(CONFIG.SHEETS.DEPT, deptValues);
  replaceSheetData_(CONFIG.SHEETS.WORKER, workerValues);

  appendSyncLog_({
    at: nowIso_(),
    result: 'success',
    dept_rows: deptValues.length - 1,
    worker_rows: workerValues.length - 1,
    message: '',
  });

  return ok({ dept: deptValues.length - 1, worker: workerValues.length - 1 });
}

function replaceSheetData_(sheetName, values2d) {
  const sheet = shEnsure_(sheetName);
  sheet.clearContents();
  if (values2d && values2d.length && values2d[0].length) {
    sheet.getRange(1, 1, values2d.length, values2d[0].length).setValues(values2d);
  }
}

const SYNC_LOG_HEADERS = ['at', 'result', 'dept_rows', 'worker_rows', 'message'];

function appendSyncLog_(obj) {
  const sheet = shEnsure_(CONFIG.SHEETS.SYNC_LOG);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, SYNC_LOG_HEADERS.length).setValues([SYNC_LOG_HEADERS]);
    sheet.setFrozenRows(1);
  }
  sheet.appendRow(SYNC_LOG_HEADERS.map(k => (obj[k] !== undefined ? obj[k] : '')));
}
