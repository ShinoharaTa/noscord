# Noscord デザイン監査（Web UI）

作成日: 2026-02-15  
対象: Webアプリ（SvelteKit）UIのスタイル定義/コンポーネント実装（コードベース静的確認）

## 監査の前提・範囲

- **実際の画面操作・見た目確認（ブラウザ実行）ではなく、コード（CSS/HTML/コンポーネント）からの静的監査**です。
- 監査対象は主に `src/styles/style.scss` と、主要画面/主要コンポーネント（サイドバー、チャンネル一覧、投稿、モーダル、設定）です。
- 「チャンネル一覧 API URL（`https://thread.nchan.vip/channels`）は変更しない」前提は維持します（デザイン監査の対象外）。

## 現状のデザイン基盤（設計の骨格）

### デザイントークン（CSS変数）

`src/styles/style.scss` の `:root` に以下が定義されています。

- **カラー**: `--primary-color`, `--primary-text`, `--secondary-text`, `--bg-primary`, `--bg-secondary`, `--border-color` 等
- **タイポ**: `--font-family`, `--font-weight-*`, `--font-size-*`, `--line-height-*`
- **レイアウト**: `--sidebar-width`, ブレークポイント（`--mobile-breakpoint`, `--tablet-breakpoint`）
- **ダークモード**: `@media (prefers-color-scheme: dark)` で `:root` を上書き

→ 全体として「変数で統一する」方向性は良く、ベースは揃っています。

## 不整合・気になる点（一覧）

### 1) トークンの二重系（旧変数と新変数の併存）

- **現象**
  - `style.scss` に **旧変数**として `--background`, `--text` が残っており、`body` はそれを参照しています。
  - 一方で、画面/コンポーネント側は `--bg-primary`, `--chat-bg`, `--text-color` など **別系統**の変数を多用します。
- **影響**
  - 今後トークンを調整したときに、**一部だけ色が変わる/変わらない**などの不整合を生みやすいです。
- **推奨**
  - `body` の参照先を `--bg-primary` / `--text-color` に寄せ、旧変数は段階的に廃止（または alias として完全同期）する。

### 2) コンポーネント内での「独自ダークモード上書き」

- **現象**
  - `chat-area.svelte` や `settings-modal.svelte` などで、`@media (prefers-color-scheme: dark)` 内に **コンポーネント局所の変数上書き**が存在します。
- **影響**
  - ルートトークン（`style.scss`）を調整しても、そのコンポーネントだけ **別の色味に固定される**可能性があります。
  - 同じトークン名でもスコープが違い、理解コストが増えます。
- **推奨**
  - 原則は `:root`（`style.scss`）のトークンで統一し、コンポーネント内の独自上書きは「例外が必要な箇所」だけに限定する。

### 3) トークン名の取り違い/存在しない変数参照

- **現象**
  - `icons.svelte` のフォールバック背景が `var(--text-muted)` を参照していますが、トークン定義は `--muted-text` です。
- **影響**
  - フォールバック表示時に **意図しない色（未定義→透過等）**になり得ます。
- **推奨**
  - 参照を `--muted-text` に揃える、または `--text-muted` を正式トークンとして定義する。

### 4) ステータスカラーのセマンティクスが混ざっている

- **現象**
  - `settings-modal.svelte` では `--warning-bg` 等を利用する一方、テキスト色に `--warning-color`（本来はブランド色に近い値）を使うなど、**「用途別トークン」と「色名トークン」が混在**しています。
  - `--success-bg`, `--success-border` 等は `style.scss` で明示定義されておらず、コンポーネント側で fallback を持っています。
- **影響**
  - 画面ごとに「警告/成功」の見た目が変わりやすく、統一感が崩れます。
- **推奨**
  - 「ステータス用途」トークン（例: `--status-warning-bg/text/border`）を `style.scss` に集約して、コンポーネントではそれを参照する。

### 5) グローバル要素スタイルと、画面/コンポーネントの独自スタイルが衝突し得る

- **現象**
  - `style.scss` に `button`, `input`, `textarea` の **グローバルスタイル**（背景色、角丸、max-width 等）があり、各画面は `.btn` / `.form-input` 等の **独自クラス**で別定義しています。
