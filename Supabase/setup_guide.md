# Supabase セットアップ手順書 (リーダーボード機能用)

## 概要
INVADERS 360のハイスコア保存機能（リーダーボード）のバックエンドとして、Supabaseを利用するためのセットアップ手順です。

## 1. Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com/) にアクセスし、アカウントを作成またはログインします。
2. "New Project" をクリックします。
3. 以下の情報を入力してプロジェクトを作成します：
   - **Name**: `invaders360-leaderboard` (任意)
   - **Database Password**: 強力なパスワードを設定（忘れないように保存してください）
   - **Region**: ユーザーに近いリージョン（例: `Tokyo`）
4. プロジェクトが作成されるまで数分待ちます。

## 2. データベースの作成 (Table Setup)

リーダーボード用のテーブルを作成します。

1. 左サイドバーの **Table Editor** (テーブルアイコン) をクリックします。
2. "New Table" をクリックします。
3. 以下の設定でテーブルを作成します：
   - **Name**: `scores`
   - **Description**: `Leaderboard scores`
   - **Enable Row Level Security (RLS)**: チェックを入れる（重要）
   - **Realtime**: チェックを入れる（任意：リアルタイム更新が必要な場合）

4. **Columns** (カラム) を以下のように定義します：

| Name | Type | Default Value | Primary | 備考 |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | `gen_random_uuid()` | ✅ | 自動生成ID |
| `created_at` | `timestamptz` | `now()` | | 作成日時 |
| `player_name` | `text` | | | プレイヤー名 |
| `score` | `int8` (bigint) | | | スコア |
| `mode` | `text` | | | ゲームモード (CLASSIC, TIME_ATTACK, SURVIVAL) |

5. "Save" をクリックしてテーブルを作成します。

## 3. Row Level Security (RLS) ポリシーの設定

セキュリティのため、データの読み書き権限を設定します。今回は「誰でもスコアを読める」「誰でもスコアを追加できる（認証なし）」という設定にします。

1. 左サイドバーの **Authentication** > **Policies** をクリックします。
2. `scores` テーブルの "New Policy" をクリックします。
3. "For full customization" を選択します。

### ポリシー1: 全員の読み取りを許可 (Select)
- **Policy Name**: `Enable read access for all users`
- **Allowed Operation**: `SELECT`
- **Target roles**: `anon`, `authenticated` (または空欄で全て)
- **USING expression**: `true`
- "Save Policy" をクリック。

### ポリシー2: 全員の書き込みを許可 (Insert)
- **Policy Name**: `Enable insert access for all users`
- **Allowed Operation**: `INSERT`
- **Target roles**: `anon`, `authenticated`
- **WITH CHECK expression**: `true`
- "Save Policy" をクリック。

> **注意**: この設定は認証なしで誰でもデータを投稿できるため、スパムのリスクがあります。本番運用で厳密な管理が必要な場合は、Supabase AuthやEdge Functionsによる検証を検討してください。今回は要件により簡易的な設定とします。

## 4. APIキーの取得

フロントエンドから接続するためのキーを取得します。

1. 左サイドバーの **Project Settings** (歯車アイコン) > **API** をクリックします。
2. 以下の2つの値をコピーして保存します：
   - **Project URL**: `https://xxxxxxxxxxxx.supabase.co`
   - **Project API keys (anon / public)**: `eyJxh...`

## 5. 環境変数の設定 (ローカル開発)

プロジェクトルートに `.env` ファイルを作成し（`.gitignore`に追加済みであることを確認）、以下のように記述します：

```env
VITE_SUPABASE_URL=あなたのProject_URL
VITE_SUPABASE_ANON_KEY=あなたのAnon_Key
```

## 6. GitHub Pages への環境変数設定

GitHub Pagesで公開する際は、GitHub Secretsに環境変数を設定し、ビルド時に埋め込む必要があります。

1. GitHubリポジトリの **Settings** > **Secrets and variables** > **Actions** を開きます。
2. "New repository secret" をクリックし、以下を追加します：
   - Name: `VITE_SUPABASE_URL`, Secret: (Project URL)
   - Name: `VITE_SUPABASE_ANON_KEY`, Secret: (Anon Key)

3. `deploy.yml` (GitHub Actions) を編集し、ビルドステップで環境変数を渡すようにします（後述の実装フェーズで対応）。

---

以上でSupabaseの準備は完了です。
