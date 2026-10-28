/* Профиль tap-page: вход по коду на почту, сессия и запросы к /api/account.
   Подключается на /, /me и /start. */
var TP=(function(){
  'use strict';
  var KEY='tp_session_v1';
  function get(){try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){return null}}
  function set(v){try{if(v)localStorage.setItem(KEY,JSON.stringify(v));else localStorage.removeItem(KEY)}catch(e){}}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}

  function req(method,url,data,tok){
    var h={'Content-Type':'application/json'}; if(tok) h.Authorization='Bearer '+tok;
    return fetch(url,{method:method,headers:h,body:data?JSON.stringify(data):undefined}).then(function(r){
      return r.json().catch(function(){return {}}).then(function(j){j._status=r.status;return j});
    });
  }
  var refreshing=null;
  function refresh(){
    var s=get(); if(!s) return Promise.resolve(null);
    if(!refreshing) refreshing=req('POST','/api/auth',{action:'refresh',refresh_token:s.session.refresh_token}).then(function(d){
      refreshing=null;
      if(d.session){set({session:d.session,user:d.user});return d.session.access_token}
      if(d._status===401) set(null);
      return null;
    },function(){refreshing=null;return null});
    return refreshing;
  }
  function token(){
    var s=get(); if(!s) return Promise.resolve(null);
    if((s.session.expires_at||0)*1000-Date.now()<90000) return refresh();
    return Promise.resolve(s.session.access_token);
  }
  // Запрос к API от имени пользователя; при истёкшей сессии — одна попытка продлить.
  function call(method,url,data){
    return token().then(function(t){
      if(!t) return {_status:401,error:'auth'};
      return req(method,url,data,t).then(function(d){
        if(d._status!==401) return d;
        return refresh().then(function(t2){ if(!t2) return d; return req(method,url,data,t2) });
      });
    });
  }
  function user(){var s=get();return s&&s.user}
  function logout(){set(null)}

  var css=false;
  function style(){
    if(css) return; css=true;
    var st=document.createElement('style');
    st.textContent='.tpl{max-width:460px}.tpl label{display:block;font-family:var(--m);font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--tx2);margin:0 0 8px}'+
      '.tpl .row{display:flex;gap:10px}.tpl input{flex:1;min-width:0;height:52px;border-radius:999px;background:var(--bg);border:1px solid var(--line2);padding:0 20px;font-size:16px;outline:none;color:var(--tx)}'+
      '.tpl input:focus{border-color:var(--acc)}.tpl input.code{font-family:var(--m);letter-spacing:.3em;font-size:20px}'+
      '.tpl .err{color:var(--bad);font-size:14px;min-height:20px;margin-top:8px}.tpl .hint{color:var(--tx2);font-size:14px;margin:8px 0 0}'+
      '.tpl .links{display:flex;gap:16px;flex-wrap:wrap;margin-top:6px}.tpl .links button{color:var(--tx2);font-size:14px;text-decoration:underline;text-underline-offset:3px;padding:4px 0}'+
      '.tpl .links button[disabled]{opacity:.5;cursor:default;text-decoration:none}'+
      '@media (max-width:640px){.tpl .row{flex-direction:column}.tpl .row .btn{width:100%}.tpl input{flex:none;width:100%}}';
    document.head.appendChild(st);
  }
  var ERR={email:'Проверь адрес почты',rate:'Слишком много попыток. Подожди минуту и попробуй снова',send:'Не получилось отправить письмо. Попробуй ещё раз чуть позже',code:'Код не подошёл. Проверь цифры или запроси новый',server:'Что-то пошло не так. Попробуй ещё раз'};

  // Форма входа: почта → код из письма. opts.onDone(user) — после входа.
  function loginForm(el,opts){
    opts=opts||{}; style();
    var email='', timer=0;
    function stepEmail(){
      clearInterval(timer);
      el.innerHTML='<form class="tpl" novalidate><label for="tpe">Почта</label><div class="row"><input id="tpe" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com" value="'+esc(email)+'">'+
        '<button class="btn pri" type="submit">'+esc(opts.cta||'Получить код')+'</button></div><div class="err" role="alert"></div>'+
        '<p class="hint">Пришлём код из 6 цифр. Без пароля и рассылок.</p></form>';
      var f=el.querySelector('form'), inp=f.querySelector('input'), er=f.querySelector('.err'), btn=f.querySelector('button');
      f.onsubmit=function(e){
        e.preventDefault(); email=inp.value.trim().toLowerCase(); er.textContent='';
        if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)){er.textContent=ERR.email;inp.focus();return}
        btn.disabled=true; btn.textContent='Отправляем…';
        req('POST','/api/auth',{action:'otp',email:email}).then(function(d){
          btn.disabled=false; btn.textContent=opts.cta||'Получить код';
          if(d.ok){ if(typeof track==='function') track('auth_code_sent'); stepCode() } else er.textContent=ERR[d.error]||ERR.server;
        },function(){btn.disabled=false;btn.textContent=opts.cta||'Получить код';er.textContent=ERR.server});
      };
    }
    function stepCode(){
      el.innerHTML='<form class="tpl" novalidate><label for="tpc">Код из письма</label><div class="row"><input id="tpc" class="code" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="••••••">'+
        '<button class="btn pri" type="submit">Войти</button></div><div class="err" role="alert"></div>'+
        '<p class="hint">Отправили на <b>'+esc(email)+'</b>. Письма нет — загляни в «Спам».</p>'+
        '<div class="links"><button type="button" data-a="again" disabled>Отправить ещё раз</button><button type="button" data-a="back">Другая почта</button></div></form>';
      var f=el.querySelector('form'), inp=f.querySelector('input'), er=f.querySelector('.err'), btn=f.querySelector('button[type=submit]'), again=f.querySelector('[data-a=again]');
      var left=60; again.textContent='Отправить ещё раз через '+left+' с';
      clearInterval(timer); timer=setInterval(function(){left--; if(left<=0){clearInterval(timer);again.disabled=false;again.textContent='Отправить ещё раз'} else again.textContent='Отправить ещё раз через '+left+' с'},1000);
      again.onclick=function(){ again.disabled=true; req('POST','/api/auth',{action:'otp',email:email}).then(function(d){ if(d.ok) stepCode(); else {er.textContent=ERR[d.error]||ERR.server;again.disabled=false} }) };
      f.querySelector('[data-a=back]').onclick=stepEmail;
      inp.focus();
      inp.oninput=function(){ var v=inp.value.replace(/\D/g,''); if(v!==inp.value) inp.value=v; if(v.length===6||v.length===8) f.requestSubmit?f.requestSubmit():f.onsubmit(new Event('submit')) };
      f.onsubmit=function(e){
        e&&e.preventDefault&&e.preventDefault(); er.textContent='';
        var code=inp.value.replace(/\D/g,''); if(code.length<6){er.textContent=ERR.code;return}
        btn.disabled=true; btn.textContent='Проверяем…';
        req('POST','/api/auth',{action:'verify',email:email,code:code}).then(function(d){
          btn.disabled=false; btn.textContent='Войти';
          if(d.session){ clearInterval(timer); set({session:d.session,user:d.user}); if(typeof track==='function') track('auth_login'); opts.onDone&&opts.onDone(d.user) }
          else er.textContent=ERR[d.error]||ERR.server;
        },function(){btn.disabled=false;btn.textContent='Войти';er.textContent=ERR.server});
      };
    }
    stepEmail();
  }

  // Привязать оплаченную инструкцию к профилю.
  function claim(order){ return call('POST','/api/account',{action:'claim',order:order}) }

  return {user:user,logout:logout,call:call,claim:claim,loginForm:loginForm,esc:esc};
})();