- **影響**
  - クラスが付いていない要素が混ざると、**その場だけ違う見た目**になりやすいです。
  - 「どこで見た目が決まるか」が追いにくいです。
- **推奨**
  - グローバルの `button/input/textarea` は「リセット（最小限）」に寄せ、実際の見た目はコンポーネント/ユーティリティクラスへ集約する。
  - あるいは逆に「デフォルトのボタン/入力」を明確に定義し、全箇所がそれを基準にする。

### 6) 角丸・影・余白スケールが画面ごとに微妙に違う

- **現象（例）**
  - 角丸: 4px / 6px / 8px / 12px / 16px が混在
  - 影: `0 2px 4px`、`0 10px 25px` 等が混在
  - 余白: 12/16/20/24/32 が混在（悪いわけではないが、明文化が無い）
- **影響**
  - UI全体の「トーン」が揃いにくい（カードだけ急に強い影、モーダルだけ角丸が大きい、など）。
- **推奨**
  - 角丸/影/スペーシングもトークン化（例: `--radius-sm/md/lg`, `--shadow-sm/md/lg`, `--space-*`）し、主要コンポーネントはそこに合わせる。

### 7) タイポグラフィの責務が散っている

- **現象**
  - `style.scss` の `p` や `article h3`、各ページの `h1/h2/h3` がそれぞれ独自に設定しており、階層のルールがドキュメント化されていません。
- **影響**
  - 見出しレベルの一貫性や、ページ間の読みやすさの統一が崩れやすいです。
- **推奨**
  - 見出し/本文/補助テキストの規約（サイズ・weight・margin）を `docs/` に明文化し、スタイルも共通化する。

## まとめ（現状の評価）

- **良い点**: `style.scss` のトークン整備とダークモードの基盤、主要画面のコンポーネント化はできています。
- **不整合の中心**: 「トークンの二重系」「コンポーネント局所のテーマ上書き」「用途トークンの未整備」「グローバル要素スタイルと独自スタイルの混在」です。

## 対応履歴

### 2026-02-15 実施

| # | アクション | 対応内容 | ステータス |
|---|-----------|---------|-----------|
| 1 | **トークンの一本化** | `body` の参照先を `--bg-primary` / `--text-color` へ移行。旧変数 `--background`, `--text` は新トークンの alias に変更。`button.small` の `var(--text)` も `var(--text-color)` へ。`.modal` の `background: white` を `var(--modal-bg)` へ。 | ✅ 完了 |
| 2 | **局所ダークモード上書きの整理** | `chat-area.svelte`, `settings-modal.svelte`, `new/+page.svelte`, `develop/design/+page.svelte` のコンポーネント内 `@media (prefers-color-scheme: dark)` ブロックを削除し、ルートトークン参照に統一。 | ✅ 完了 |
| 3 | **ステータス用途トークンの追加** | `style.scss` に `--success-bg/text/border`, `--warning-bg/text/border`, `--info-bg/text/border`, `--danger-bg/text/border`, `--danger-color/hover` をライト/ダーク両方で定義。`--modal-bg` も追加。`settings-modal.svelte` のステータス表示を新トークン参照に変更。 | ✅ 完了 |
| 4 | **`icons.svelte` の未定義トークン参照修正** | `var(--text-muted)` → `var(--muted-text)` に修正。 | ✅ 完了 |
| 5 | **角丸/影/余白のスケール定義** | `style.scss` に `--radius-sm/md/lg/xl/full`, `--shadow-sm/md/lg`, `--space-1〜10` を定義。主要コンポーネント（`settings-modal`, `new/+page`, `develop/design/+page`、グローバル `button`, `.modal`, `.image-link img`）のハードコード値をトークンに置換。 | ✅ 完了 |

### 残課題

- **グローバル要素スタイルのさらなるリセット化**（`input`, `textarea`, `label` のグローバル定義について、リセットに寄せるかデフォルトスタイルとして確定するかの判断）
- **タイポグラフィの規約明文化**（見出し/本文/補助テキストのサイズ・weight・margin ルールのドキュメント化）
- **他コンポーネントへのスケールトークン適用拡大**（`sidebar.svelte`, `navbar.svelte`, `post.svelte`, `[channel_id]/+page.svelte`, `channels/+page.svelte` 等）

