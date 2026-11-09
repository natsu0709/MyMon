/* マイモン サイト版：LINEログイン（LIFF）とFirebaseをゲームにつなぐ */
(function(){
  'use strict';
  var C=window.MAIMON_CONFIG||{};
  var configured=!!(C.liffId&&C.firebase&&C.firebase.apiKey&&!/YOUR_|xxxx/i.test(C.liffId+C.firebase.apiKey));
  var GUEST_KEY='maimon-guest';
  var fs=null,auth=null,uid=null,myName='',liffOk=false,decided=false;
  var resolveAuth;var authDecided=new Promise(function(r){resolveAuth=function(v){if(decided)return;decided=true;r(v)}});

  function $(s){return document.querySelector(s)}
  function layers(){return document.getElementById('layers')||document.body}
  function sheet(html){var v=document.createElement('div');v.className='veil bottom';v.innerHTML=html;layers().appendChild(v);return v}

  async function signInWithLine(){
    var idToken=liff.getIDToken();if(!idToken)throw new Error('no_id_token');
    var r=await fetch(C.authEndpoint||'/api/lineAuth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:idToken})});
    if(!r.ok)throw new Error('auth_failed');var j=await r.json();
    var cred=await auth.signInWithCustomToken(j.token);uid=cred.user.uid;myName=j.name||'';
    try{await fs.doc('profiles/'+uid).set({name:myName.slice(0,40),updatedAt:Date.now()},{merge:true})}catch(e){}
    try{localStorage.removeItem(GUEST_KEY)}catch(e){}
    resolveAuth(true)}

  async function init(){
    if(!configured){resolveAuth(false);return}
    try{
      firebase.initializeApp(C.firebase);auth=firebase.auth();fs=firebase.firestore();
      await liff.init({liffId:C.liffId});liffOk=true;
      if(liff.isLoggedIn()){await signInWithLine();return}
      var u=await new Promise(function(res){var un=auth.onAuthStateChanged(function(x){un();res(x)})});
      if(u&&String(u.uid).indexOf('line:')===0){uid=u.uid;resolveAuth(true);return}
      var guest=false;try{guest=localStorage.getItem(GUEST_KEY)==='1'}catch(e){}
      if(guest)resolveAuth(false);
    }catch(e){console.warn('[maimon] login init failed',e);resolveAuth(false)}
  }

  /* ゲーム側が使う窓口（Claudeの成果物版と同じ形） */
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
    ensureAuth:function(){
      if(decided||!configured)return Promise.resolve(true);
      return new Promise(function(res){
        var v=sheet('<div class="bsheet" role="dialog" aria-modal="true"><h3>はじめる前に</h3><p class="note">LINEでログインすると、マイモンがLINEアカウントに保存されます。機種変更しても続きから遊べて、フレンドとの交換もできます。</p><button class="btn line-btn" data-a="line">LINEでログイン</button><button class="btn" data-a="guest">ゲストで遊ぶ</button></div>');
        v.addEventListener('click',function(e){var b=e.target.closest('[data-a]');if(!b)return;
          if(b.dataset.a==='line'){b.disabled=true;b.textContent='LINEにつないでいます…';login()}
          else{try{localStorage.setItem(GUEST_KEY,'1')}catch(err){}resolveAuth(false);v.remove();res(true)}})})},
    isLoggedIn:function(){return !!uid},
    name:function(){return myName}};

  function login(){if(!liffOk){alertSheet('LINEにつながりませんでした。通信を確認して、ページを開き直してください。');return}
    liff.login({redirectUri:location.href.split('#')[0]})}
  function alertSheet(msg){var v=sheet('<div class="bsheet" role="dialog" aria-modal="true"><p class="note"></p><button class="btn" data-close>とじる</button></div>');v.querySelector('.note').textContent=msg;v.addEventListener('click',function(e){if(e.target===v||e.target.closest('[data-close]'))v.remove()})}
  async function logout(){
    var v=sheet('<div class="bsheet" role="dialog" aria-modal="true"><h3>ログアウト</h3><p class="note">この端末からマイモンのデータを消してログアウトします。データはLINEアカウントに保存されているので、もう一度ログインすれば戻ります。</p><div style="display:flex;gap:10px"><button class="btn" data-a="no" style="flex:1">やめる</button><button class="btn pink" data-a="yes" style="flex:1.4">ログアウト</button></div></div>');
    v.addEventListener('click',async function(e){var b=e.target.closest('[data-a]');if(!b&&e.target!==v)return;if(!b||b.dataset.a==='no'){v.remove();return}
      try{await auth.signOut()}catch(err){}try{if(liffOk&&liff.isLoggedIn())liff.logout()}catch(err){}
      try{Object.keys(localStorage).forEach(function(k){if(/^rakugaki-monster|^maimon/.test(k))localStorage.removeItem(k)})}catch(err){}
      try{indexedDB.deleteDatabase('rakugaki-monster')}catch(err){}
      location.reload()})}

  /* 設定の「アカウント」と、フレンドの「LINEで招待」 */
  function renderAccount(){var lb=$('#acct-label'),nt=$('#acct-note');if(!lb)return;
    if(!configured){lb.textContent='LINEログイン（準備中）';nt.textContent='サイトの設定が終わると使えます';return}
    if(uid){lb.textContent='LINEでログイン中';nt.textContent=(myName?myName+' さん・':'')+'タップでログアウト'}else{lb.textContent='LINEでログイン';nt.textContent='データをLINEアカウントに保存して、交換もできるようにする'}}
  document.addEventListener('click',function(e){
    if(e.target.closest('#set-account')){if(!configured)return;if(uid)logout();else login()}
    var inv=e.target.closest('#invite-line');if(inv){invite()}});
  async function invite(){var url=C.shareUrl||(configured?'https://liff.line.me/'+C.liffId:location.href.split('#')[0]);var text='マイモンで一緒に遊ぼう！自分で描いたモンスターが動きだすよ\n'+url;
    try{if(liffOk&&liff.isApiAvailable&&liff.isApiAvailable('shareTargetPicker')){await liff.shareTargetPicker([{type:'text',text:text}]);return}}catch(e){}
    try{if(navigator.share){await navigator.share({title:'マイモン',text:text});return}}catch(e){return}
    try{await navigator.clipboard.writeText(text);alertSheet('招待メッセージをコピーしました。LINEに貼りつけて送ってね。')}catch(e){alertSheet(text)}}
  setInterval(renderAccount,1000);

  init().then(renderAccount);
})();
