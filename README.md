# マイモン

自分で描いたモンスター「マイモン」が3Dになって動きだすWebゲームです。

## 構成（すべて無料）
- 画面：GitHub Pages（`index.html` `site.js` `config.js` `icon.png` `og.png`）
- ログイン用の関数：Cloudflare Workers（`worker.js` を貼り付ける）
- データ保存：Firebase Spark プラン（`firestore.rules` を貼り付ける）

`config.js` が初期値（`YOUR_...`）のままでも、ゲストモードで遊べます。

## 大事な注意
- Firebase の秘密鍵（JSONファイル）は **GitHubに絶対に上げない**。Cloudflare の「シークレット」にだけ入れる
- `worker.js` と `firestore.rules` は貼り付け用の控えです。GitHubに置いてあっても動作には関係ありません

## うまくいかないとき
| 症状 | 原因と直し方 |
|---|---|
| `missing_setting` | Cloudflare の変数の名前が違う・足りない |
| `invalid_token` | `LINE_CHANNEL_ID` が違う |
| `server_error` | `FB_PRIVATE_KEY` の貼り付けが途中で切れている |
| LINEの画面から戻るとエラー | LIFFのエンドポイントURLとサイトのURLがずれている（末尾の `/` まで合わせる） |
| ログインはできるが保存されない | Firestore の「ルール」に `firestore.rules` を貼って公開していない |
| 友達がログインできない | LINEのチャネルが「開発中」のまま |
