/** Code.gs — 喫茶Tamu カウントアプリ（GAS / HtmlService）
 * 共用モデル：検索で誰でも選択してカウントできる（給茶機横の共用端末／各自スマホ兼用）。
 */

function doGet() {
  const t = HtmlService.createTemplateFromFile('Index');
  return t.evaluate()
    .setTitle('喫茶Tamu カウントアプリ')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
}

/** HTML 部分テンプレートの取り込み */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ============================================================
// API
// ============================================================

/** 初期データ：部署チップ・スタッフ一覧（残高付き）・管理サマリ用の素データ */
function getInit() {
  try {
    const workers = readWorkerMaster_();
    const deptRows = readDeptMaster_();
    const { byWorker } = buildLedgerIndex_();

    const depts = deptRows
      .filter(r => truthy_(r.is_active))
      .sort((a, b) => (Number(a.display_order) || 0) - (Number(b.display_order) || 0))
      .map(r => r.dept_name)
      .filter(Boolean);

    const staff = workers.map(w => {
      const led = byWorker[w.worker_code] || { balance: 0, today: 0, month: 0 };
      return {
        code: w.worker_code,
        name: w.worker_name,
        dept: w.dept_name,
        balance: led.balance,
        today: led.today,
        month: led.month,
      };
    });

    const result = {
      depts: depts,
      staff: staff,
      prices: CONFIG.PRICES,
      depositOptions: CONFIG.DEPOSIT_OPTIONS,
    };
    return ok(JSON.parse(JSON.stringify(result)));
  } catch (e) {
    return fail('ERROR', e.message || String(e));
  }
}

/** スタッフ1名の最新状態（残高・本日/今月・履歴） */
function getStaffState(code) {
  try {
    if (!code) return fail('BAD_REQUEST', 'code is required');
    const led = ledgerForWorker_(code);
    const history = historyForWorker_(code, 14);
    return ok(JSON.parse(JSON.stringify({
      code: code,
      balance: led.balance,
      today: led.today,
      month: led.month,
      history: history,
    })));
  } catch (e) {
    return fail('ERROR', e.message || String(e));
  }
}

/** 利用（コーヒー / お茶 / 紙コップ）を記録。排他ロック。 */
function recordUsage(code, kind) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    if (!code) return fail('BAD_REQUEST', 'code is required');
    const worker = findWorker_(code);
    if (!worker) return fail('NOT_FOUND', 'worker not found: ' + code);
    const k = resolveKind_(kind);
    const txId = genTxId_();
    appendTx_({
      tx_id: txId,
      worker_code: worker.worker_code,
      worker_name: worker.worker_name,
      dept_name: worker.dept_name,
      type: kind,
      label: k.label,
      amount: k.amount,
      is_drink: k.isDrink,
      created_at: nowIso_(),
      status: CONFIG.STATUS.ACTIVE,
      cancelled_at: '',
    });
    return ok(stateAfter_(code, txId));
  } catch (e) {
    return fail('ERROR', e.message || String(e));
  } finally {
    lock.releaseLock();
  }
}

/** 入金（100円単位のみ。10円玉不可）。排他ロック。 */
function recordDeposit(code, amount) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    if (!code) return fail('BAD_REQUEST', 'code is required');
    amount = Number(amount);
    if (!amount || amount <= 0) return fail('BAD_REQUEST', '入金額が不正です');
    if (amount % 100 !== 0) return fail('BAD_REQUEST', '入金は100円単位のみです（10円玉での入金はできません）');
    const worker = findWorker_(code);
    if (!worker) return fail('NOT_FOUND', 'worker not found: ' + code);
    const txId = genTxId_();
    appendTx_({
      tx_id: txId,
      worker_code: worker.worker_code,
      worker_name: worker.worker_name,
      dept_name: worker.dept_name,
      type: CONFIG.TX_TYPE.DEPOSIT,
      label: '入金',
      amount: amount,
      is_drink: false,
      created_at: nowIso_(),
      status: CONFIG.STATUS.ACTIVE,
      cancelled_at: '',
    });
    return ok(stateAfter_(code, txId));
  } catch (e) {
    return fail('ERROR', e.message || String(e));
  } finally {
    lock.releaseLock();
  }
}

/** 取消（該当取引を cancelled にする）。排他ロック。 */
function undoEntry(code, txId) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    if (!code || !txId) return fail('BAD_REQUEST', 'code and txId required');
    const n = cancelTxById_(txId);
    if (n === 0) return fail('NOT_FOUND', 'tx not found: ' + txId);
    return ok(stateAfter_(code, null));
  } catch (e) {
    return fail('ERROR', e.message || String(e));
  } finally {
    lock.releaseLock();
  }
}

