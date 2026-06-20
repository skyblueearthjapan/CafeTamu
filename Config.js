/** Config.gs
 * 喫茶Tamu カウントアプリ — 設定の集約
 * 部署・社員（作業員）マスタは Car-Management-System と同一のマスタ元を参照する。
 */
const CONFIG = {
  // DB はこのスクリプトがバインドされたスプレッドシート（getActiveSpreadsheet）を使う。
  // マスタ元は Car-Management-System と同じ「LW／作業日報_全従業員用」スプレッドシート。
  MASTER_SOURCE_SPREADSHEET_ID: '1iu5HoaknlW1W1HheeYv0jqcRq-aY0SyEE2seQd2pHkQ',

  // マスタ元のシート名（同期元）
  SOURCE_SHEETS: {
    DEPT: '部署マスタ',
    WORKER: '作業員マスタ',
  },

  // DB（バインド先スプレッドシート）のシート名
  SHEETS: {
    DEPT: 'DeptMaster',        // マスタ同期コピー
    WORKER: 'WorkerMaster',    // マスタ同期コピー
    TX: 'Transactions',        // 入金・利用ログ（残高の正）
    SYNC_LOG: 'SyncLog',
  },

  // 部署チップは作業員マスタの「部署」列のユニーク値から生成する（部署マスタは使わない）。
  // Overtime-Holiday-Work-Request と同じ方式。"業務" のような親グループは出ず、
  // 実在の部署（総務部・資材・購買・生産管理・品質管理・在庫管理・営業部 など）が並ぶ。

  // 表示・集計の対象を絞り込む条件（作業員マスタの「拠点」「スタッフ種類」列で判定）。
  // 喫茶Tamu は新工場の事務所スタッフ専用のため、拠点=新工場 かつ スタッフ種類=事務所 のみを対象にする。
  // 値を空文字にするとその条件は無効化（全件対象）になる。マスタの値変更時はここを書き換える。
  WORKER_FILTER: {
    LOCATION: '新工場',     // 作業員マスタ E列「拠点」
    STAFF_TYPE: '事務所',   // 作業員マスタ F列「スタッフ種類」
  },

  // 料金（円）。利用は残高からのマイナス。
  // 課金対象はコーヒーのみ。お茶（給茶機）は無料、紙コップは原則禁止（マイコップ使用）。
  PRICES: {
    coffee: 20,  // コーヒー 1杯 ¥20
  },

  // 入金ボタン（100円単位のみ。10円玉での入金は禁止）
  DEPOSIT_OPTIONS: [100, 500, 1000],

  // 社内ポータルサイトURL（ヘッダー右上「社内ポータルへ移動」ボタンの遷移先）
  // Car-Management-System と同じポータルを参照。変更する場合はここを書き換える。
  PORTAL_URL: 'https://script.google.com/a/macros/lineworks-local.info/s/AKfycbx2eyJMOYP9o--GPBuhY-pj071IIR6Kqb_0xALwwNzdLQZux0dIAlL3P9EoCucnzXA/exec',

  // 取引種別
  TX_TYPE: {
    COFFEE: 'coffee',
    TEA: 'tea',
    CUP: 'cup',
    DEPOSIT: 'deposit',
  },

  // ステータス
  STATUS: {
    ACTIVE: 'active',
    CANCELLED: 'cancelled',
  },
};
