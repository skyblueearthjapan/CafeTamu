/** Ledger.gs
 * 取引ログから残高・利用杯数を導出する。
 * 設計方針：残高は保持せず「入金ログ＋利用ログ」を正として差し引きで導出する
 *  残高 = Σ(amount, status=active)
 *  利用杯数 = count(is_drink=TRUE, status=active)
 */

/** 全アクティブ取引から worker_code 別の集計マップを作る */
function buildLedgerIndex_() {
  const txs = readAllTx_();
  const today = toISODate_(new Date());
  const month = toMonthKey_(new Date());

  const byWorker = {}; // worker_code -> { balance, today, month, sumDrinks }
  const monthAgg = {}; // 'yyyy-MM' -> { coffee, tea, cups, spend, byWorker:{code:{coffee,tea,cups,spend,name,dept}} }

  txs.forEach(t => {
    if (String(t.status) === CONFIG.STATUS.CANCELLED) return;
    const code = String(t.worker_code || '');
    if (!code) return;
    const amt = Number(t.amount) || 0;
    const isDrink = truthy_(t.is_drink) && (t.is_drink === true || String(t.is_drink).toUpperCase() === 'TRUE' || t.is_drink === 1 || t.is_drink === '1');
    const type = String(t.type || '');

    const w = byWorker[code] || (byWorker[code] = { balance: 0, today: 0, month: 0 });
    w.balance += amt;

    const d = toDate_(t.created_at);
    const iso = d ? toISODate_(d) : '';
    const mk = d ? toMonthKey_(d) : '';

    if (isDrink) {
      if (iso === today) w.today += 1;
      if (mk === month) w.month += 1;
    }

    // 月別集計（ドリンクのみ杯数。利用額は coffee/tea/cup の支出合計）
    if (mk) {
      const ma = monthAgg[mk] || (monthAgg[mk] = { coffee: 0, tea: 0, cups: 0, spend: 0, byWorker: {} });
      const mw = ma.byWorker[code] || (ma.byWorker[code] = { coffee: 0, tea: 0, cups: 0, spend: 0, name: String(t.worker_name || ''), dept: String(t.dept_name || '') });
      if (type === CONFIG.TX_TYPE.COFFEE) { ma.coffee += 1; ma.cups += 1; mw.coffee += 1; mw.cups += 1; }
      else if (type === CONFIG.TX_TYPE.TEA) { ma.tea += 1; ma.cups += 1; mw.tea += 1; mw.cups += 1; }
      if (amt < 0) { ma.spend += Math.abs(amt); mw.spend += Math.abs(amt); }
    }
  });

  return { byWorker, monthAgg };
}

/** スタッフ1名の残高・本日/今月杯数を返す */
function ledgerForWorker_(code) {
  const { byWorker } = buildLedgerIndex_();
  return byWorker[code] || { balance: 0, today: 0, month: 0 };
}

/** スタッフ1名の直近履歴（取消可能） */
function historyForWorker_(code, limit) {
  limit = limit || 14;
  const txs = readAllTx_().filter(t =>
    String(t.worker_code) === String(code) && String(t.status) !== CONFIG.STATUS.CANCELLED);
  // created_at 降順
  txs.sort((a, b) => {
    const da = toDate_(a.created_at), dbb = toDate_(b.created_at);
    return (dbb ? dbb.getTime() : 0) - (da ? da.getTime() : 0);
  });
  return txs.slice(0, limit).map(t => {
    const d = toDate_(t.created_at);
    return {
      id: String(t.tx_id),
      label: String(t.label || ''),
      amount: Number(t.amount) || 0,
      drink: t.type === CONFIG.TX_TYPE.COFFEE || t.type === CONFIG.TX_TYPE.TEA,
      time: d ? Utilities.formatDate(d, Session.getScriptTimeZone(), 'HH:mm') : '',
    };
  });
}

/** 種別から金額・ラベル・ドリンク判定を解決 */
function resolveKind_(kind) {
  switch (kind) {
    case CONFIG.TX_TYPE.COFFEE: return { amount: -CONFIG.PRICES.coffee, label: 'コーヒー', isDrink: true };
    case CONFIG.TX_TYPE.TEA:    return { amount: -CONFIG.PRICES.tea,    label: 'お茶',     isDrink: true };
    case CONFIG.TX_TYPE.CUP:    return { amount: -CONFIG.PRICES.cup,    label: '紙コップ', isDrink: false };
    default: throw new Error('Unknown kind: ' + kind);
  }
}