/** 管理画面：サマリ・スタッフ別・月別推移 */
function getAdmin() {
  try {
    const workers = readWorkerMaster_();
    const { byWorker, monthAgg } = buildLedgerIndex_();

    const rows = workers.map(w => {
      const led = byWorker[w.worker_code] || { balance: 0, today: 0, month: 0 };
      return { code: w.worker_code, name: w.worker_name, dept: w.dept_name, balance: led.balance, today: led.today, month: led.month };
    });

    const total = workers.length;
    let sumBal = 0, todayTotal = 0, monthTotal = 0, negCount = 0;
    rows.forEach(r => {
      sumBal += r.balance;
      todayTotal += r.today;
      monthTotal += r.month;
      if (r.balance < 0) negCount += 1;
    });

    // 月別推移（データのある月を昇順）
    const monthKeys = Object.keys(monthAgg).sort();
    const monthly = monthKeys.map(mk => {
      const a = monthAgg[mk];
      return { key: mk, label: monthLabel_(mk), coffee: a.coffee, tea: a.tea, cups: a.cups, spend: a.spend };
    });

    return ok(JSON.parse(JSON.stringify({
      summary: { total, todayTotal, monthTotal, negCount, sumBal, avg: total ? Math.round(sumBal / total) : 0 },
      rows: rows,
      monthly: monthly,
    })));
  } catch (e) {
    return fail('ERROR', e.message || String(e));
  }
}

/** 月別ドリルダウン：指定月のスタッフ別内訳（杯数の多い順） */
function getMonthDetail(monthKey) {
  try {
    if (!monthKey) return fail('BAD_REQUEST', 'monthKey required');
    const { monthAgg } = buildLedgerIndex_();
    const a = monthAgg[monthKey];
    const detail = a ? Object.keys(a.byWorker).map(code => {
      const w = a.byWorker[code];
      return { code: code, name: w.name, dept: w.dept, coffee: w.coffee, tea: w.tea, cups: w.cups, spend: w.spend };
    }).sort((x, y) => y.cups - x.cups) : [];
    return ok(JSON.parse(JSON.stringify({ key: monthKey, label: monthLabel_(monthKey), rows: detail })));
  } catch (e) {
    return fail('ERROR', e.message || String(e));
  }
}

/** API: マスタ同期（排他） */
function syncMasters() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return syncMastersCore_();
  } catch (e) {
    return fail('ERROR', e.message || String(e));
  } finally {
    lock.releaseLock();
  }
}

// ============================================================
// 内部ヘルパー
// ============================================================

function findWorker_(code) {
  return readWorkerMaster_().find(w => String(w.worker_code) === String(code)) || null;
}

/** 取引後の最新状態（残高・本日/今月・履歴）。lastTxId は省略可 */
function stateAfter_(code, lastTxId) {
  const led = ledgerForWorker_(code);
  return JSON.parse(JSON.stringify({
    code: code,
    balance: led.balance,
    today: led.today,
    month: led.month,
    history: historyForWorker_(code, 14),
    lastTxId: lastTxId || null,
  }));
}

/** 'yyyy-MM' → 'M月'（同年内）／'yyyy年M月'（年跨ぎ表示用） */
function monthLabel_(mk) {
  const parts = String(mk).split('-');
  if (parts.length < 2) return mk;
  return Number(parts[1]) + '月';
}

// ============================================================
// セットアップ / デバッグ
// ============================================================

/** 初回セットアップ：DBシートを用意し、マスタを同期する */
function setup() {
  ensureTxSheet_();
  shEnsure_(CONFIG.SHEETS.SYNC_LOG);
  const r = syncMastersCore_();
  Logger.log('setup 完了: ' + JSON.stringify(r));
  return r;
}

/** 毎日 06:00 にマスタ同期するトリガーを設定 */
function setupSyncTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'syncMasters') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('syncMasters').timeBased().everyDays(1).atHour(6).create();
  Logger.log('マスタ同期トリガーを設定しました（毎日 06:00）');
}

function checkSetup() {
  const ss = db_();
  Logger.log('DB: ' + ss.getName());
  Logger.log('シート一覧: ' + ss.getSheets().map(s => s.getName()).join(', '));
  Logger.log('部署数: ' + readDeptMaster_().length);
  Logger.log('作業員数: ' + readWorkerMaster_().length);
}

function testWorkers() {
  const ws = readWorkerMaster_();
  Logger.log('作業員数: ' + ws.length);
  Logger.log(JSON.stringify(ws.slice(0, 5), null, 2));
}
