/* マイモンの設定ファイル
   ここを書きかえるとLINEログインが使えるようになります（README.md の手順）。
   このまま（YOUR_のまま）でもゲストモードで遊べます。 */
window.MAIMON_CONFIG = {
  // LINE Developers の LIFF ID（例: 2001234567-AbCdEfGh）
  liffId: "YOUR_LIFF_ID",

  // Firebase コンソール →「プロジェクトの設定」→「マイアプリ」のウェブアプリの設定値
  firebase: {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    appId: "YOUR_FIREBASE_APP_ID"
  },

  // ログイン用の関数のURL（firebase deploy のあとに表示されるURL）
  authEndpoint: "https://asia-northeast1-YOUR_PROJECT_ID.cloudfunctions.net/lineAuth",

  // 友達招待で送るURL（空なら https://liff.line.me/LIFF_ID）
  shareUrl: ""
};
