# マイモン

自分で描いたモンスター「マイモン」が3Dになって動きだすWebゲームです。

- 画面（GitHub Pagesで公開）：`index.html` `site.js` `config.js` `icon.png` `og.png`
- LINEログインとデータ保存（Firebaseで公開）：`firebase/` フォルダ

`config.js` が初期値（`YOUR_...`）のままでも、ゲストモードで遊べます。ゲストモードでは、データはその端末だけに保存されます。

## 公開の手順

### 1. GitHub Pagesで画面を公開する
1. GitHubで `maimon` という名前の **Public** リポジトリを作る
2. このフォルダの中身を全部アップロードする（`firebase/` フォルダも一緒でOK）
3. リポジトリの Settings → Pages → Source を「Deploy from a branch」、Branch を `main` / `(root)` にして Save
4. 1〜2分後に `https://<GitHubのユーザー名>.github.io/maimon/` が開けたら成功（この時点ではゲストモード）

### 2. Firebaseを用意する
1. [Firebase コンソール](https://console.firebase.google.com/) でプロジェクトを作る（Googleアナリティクスはオフで大丈夫）
2. 左下の料金プランを **Blaze** にする。ログイン用の関数に必要です。小規模なら無料枠に収まります。予算アラート（例：100円）を設定しておくと安心です
3. 「構築」→「Authentication」→「始める」を押すだけ（プロバイダの追加はいりません）
4. 「構築」→「Firestore Database」→「データベースを作成」→ ロケーション `asia-northeast1 (Tokyo)`、本番環境モード
5. 「プロジェクトの設定」（歯車）→「マイアプリ」の `</>` でウェブアプリを登録する。表示された `apiKey` `authDomain` `projectId` `appId` を `config.js` にコピーする

### 3. LINE Developersでログインを用意する
1. [LINE Developers コンソール](https://developers.line.biz/console/) にLINEアカウントでログインし、プロバイダーを作る
2. 「新規チャネル作成」→「LINEログイン」→ アプリタイプは「ウェブアプリ」
3. 「チャネル基本設定」タブの **チャネルID** をメモする
4. 「LINEログイン設定」タブのコールバックURLに `https://<ユーザー名>.github.io/maimon/` を入れる
5. 「LIFF」タブ →「追加」
   - LIFFアプリのサイズ：Full
   - エンドポイントURL：`https://<ユーザー名>.github.io/maimon/`
   - Scope：`openid` と `profile` にチェック
   - shareTargetPicker：オン
6. 表示された **LIFF ID** を `config.js` の `liffId` にコピーする

### 4. ログイン用の関数をFirebaseに公開する（パソコンで1回だけ）
1. [Node.js](https://nodejs.org/) のLTS版（20以上）を入れる
2. ターミナルで次を実行する
   ```bash
   npm install -g firebase-tools
   firebase login
   ```
3. `firebase/.firebaserc` の `YOUR_PROJECT_ID` を、FirebaseのプロジェクトIDに書きかえる
4. `firebase/functions/.env.example` をコピーして `firebase/functions/.env` を作り、`LINE_CHANNEL_ID=` の後ろに手順3-3のチャネルIDを書く（このファイルはGitHubに上げない）
5. 公開する
   ```bash
   cd firebase/functions
   npm install
   cd ..
   firebase deploy --only functions,firestore
   ```
6. 最後に出る `https://asia-northeast1-<プロジェクトID>.cloudfunctions.net/lineAuth` を `config.js` の `authEndpoint` にコピーする

### 5. ログイン用トークンの権限をつける
1. [Google Cloud の IAM](https://console.cloud.google.com/iam-admin/iam) を開き、上で同じプロジェクトを選ぶ
2. `<数字>-compute@developer.gserviceaccount.com` の鉛筆マーク →「別のロールを追加」→「**サービス アカウント トークン作成者**」→ 保存

### 6. 仕上げ
1. 書きかえた `config.js` をGitHubに上げる
2. `index.html` の12行目の `YOUR_GITHUB_NAME` を自分のユーザー名にする（LINEで送ったときのプレビュー画像用）
3. LINEで `https://liff.line.me/<LIFF ID>` を開き、設定画面に「LINEでログイン中」と出れば成功
4. LINE Developers のチャネル上部の「開発中」を「**公開済み**」に切り替える（これをしないと友達がログインできない）

## うまくいかないとき
| 症状 | 原因と直し方 |
|---|---|
| ログインで止まる・`server_error` | 手順5の権限が付いていない |
| `invalid_token` | `.env` のチャネルIDが違う。直したら `firebase deploy --only functions` |
| LINEの画面から戻るとエラー | LIFFのエンドポイントURLとサイトのURLが違う（末尾の `/` まで合わせる） |
| ログインはできるが保存されない | `firebase deploy --only firestore` でルールを公開し直す |
| 友達がログインできない | チャネルが「開発中」のまま |

## 更新のしかた
画面を直したときは、GitHubにpushするだけです。`firebase/` の中を変えたときだけ `firebase deploy --only functions,firestore` を実行します。
