# 喫茶Tamu カウントアプリ

社内のコーヒー・給茶機利用を管理する、プリペイド式カウントアプリ（Google Apps Script / スプレッドシートバインド型）。
レトロ純喫茶（深緑×クリーム）配色・券売機モデル。給茶機横の共用タブレット／各自スマホ兼用。

デザイン元：Claude Design の「喫茶Tamu カウントアプリ モバイル」プロトタイプをそのまま反映。

## 料金・ルール

- コーヒー 1杯 **¥20** ／ 給茶機のお茶 1杯 **¥10** ／ 紙コップ **+¥10**
- 入金は **100円単位のみ**（¥100 / ¥500 / ¥1,000）。**10円玉での入金は不可**
- プリペイド式：残高 = 入金合計 − 利用合計（残高は保持せず取引ログから導出）

## 画面

| 画面 | 内容 |
|---|---|
| ホーム | 氏名・部署で検索、部署チップで絞り込み、スタッフ一覧（残高表示） |
| カウント | LED残高表示・本日/今月杯数・コーヒー/お茶/紙コップ・コイン投入口（入金）・直近履歴/取消。操作時「ピッ」、入金時「チャリーン」演出 |
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
| `Index.html` | 画面構造（ホーム/カウント/管理） |
| `Css.html` | レトロ純喫茶配色・レイアウト・「ピッ」演出アニメーション |
| `Js.html` | 画面遷移・楽観更新・`google.script.run` 連携 |
| `Logo.html` | LINE W ロゴ（base64データURI）。緑タイル上でCSSフィルタによりクリーム色に再着色 |

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
