# 喫茶Tamu カウントアプリ

社内のコーヒー・給茶機利用を管理する、プリペイド式カウントアプリ（Google Apps Script / スプレッドシートバインド型）。
レトロ純喫茶（深緑×クリーム）配色・券売機モデル。給茶機横の共用タブレット／各自スマホ兼用。

**対象スタッフ**：新工場の事務所スタッフのみ（作業員マスタの `拠点=新工場` かつ `スタッフ種類=事務所`）。
絞り込み条件は `Config.js` の `WORKER_FILTER` で変更できる（値を空にするとその条件は無効化＝全件対象）。

デザイン元：Claude Design の「喫茶Tamu カウントアプリ モバイル」プロトタイプをそのまま反映。

## 料金・ルール

- 課金対象は **コーヒー 1杯 ¥20** のみ。**給茶機のお茶は無料**
- **紙コップの使用は原則禁止**（マイコップを使用）。カウント画面に明文化
- 入金は **100円単位のみ**（¥100 / ¥500 / ¥1,000）。**10円玉での入金は不可**
- プリペイド式：残高 = 入金合計 − 利用合計（残高は保持せず取引ログから導出）

## 端末別レイアウト（出し分け）

同一URLで端末を判定し、レイアウトを出し分ける。

- **タブレット／PC**（横幅820px以上・横長）→ **券売機モデル**（横画面・大きなボタン・給茶機横の共用端末向け）
- **スマホ** → 縦1カラムのモバイル専用レイアウト

`doGet` で `?view` 未指定時は `Router` を返し、画面サイズを判定して `?view=tablet` / `?view=mobile` に振り分ける（`?view=` を直接付ければ手動切替も可能）。

## 画面（両レイアウト共通の機能）

| 画面 | 内容 |
|---|---|
| ホーム | 氏名・部署で検索、部署チップで絞り込み、スタッフ一覧（残高表示） |
| カウント | LED残高表示・本日/今月杯数・コーヒー（大ボタン）・マイコップ案内（紙コップ原則禁止）・コイン投入口（入金）・直近履歴/取消。操作時「ピッ」、入金時「チャリーン」演出 |
| 管理（全体集計） | サマリ（登録/本日/今月/マイナス/預り残高/平均）・スタッフ別・月別推移（月タップでスタッフ別内訳） |

## アーキテクチャ

```
ブラウザ(HtmlService) ──google.script.run──> GAS API ──> スプレッドシート(DB)
                                                  └──同期── マスタ元スプレッドシート
```

### サーバ（.js → GAS .gs）

| ファイル | 役割 |
|---|---|
| `Config.js` | スプレッドシートID・シート名・料金・入金額・部署グループ |
| `Util.js` | ok/fail、日付フォーマット、ID採番 |
| `Db.js` | DBアクセス。`readDeptMaster_`/`readWorkerMaster_`（ヘッダーなし固定列）＋ Transactions 読み書き |
| `MasterSync.js` | マスタ元 → DeptMaster/WorkerMaster へ全置換同期（Car-Management-System と同一方式） |
| `Ledger.js` | 取引ログから残高・本日/今月杯数・月別集計を導出 |
| `Code.js` | `doGet`／API（getInit, getStaffState, recordUsage, recordDeposit, undoEntry, getAdmin, getMonthDetail, syncMasters）／setup・トリガー |

### クライアント（.html）

| ファイル | 役割 |
|---|---|
| `Router.html` | 端末判定 → `?view=tablet`/`mobile` へ振り分け |
| `Index.html` / `Css.html` / `Js.html` | スマホ版（縦1カラム） |
| `IndexTablet.html` / `CssTablet.html` / `JsTablet.html` | タブレット版（券売機モデル・横画面） |
| `Logo.html` | LINE W ロゴ（base64データURI）。緑タイル上でCSSフィルタによりクリーム色に再着色（両版共通） |

クライアントロジックは両版とも同一の共通API（`Code.js`）を呼ぶ。

### DBシート（バインド先スプレッドシート内に自動作成）

- `DeptMaster` / `WorkerMaster` … マスタ元から同期（手編集しない）
- `Transactions` … 入金・利用ログ（`tx_id, worker_code, worker_name, dept_name, type, label, amount, is_drink, created_at, status, cancelled_at`）
- `SyncLog` … 同期履歴

## セットアップ

1. `clasp push` でコードを反映
2. Apps Script エディタで **`setup`** を一度実行（DBシート作成＋マスタ初回同期。Drive権限の承認が必要）
3. `setupSyncTrigger` を実行すると毎日 06:00 にマスタ自動同期
4. ウェブアプリとしてデプロイ（実行ユーザー・アクセス範囲は運用に合わせて設定）

## 開発

- ローカル編集 → `clasp push`（GAS反映）／ `clasp pull`（GASから取得）
- マスタ元：Car-Management-System と同一（`MASTER_SOURCE_SPREADSHEET_ID`）
