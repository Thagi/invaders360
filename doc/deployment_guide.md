# GitHub Pages デプロイ手順

## 概要
このドキュメントでは、Polygon Spiral ゲームをGitHub Pagesで公開するための手順を説明します。

## 前提条件
- GitHubアカウントを持っていること
- リポジトリがGitHubにプッシュされていること
- Node.jsとnpmがインストールされていること

---

## デプロイ手順

### 1. ビルド設定の確認

プロジェクトの `package.json` にビルドスクリプトが含まれていることを確認してください：

```json
{
  "scripts": {
    "build": "vite build"
  }
}
```

### 2. ベースパスの設定

GitHub Pagesでは、リポジトリ名がURLのサブパスになります（例：`https://username.github.io/invaders360/`）。

プロジェクトルートに `vite.config.js` を作成し、以下を追加：

```javascript
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/invaders360/', // リポジトリ名に合わせて変更
  build: {
    outDir: 'dist'
  }
})
```

> **注意**: リポジトリ名が異なる場合は、`base` の値を適宜変更してください。

### 3. ビルドの実行

プロジェクトをビルドします：

```bash
npm run build
```

ビルドが成功すると、`dist` ディレクトリに公開用ファイルが生成されます。

### 4. GitHub Pagesの設定

#### 方法A: GitHub Actionsを使用（推奨）

1. プロジェクトルートに `.github/workflows` ディレクトリを作成
2. `deploy.yml` ファイルを作成し、以下を記述：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches:
      - main  # または master

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

3. GitHubリポジトリにプッシュ：

```bash
git add .
git commit -m "Add GitHub Pages deployment workflow"
git push
```

4. GitHubリポジトリのSettings → Pagesで以下を設定：
   - **Source**: GitHub Actions を選択

#### 方法B: gh-pagesブランチを使用

1. `gh-pages` パッケージをインストール：

```bash
npm install --save-dev gh-pages
```

2. `package.json` にデプロイスクリプトを追加：

```json
{
  "scripts": {
    "deploy": "npm run build && gh-pages -d dist"
  }
}
```

3. デプロイを実行：

```bash
npm run deploy
```

4. GitHubリポジトリのSettings → Pagesで以下を設定：
   - **Source**: Deploy from a branch
   - **Branch**: gh-pages / (root)

### 5. 公開の確認

数分後、以下のURLでゲームにアクセスできます：

```
https://[ユーザー名].github.io/[リポジトリ名]/
```

例：`https://thagi.github.io/invaders360/`

---

## トラブルシューティング

### ページが表示されない
- GitHub ActionsのWorkflowが正常に完了しているか確認
- Settings → Pagesで正しいソースが選択されているか確認
- ブラウザのキャッシュをクリアして再読み込み

### CSSやJSが読み込まれない
- `vite.config.js` の `base` パスが正しく設定されているか確認
- リポジトリ名とbase設定が一致しているか確認

### ビルドエラーが発生する
- `npm ci` で依存関係を再インストール
- Node.jsのバージョンが適切か確認（推奨: v18以上）

---

## 更新方法

コードを変更した後は、以下の手順で更新します：

**GitHub Actionsを使用している場合：**
```bash
git add .
git commit -m "Update game"
git push
```

**gh-pagesを使用している場合：**
```bash
npm run deploy
```

---

## カスタムドメインの設定（オプション）

独自ドメインを使用したい場合：

1. `public/CNAME` ファイルを作成し、ドメイン名を記述：
   ```
   game.example.com
   ```

2. DNS設定で、CNAMEレコードを追加：
   ```
   game.example.com → [ユーザー名].github.io
   ```

3. GitHub Settings → Pagesで「Custom domain」を設定

---

## まとめ

これでPolygon SpiralがGitHub Pagesで公開されました！URLを共有して、世界中の人にゲームを楽しんでもらいましょう。
