/* マイモン サイト版：ログイン（Google／LINE）とFirebaseをゲームにつなぐ */
(function(){
  'use strict';
  var C=window.MAIMON_CONFIG||{};
  var bad=function(v){return !v||/YOUR_|xxxx/i.test(String(v))};
  var fbOk=!!(C.firebase&&!bad(C.firebase.apiKey)&&!bad(C.firebase.projectId));
  var lineOk=fbOk&&!bad(C.liffId)&&!bad(C.authEndpoint);
  var inLineApp=/\bLine\//i.test(navigator.userAgent);
  var GUEST_KEY='maimon-guest';
  var fs=null,auth=null,uid=null,myName='',provider='',liffOk=false,decided=false;
  var resolveAuth;var authDecided=new Promise(function(r){resolveAuth=function(v){if(decided)return;decided=true;r(v)}});

  function $(s){return document.querySelector(s)}
  function layers(){return document.getElementById('layers')||document.body}
  function sheet(html){var v=document.createElement('div');v.className='veil bottom';v.innerHTML=html;layers().appendChild(v);return v}
  function alertSheet(msg,extra){var v=sheet('<div class="bsheet" role="dialog" aria-modal="true"><p class="note" style="font-size:13px;white-space:pre-line;word-break:break-all"></p>'+(extra||'')+'<button class="btn" data-close>とじる</button></div>');v.querySelector('.note').textContent=msg;v.addEventListener('click',function(e){if(e.target===v||e.target.closest('[data-close]'))v.remove()});return v}

  async function afterSignIn(user,name){
    uid=user.uid;myName=(name||user.displayName||'').slice(0,40);
    provider=String(uid).indexOf('line:')===0?'line':'google';
    try{localStorage.removeItem(GUEST_KEY)}catch(e){}
    resolveAuth(true)}

  async function signInWithLine(){
    var idToken=liff.getIDToken();if(!idToken)throw new Error('no_id_token');
    var r=await fetch(C.authEndpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:idToken})});
    if(!r.ok)throw new Error('auth_failed');var j=await r.json();
    var cred=await auth.signInWithCustomToken(j.token);await afterSignIn(cred.user,j.name)}

  async function init(){
    if(!fbOk){resolveAuth(false);return}
    try{
      firebase.initializeApp(C.firebase);auth=firebase.auth();fs=firebase.firestore();
      try{await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)}catch(e){}
      // 前回ログインしていれば、まずそれを使う（毎回ログインし直さなくてよい）
      var u0=await new Promise(function(res){var un=auth.onAuthStateChanged(function(x){un();res(x)})});
      if(u0){await afterSignIn(u0);return}
      try{await Promise.race([auth.getRedirectResult(),new Promise(function(r){setTimeout(r,4000)})])}catch(e){console.warn('[maimon] redirect',e)}
      if(lineOk){try{await liff.init({liffId:C.liffId});liffOk=true;if(liff.isLoggedIn()){await signInWithLine();return}}catch(e){console.warn('[maimon] liff',e)}}
      var u=await new Promise(function(res){var un=auth.onAuthStateChanged(function(x){un();res(x)})});
      if(u){await afterSignIn(u);return}
      var guest=false;try{guest=localStorage.getItem(GUEST_KEY)==='1'}catch(e){}
      if(guest)resolveAuth(false);
    }catch(e){console.warn('[maimon] init failed',e);resolveAuth(false)}
  }

  function externalUrl(){var u=location.href.split('#')[0];return u+(u.indexOf('?')>=0?'&':'?')+'openExternalBrowser=1'}
  async function loginGoogle(){
    if(inLineApp){alertSheet('LINEの中のブラウザでは、Googleのログインが使えません。下のボタンでいつものブラウザ（ChromeやSafari）で開いてください。','<a class="btn sun" href="'+externalUrl()+'" style="text-decoration:none">ブラウザで開く</a>');return false}
    var p=new firebase.auth.GoogleAuthProvider();p.setCustomParameters({prompt:'select_account'});
    try{var cred=await auth.signInWithPopup(p);await afterSignIn(cred.user);return true}
    catch(e){
      if(e&&(e.code==='auth/popup-blocked'||e.code==='auth/operation-not-supported-in-this-environment')){await auth.signInWithRedirect(p);return false}
      if(e&&(e.code==='auth/popup-closed-by-user'||e.code==='auth/cancelled-popup-request'))return false;
      if(e&&e.code==='auth/unauthorized-domain'){alertSheet('このサイトのURLがFirebaseに登録されていません。Firebaseの「Authentication」→「設定」→「承認済みドメイン」に追加してください。');return false}
      alertSheet('ログインできませんでした（'+((e&&e.code)||'エラー')+'）。少し待ってからもう一度ためしてください。');return false}}
  function loginLine(){if(!liffOk){alertSheet('LINEにつながりませんでした。通信を確認して、ページを開き直してください。');return}liff.login({redirectUri:location.href.split('#')[0]})}

  /* ゲーム側が使う窓口 */
  var downloads={save:async function(o){
    var file=null;try{file=new File([o.data],o.filename,{type:o.data.type||'image/png'})}catch(e){}
    if(file&&navigator.canShare&&navigator.canShare({files:[file]})){try{await navigator.share({files:[file],title:'マイモン'});return{status:'saved'}}catch(e){if(e&&e.name==='AbortError')throw{code:'declined'}}}
    var url=URL.createObjectURL(o.data),a=document.createElement('a');a.href=url;a.download=o.filename;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url)},5000);return{status:'saved'}}};
  var user={
    id:async function(){return uid},
    profiles:async function(ids){var out={};await Promise.all((ids||[]).map(async function(id){try{var d=await fs.doc('profiles/'+id).get();if(d.exists)out[id]={name:(d.data()||{}).name||''}}catch(e){}}));return out}};
  window.claude={use:async function(name){
    if(name==='downloads')return downloads;
    var ok=await authDecided;if(!ok||!uid)return null;
    if(name==='db')return fs;if(name==='user')return user;return null}};

  /* タイトルで呼ばれる：ログインするかゲストで遊ぶかを決める */
  window.MAIMON_SITE={
    ensureAuth:async function(){
      if(!decided&&fbOk)await Promise.race([initDone,new Promise(function(r){setTimeout(r,6000)})]);
      if(decided||!fbOk)return true;
      return new Promise(function(res){
        var v=sheet('<div class="bsheet" role="dialog" aria-modal="true"><h3>はじめる前に</h3><p class="note">ログインすると、マイモンがアカウントに保存されます。機種変更しても続きから遊べて、フレンドとの交換もできます。</p>'
          +'<button class="btn" data-a="google" style="background:#fff">Googleでログイン</button>'
          +(lineOk?'<button class="btn line-btn" data-a="line">LINEでログイン</button>':'')
          +'<button class="btn" data-a="guest" style="background:var(--cream)">ログインせずに遊ぶ</button></div>');
        v.addEventListener('click',async function(e){var b=e.target.closest('[data-a]');if(!b)return;
          if(b.dataset.a==='google'){b.disabled=true;var ok=await loginGoogle();b.disabled=false;if(ok){v.remove();res(true)}}
          else if(b.dataset.a==='line'){b.disabled=true;b.textContent='LINEにつないでいます…';loginLine()}
          else{try{localStorage.setItem(GUEST_KEY,'1')}catch(err){}resolveAuth(false);v.remove();res(true)}})})},
    isLoggedIn:function(){return !!uid},
    name:function(){return myName},
    ready:function(){return initDone}};

  async function logout(){
    var v=sheet('<div class="bsheet" role="dialog" aria-modal="true"><h3>ログアウト</h3><p class="note">この端末からマイモンのデータを消してログアウトします。データはアカウントに保存されているので、もう一度ログインすれば戻ります。</p><div style="display:flex;gap:10px"><button class="btn" data-a="no" style="flex:1">やめる</button><button class="btn pink" data-a="yes" style="flex:1.4">ログアウト</button></div></div>');
    v.addEventListener('click',async function(e){var b=e.target.closest('[data-a]');if(!b&&e.target!==v)return;if(!b||b.dataset.a==='no'){v.remove();return}
      try{await auth.signOut()}catch(err){}try{if(liffOk&&liff.isLoggedIn())liff.logout()}catch(err){}
      try{Object.keys(localStorage).forEach(function(k){if(/^rakugaki-monster|^maimon/.test(k))localStorage.removeItem(k)})}catch(err){}
      try{indexedDB.deleteDatabase('rakugaki-monster')}catch(err){}
      location.reload()})}
  async function loginFromSettings(){
    var v=sheet('<div class="bsheet" role="dialog" aria-modal="true"><h3>ログイン</h3><button class="btn" data-a="google" style="background:#fff">Googleでログイン</button>'+(lineOk?'<button class="btn line-btn" data-a="line">LINEでログイン</button>':'')+'<button class="btn" data-close>とじる</button></div>');
    v.addEventListener('click',async function(e){if(e.target===v||e.target.closest('[data-close]')){v.remove();return}var b=e.target.closest('[data-a]');if(!b)return;
      if(b.dataset.a==='google'){var ok=await loginGoogle();if(ok){v.remove();location.reload()}}else loginLine()})}

  /* 設定の「アカウント」と、フレンドの「友達を招待」 */
  function renderAccount(){var lb=$('#acct-label'),nt=$('#acct-note');if(!lb)return;
    if(!fbOk){lb.textContent='ログイン（準備中）';nt.textContent=!C.firebase?'config.js が読みこめていません':'config.js の firebase の値が「YOUR_」のままです';return}
    if(uid){lb.textContent=(provider==='line'?'LINE':'Google')+'でログイン中';nt.textContent=(myName?myName+' さん・':'')+'タップでログアウト'}
    else{lb.textContent='ログイン';nt.textContent='データをアカウントに保存して、交換もできるようにする'}}
  document.addEventListener('click',function(e){
    if(e.target.closest('#set-account')){if(!fbOk)return;if(uid)logout();else loginFromSettings()}
    if(e.target.closest('#invite-line'))invite()});
  async function invite(){
    var base=location.href.split('#')[0].split('?')[0];
    var url=C.shareUrl||(lineOk?'https://liff.line.me/'+C.liffId:base+'?openExternalBrowser=1');
    var text='マイモンで一緒に遊ぼう！自分で描いたモンスターが動きだすよ\n'+url;
    try{if(liffOk&&liff.isInClient()&&liff.isApiAvailable('shareTargetPicker')){await liff.shareTargetPicker([{type:'text',text:text}]);return}}catch(e){}
    if(navigator.share){try{await navigator.share({title:'マイモン',text:'マイモンで一緒に遊ぼう！自分で描いたモンスターが動きだすよ',url:url});return}catch(e){if(e&&e.name==='AbortError')return}}
    var line='https://line.me/R/share?text='+encodeURIComponent(text);
    var v=alertSheet('友達に送る方法をえらんでね\n'+url,'<a class="btn line-btn" href="'+line+'" target="_blank" rel="noopener" style="text-decoration:none">LINEで送る</a><button class="btn" data-copy>メッセージをコピー</button>');
    v.querySelector('[data-copy]').onclick=async function(){try{await navigator.clipboard.writeText(text);this.textContent='コピーしました'}catch(e){this.textContent='コピーできませんでした'}}}
  /* ホーム画面に追加（PWA） */
  var installEvt=null;
  var isStandalone=function(){return (window.matchMedia&&matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true};
  var isIOS=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();installEvt=e;renderInstall()});
  window.addEventListener('appinstalled',function(){installEvt=null;renderInstall();alertSheet('ホーム画面にマイモンを追加しました！次からはアイコンから遊べます。')});
  function renderInstall(){var lb=$('#inst-label'),nt=$('#inst-note');if(!lb)return;
    if(isStandalone()){lb.textContent='アプリとして起動中';nt.textContent='ホーム画面のアイコンから開いています';return}
    lb.textContent='ホーム画面に追加';nt.textContent=installEvt?'ボタン1つで追加できます':'アプリのように全画面で遊べます'}
  async function install(){
    if(isStandalone()){alertSheet('もうホーム画面のアイコンから開いています。');return}
    if(installEvt){installEvt.prompt();try{await installEvt.userChoice}catch(e){}installEvt=null;renderInstall();return}
    if(inLineApp){alertSheet('LINEの中では追加できません。下のボタンでいつものブラウザで開いてから、もう一度押してください。','<a class="btn sun" href="'+externalUrl()+'" style="text-decoration:none">ブラウザで開く</a>');return}
    if(isIOS)alertSheet('iPhoneでの追加のしかた\n\n1. Safariでこのページを開く\n2. 画面下の「共有」ボタン（四角から矢印が出たマーク）を押す\n3.「ホーム画面に追加」を押す\n4. 右上の「追加」を押す');
    else alertSheet('Androidでの追加のしかた\n\n1. Chromeでこのページを開く\n2. 右上の「⋮」を押す\n3.「ホーム画面に追加」または「アプリをインストール」を押す\n4.「インストール」を押す')}
  document.addEventListener('click',function(e){if(e.target.closest('#set-install'))install()});
  if('serviceWorker' in navigator&&location.protocol==='https:'){window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(e){console.warn('[maimon] sw',e)})})}
  setInterval(function(){renderAccount();renderInstall()},1000);

  var initDone=init().then(renderAccount);
})();
