/* Общий чат tap-page и ИИ-помощь: кнопка «Чат» слева внизу.
   Вкладка «Общий чат» — сообщения участников и события «получил кристалл» (api/chat.js).
   Вкладка «Помощь» — ИИ-поддержка по вопросам портала (api/support.js). */
(function(){
  'use strict';
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function tr(n,p){ if(typeof track==='function') track(n,p) }
  function tok(){ return (window.TP&&TP.token)?TP.token():Promise.resolve(null) }
  function api(method,url,data){
    return tok().then(function(t){
      var h={'Content-Type':'application/json'}; if(t) h.Authorization='Bearer '+t;
      return fetch(url,{method:method,headers:h,body:data?JSON.stringify(data):undefined})
        .then(function(r){return r.json().catch(function(){return {}}).then(function(d){d._s=r.status;return d})});
    });
  }
  var GEMNAME={start:['Аметист',0],nabor:['Сапфир',-46],montage:['Изумруд',-112],assistant:['Рубин',92]};
  function gemInfo(c){ if(window.gemById){var g=gemById(c); if(g) return [g.name,g.hue]} return GEMNAME[c]||['кристалл',0] }
  function hue(s){var h=0;s=String(s||'');for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))>>>0;return h%360}
  function time(iso){var d=new Date(iso),n=new Date();var t=d.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});return d.toDateString()===n.toDateString()?t:d.toLocaleDateString('ru-RU',{day:'numeric',month:'short'})+' '+t}

  /* ---------- стили ---------- */
  var css=document.createElement('style');
  css.textContent='.ch-btn{position:fixed;left:max(16px,env(safe-area-inset-left));bottom:calc(16px + env(safe-area-inset-bottom));z-index:45;display:inline-flex;align-items:center;gap:8px;height:48px;padding:0 18px 0 14px;border-radius:999px;background:var(--s2);border:1px solid var(--line2);color:var(--tx);font:650 14.5px var(--f);box-shadow:0 12px 30px rgba(0,0,0,.5);cursor:pointer}'+
    '.ch-btn:hover{background:var(--s3)}.ch-btn svg{width:20px;height:20px;color:var(--acc)}.ch-btn .dot{width:8px;height:8px;border-radius:50%;background:var(--ok);box-shadow:0 0 0 3px rgba(62,224,160,.18)}'+
    '.ch-btn .cnt{min-width:20px;height:20px;padding:0 6px;border-radius:999px;background:var(--acc);color:var(--acc-ink);font-size:12px;font-weight:800;display:grid;place-items:center}'+
    '.ch-toast{position:fixed;left:max(16px,env(safe-area-inset-left));bottom:calc(74px + env(safe-area-inset-bottom));z-index:46;max-width:min(340px,calc(100vw - 32px));display:flex;gap:10px;align-items:center;padding:10px 14px;border-radius:16px;background:var(--s2);border:1px solid hsl(calc(268deg + var(--ch,0deg)) 100% 79% / .45);box-shadow:0 14px 34px rgba(0,0,0,.55);font-size:14px;cursor:pointer;animation:chin .35s cubic-bezier(.2,.8,.2,1)}'+
    '@keyframes chin{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}'+
    '.gd{width:12px;height:12px;flex:none;border-radius:3px;transform:rotate(45deg);background:hsl(calc(264deg + var(--ch,0deg)) 80% 68%);box-shadow:0 0 10px hsl(calc(264deg + var(--ch,0deg)) 90% 60%)}'+
    '.tpc{position:fixed;left:max(16px,env(safe-area-inset-left));bottom:calc(76px + env(safe-area-inset-bottom));z-index:55;width:400px;height:min(620px,calc(100vh - 110px));display:flex;flex-direction:column;border-radius:22px;background:var(--s1);border:1px solid var(--line2);box-shadow:0 24px 70px rgba(0,0,0,.65);overflow:hidden;animation:chin .25s cubic-bezier(.2,.8,.2,1)}'+
    '.ch-h{display:flex;align-items:center;gap:6px;padding:10px 10px 10px 12px;border-bottom:1px solid var(--line)}'+
    '.ch-tabs{display:flex;gap:4px;background:var(--bg);border:1px solid var(--line);border-radius:999px;padding:3px}'+
    '.ch-tabs button{height:32px;padding:0 14px;border-radius:999px;font-size:13.5px;font-weight:650;color:var(--tx2)}.ch-tabs button.on{background:var(--s3);color:var(--tx)}'+
    '.ch-h .x{margin-left:auto;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;color:var(--tx2)}.ch-h .x:hover{background:var(--s2)}'+
    '.ch-m,.sp-m{flex:1;overflow-y:auto;padding:12px 14px;display:flex;flex-direction:column;gap:8px;overscroll-behavior:contain}'+
    '.cm{max-width:88%;align-self:flex-start;padding:7px 12px 6px;border-radius:16px;border-bottom-left-radius:6px;background:var(--s2);border:1px solid var(--line);position:relative}'+
    '.cm.me{align-self:flex-end;border-radius:16px;border-bottom-right-radius:6px;background:#1d2410;border-color:rgba(212,255,63,.25)}'+
    '.cm .n{font-size:12.5px;font-weight:700;display:flex;gap:6px;align-items:center}.cm .n em{font-style:normal;font-size:10.5px;font-weight:700;letter-spacing:.04em;padding:1px 6px;border-radius:6px;background:var(--acc);color:var(--acc-ink)}'+
    '.cm .t{font-size:14.5px;line-height:1.45;word-wrap:break-word;white-space:pre-wrap}.cm time{display:block;text-align:right;font-size:10.5px;color:var(--tx3);margin-top:1px}'+
    '.cm .adm{position:absolute;top:4px;right:6px;display:none;gap:2px}.cm:hover .adm{display:flex}.cm .adm button{font-size:11px;color:var(--tx3);padding:2px 4px;border-radius:6px}.cm .adm button:hover{color:var(--bad);background:var(--s3)}'+
    '.cc{align-self:center;display:flex;gap:9px;align-items:center;max-width:94%;padding:7px 12px;border-radius:999px;background:linear-gradient(90deg,hsl(calc(272deg + var(--ch,0deg)) 90% 60% / .16),transparent);border:1px solid hsl(calc(268deg + var(--ch,0deg)) 100% 79% / .3);font-size:13px;color:var(--tx2)}'+
    '.cc b{color:var(--tx)}.cc time{font-size:10.5px;color:var(--tx3)}'+
    '.ch-empty{margin:auto;text-align:center;color:var(--tx3);font-size:14px;max-width:270px}'+
    '.ch-f,.sp-f{display:flex;gap:8px;align-items:flex-end;padding:10px;border-top:1px solid var(--line)}'+
    '.ch-f textarea,.sp-f textarea,.ch-f input{flex:1;min-width:0;min-height:44px;max-height:120px;resize:none;border-radius:16px;background:var(--bg);border:1px solid var(--line2);padding:11px 14px;font:15px/1.4 var(--f);color:var(--tx);outline:none}'+
    '.ch-f textarea:focus,.sp-f textarea:focus,.ch-f input:focus{border-color:var(--acc)}'+
    '.ch-f button.go,.sp-f button{width:44px;height:44px;border-radius:50%;background:var(--acc);color:var(--acc-ink);display:grid;place-items:center;flex:none}.ch-f button[disabled],.sp-f button[disabled]{opacity:.4}'+
    '.ch-box{padding:12px 14px;border-top:1px solid var(--line)}.ch-box p{margin:0 0 10px;font-size:14px;color:var(--tx2)}.ch-box .row{display:flex;gap:8px}'+
    '.ch-box input{flex:1;min-width:0;height:44px;border-radius:999px;background:var(--bg);border:1px solid var(--line2);padding:0 16px;font:15px var(--f);color:var(--tx);outline:none}.ch-box input:focus{border-color:var(--acc)}'+
    '.ch-n,.sp-n{padding:0 14px 10px;font-size:11.5px;color:var(--tx3)}.ch-n a,.sp-n a{color:var(--tx2)}'+
    '.ch-err{padding:0 14px 6px;font-size:13px;color:var(--bad);min-height:0}'+
    '.sp-b{max-width:86%;padding:10px 13px;border-radius:16px;font-size:14.5px;line-height:1.5;word-wrap:break-word}'+
    '.sp-b.a{background:var(--s2);border:1px solid var(--line);border-bottom-left-radius:6px;align-self:flex-start}.sp-b.u{background:var(--acc);color:var(--acc-ink);border-bottom-right-radius:6px;align-self:flex-end;font-weight:500}'+
    '.sp-b a{color:var(--acc);text-decoration:underline;text-underline-offset:2px;word-break:break-all}.sp-b.err{border-color:rgba(255,107,107,.4)}'+
    '.sp-dots{display:inline-flex;gap:4px}.sp-dots i{width:6px;height:6px;border-radius:50%;background:var(--tx3);animation:spd 1s infinite}.sp-dots i:nth-child(2){animation-delay:.15s}.sp-dots i:nth-child(3){animation-delay:.3s}@keyframes spd{0%,60%,100%{opacity:.3}30%{opacity:1}}'+
    '.sp-s{display:flex;flex-wrap:wrap;gap:6px;margin-top:2px}.sp-s button{min-height:32px;padding:4px 12px;border-radius:999px;border:1px solid var(--line2);font-size:13px;color:var(--tx2);background:none}.sp-s button:hover{color:var(--tx);background:var(--s2)}'+
    '@media (max-width:640px){.tpc{left:0;right:0;bottom:0;top:0;width:auto;height:auto;border-radius:0;border:0}.ch-btn{height:44px;padding:0 14px 0 12px;font-size:14px}}'+
    '@media print{.tpc,.ch-btn,.ch-toast{display:none!important}}';
  document.head.appendChild(css);

  /* ---------- состояние ---------- */
  var MSG=[], seen={}, lastId=0, me=null, meLoaded=false, unread=0, open=false, tab='chat', box=null, timer=0, primed=false, sending=false;
  try{ tab=sessionStorage.getItem('tp_chat_tab')||'chat' }catch(e){}

  var btn=document.createElement('button'); btn.className='ch-btn'; btn.type='button'; btn.setAttribute('aria-label','Чат');
  document.body.appendChild(btn);
  function drawBtn(){
    btn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>Чат'+
      (unread?'<span class="cnt">'+(unread>99?'99+':unread)+'</span>':'<span class="dot"></span>');
  }
  drawBtn();

  function add(list,isNew){
    var fresh=[];
    list.forEach(function(m){ if(seen[m.id]) return; seen[m.id]=1; MSG.push(m); fresh.push(m); if(m.id>lastId) lastId=m.id });
    if(MSG.length>200) MSG=MSG.slice(-200);
    if(isNew&&fresh.length){
      var others=fresh.filter(function(m){return !(me&&m.kind==='msg'&&m.nick===me.nick)});
      if(!open||tab!=='chat'){ unread+=others.length; drawBtn() }
      var cr=others.filter(function(m){return m.kind==='crystal'}).pop();
      if(cr&&!open) toast(cr);
    }
    return fresh.length;
  }
  function poll(){
    clearTimeout(timer);
    if(document.hidden){ timer=setTimeout(poll,15000); return }
    var url='/api/chat'+(lastId?'?after='+lastId:'')+((open&&!meLoaded)?(lastId?'&':'?')+'me=1':'');
    var wantMe=open&&!meLoaded;
    api('GET',url).then(function(d){
      if(d.messages){ var n=add(d.messages,primed); primed=true; if(open&&tab==='chat'&&n) drawMsgs() }
      if(wantMe){ meLoaded=true; me=d.me||null; if(open&&tab==='chat'){ drawFoot(); drawMsgs() } }
    },function(){}).then(function(){ timer=setTimeout(poll,open&&tab==='chat'?4000:25000) });
  }
  setTimeout(poll,1200);
  document.addEventListener('visibilitychange',function(){ if(!document.hidden) poll() });

  function toast(m){
    var g=gemInfo(m.course), old=document.querySelector('.ch-toast'); if(old) old.remove();
    var t=document.createElement('div'); t.className='ch-toast'; t.style.setProperty('--ch',g[1]+'deg');
    t.innerHTML='<i class="gd"></i><span><b>'+esc(m.nick||'Новый участник')+'</b> получил кристалл «'+esc(g[0])+'»</span>';
    t.onclick=function(){ t.remove(); show('chat') };
    document.body.appendChild(t); setTimeout(function(){ if(t.parentNode) t.remove() },6000);
  }

  /* ---------- общий чат ---------- */
  function msgHTML(m){
    if(m.kind==='crystal'){
      var g=gemInfo(m.course);
      return '<div class="cc" style="--ch:'+g[1]+'deg"><i class="gd"></i><span><b>'+esc(m.nick||'Новый участник')+'</b> получил кристалл «'+esc(g[0])+'»</span><time>'+esc(time(m.at))+'</time></div>';
    }
    var mine=me&&me.nick&&m.nick===me.nick, col=m.role==='admin'?'var(--acc)':'hsl('+hue(m.nick)+' 75% 72%)';
    return '<div class="cm'+(mine?' me':'')+'" data-id="'+m.id+'">'+(me&&me.admin&&!mine?'<span class="adm"><button type="button" data-a="delete" title="Удалить">✕</button><button type="button" data-a="ban" title="Удалить и заблокировать">⛔</button></span>':'')+
      '<div class="n" style="color:'+col+'">'+esc(m.nick||'Участник')+(m.role==='admin'?'<em>автор</em>':'')+'</div><div class="t">'+esc(m.text)+'</div><time>'+esc(time(m.at))+'</time></div>';
  }
  function drawMsgs(){
    if(!box||tab!=='chat') return;
    var el=box.querySelector('.ch-m'), stick=el.scrollHeight-el.scrollTop-el.clientHeight<80;
    el.innerHTML=MSG.length?MSG.map(msgHTML).join(''):'<div class="ch-empty">Здесь пока тихо. Напиши первым — а когда кто-то получит кристалл за курс, это появится здесь.</div>';
    if(stick||!el.dataset.init){ el.scrollTop=el.scrollHeight; el.dataset.init=1 }
    [].forEach.call(el.querySelectorAll('.adm button'),function(b){ b.onclick=function(){
      var id=+b.closest('.cm').getAttribute('data-id'), a=b.getAttribute('data-a');
      if(!confirm(a==='ban'?'Удалить сообщение и заблокировать автора в чате?':'Удалить сообщение?')) return;
      api('POST','/api/chat',{action:a,id:id}).then(function(d){ if(d.ok){ MSG=MSG.filter(function(x){return x.id!==id}); drawMsgs() } });
    }});
  }
  var ERR={mat:'Сообщение не опубликовано: в чате нельзя материться.',ad:'Сообщение не опубликовано: в чате нельзя ссылки, контакты и рекламу.',toxic:'Сообщение не опубликовано: оно нарушает правила чата.',
    slow:'Не так быстро — подожди пару секунд.',long:'Слишком длинно — до 500 символов.',banned:'Ты не можешь писать в чат.',empty:'Напиши что-нибудь.',
    nick_format:'Ник: от 2 до 24 символов — буквы, цифры, пробел, _ и -.',nick_bad:'Такой ник нельзя, выбери другой.',nick_taken:'Этот ник уже занят.'};
  function setErr(t){ var e=box&&box.querySelector('.ch-err'); if(e) e.textContent=t||'' }
  function drawFoot(){
    if(!box||tab!=='chat') return;
    var f=box.querySelector('.ch-foot'), u=window.TP&&TP.user();
    if(!u){
      f.innerHTML='<div class="ch-box"><p>Читать может каждый. Чтобы писать, войди по почте — это займёт минуту.</p><div id="chlf"></div></div>';
      TP.loginForm(f.querySelector('#chlf'),{cta:'Войти',onDone:function(){ meLoaded=false; me=null; drawFoot(); poll() }}); return;
    }
    if(!meLoaded){ f.innerHTML='<div class="ch-box"><p>Загружаем…</p></div>'; return }
    if(me&&me.banned){ f.innerHTML='<div class="ch-box"><p>Ты не можешь писать в чат. Если это ошибка — напиши на mxmgin@gmail.com.</p></div>'; return }
    if(!me||!me.nick){
      f.innerHTML='<form class="ch-box"><p>Как тебя называть в чате? Ник видят все, почту — никто.</p><div class="row"><input maxlength="24" placeholder="Например, Аня или max_dev"><button class="btn pri" type="submit">Готово</button></div></form><div class="ch-err"></div>';
      var nf=f.querySelector('form'); nf.onsubmit=function(e){ e.preventDefault(); var v=nf.querySelector('input').value.trim(); setErr('');
        api('POST','/api/chat',{action:'nick',nick:v}).then(function(d){ if(d.ok){ me=me||{}; me.nick=d.nick; tr('chat_nick'); drawFoot(); drawMsgs() } else setErr(ERR[d.error]||'Не получилось, попробуй ещё раз') }) };
      return;
    }
    f.innerHTML='<form class="ch-f"><textarea rows="1" maxlength="500" placeholder="Сообщение для всех…"></textarea><button class="go" type="submit" aria-label="Отправить"><svg class="ic" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button></form><div class="ch-err"></div>'+
      '<div class="ch-n">Ты пишешь как <b>'+esc(me.nick)+'</b>. Без рекламы, ссылок и мата — такие сообщения не публикуются.</div>';
    var cf=f.querySelector('form'), ta=cf.querySelector('textarea'), go=cf.querySelector('button');
    cf.onsubmit=function(e){ e.preventDefault(); var v=ta.value.trim(); if(!v||sending) return; sending=true; go.disabled=true; setErr('');
      api('POST','/api/chat',{action:'send',text:v}).then(function(d){
        sending=false; go.disabled=false;
        if(d.ok){ ta.value=''; ta.style.height=''; add([d.message],false); drawMsgs(); var el=box.querySelector('.ch-m'); el.scrollTop=el.scrollHeight; tr('chat_send'); return }
        if(d.error==='nick'){ me.nick=null; return drawFoot() }
        if(d._s===401){ TP.logout(); return drawFoot() }
        setErr(ERR[d.error]||'Не получилось отправить. Попробуй ещё раз.');
      },function(){ sending=false; go.disabled=false; setErr('Нет связи.') });
    };
    ta.onkeydown=function(e){ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); cf.onsubmit(e) } };
    ta.oninput=function(){ ta.style.height=''; ta.style.height=Math.min(120,ta.scrollHeight)+'px' };
    if(window.innerWidth>640) ta.focus();
  }

  /* ---------- помощь (ИИ) ---------- */
  var SKEY='tp_support_v1', sbusy=false, smsgs=[];
  try{smsgs=JSON.parse(sessionStorage.getItem(SKEY)||'[]')}catch(e){smsgs=[]}
  function ssave(){try{sessionStorage.setItem(SKEY,JSON.stringify(smsgs.slice(-30)))}catch(e){}}
  function fmt(t){
    var h=esc(t);
    h=h.replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>');
    h=h.replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?»)\]])/g,function(u){return '<a href="'+u+'" target="'+(u.indexOf('tap-page.ru')>-1?'_self':'_blank')+'" rel="noopener">'+u.replace(/^https:\/\//,'')+'</a>'});
    h=h.replace(/(^|[\s(])(@makswo)/g,'$1<a href="https://www.instagram.com/makswo/" target="_blank" rel="noopener">$2</a>');
    h=h.replace(/([\w.+-]+@[\w-]+\.[\w.]+)/g,function(m){return m.indexOf('href')>-1?m:'<a href="mailto:'+m+'">'+m+'</a>'});
    return h.replace(/\n/g,'<br>');
  }
  var HELLO='Привет! Я ИИ-помощник tap-page. Помогу с курсами, промокодом, оплатой, доступом к инструкции и входом в профиль. Что случилось?';
  var SUGG=['Где взять промокод?','Оплатил, но инструкции нет','Не приходит код на почту','Как сохранить инструкцию?'];
  function drawHelp(){
    if(!box||tab!=='help') return;
    var m=box.querySelector('.sp-m');
    var h='<div class="sp-b a">'+fmt(HELLO)+'</div>';
    if(!smsgs.length) h+='<div class="sp-s">'+SUGG.map(function(s){return '<button type="button">'+esc(s)+'</button>'}).join('')+'</div>';
    smsgs.forEach(function(x){h+='<div class="sp-b '+(x.role==='user'?'u':'a')+(x.err?' err':'')+'">'+(x.role==='user'?esc(x.content).replace(/\n/g,'<br>'):fmt(x.content))+'</div>'});
    if(sbusy) h+='<div class="sp-b a"><span class="sp-dots"><i></i><i></i><i></i></span></div>';
    m.innerHTML=h; m.scrollTop=m.scrollHeight;
    [].forEach.call(m.querySelectorAll('.sp-s button'),function(b){b.onclick=function(){ask(b.textContent)}});
    box.querySelector('.sp-f button').disabled=sbusy;
  }
  function ask(text){
    text=String(text||'').trim(); if(!text||sbusy) return;
    smsgs.push({role:'user',content:text.slice(0,1500)}); sbusy=true; ssave(); drawHelp(); tr('support_ask');
    var order=null; try{order=localStorage.getItem('claude_start_order_v1')}catch(e){}
    api('POST','/api/support',{messages:smsgs.filter(function(x){return !x.err}).map(function(x){return {role:x.role,content:x.content}}),order:order}).then(function(d){
      sbusy=false;
      if(d.answer) smsgs.push({role:'assistant',content:d.answer});
      else smsgs.push({role:'assistant',err:true,content:d.error==='rate'?'Слишком много вопросов подряд. Попробуй чуть позже или напиши на mxmgin@gmail.com.':
        d.error==='off'?'Поддержка сейчас недоступна. Напиши на mxmgin@gmail.com или в директ @makswo — ответим.':'Не получилось ответить. Попробуй ещё раз или напиши на mxmgin@gmail.com.'});
      ssave(); drawHelp();
    },function(){ sbusy=false; smsgs.push({role:'assistant',err:true,content:'Нет связи. Проверь интернет и попробуй ещё раз.'}); ssave(); drawHelp() });
  }

  /* ---------- окно ---------- */
  function drawBody(){
    var body=box.querySelector('.ch-body');
    [].forEach.call(box.querySelectorAll('.ch-tabs button'),function(b){b.classList.toggle('on',b.getAttribute('data-t')===tab)});
    if(tab==='chat'){
      body.innerHTML='<div class="ch-m"></div><div class="ch-foot"></div>';
      unread=0; drawBtn(); drawMsgs(); drawFoot(); poll();
    } else {
      body.innerHTML='<div class="sp-m"></div><form class="sp-f"><textarea rows="1" maxlength="1500" placeholder="Опиши вопрос…"></textarea><button type="submit" aria-label="Отправить"><svg class="ic" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button></form>'+
        '<div class="sp-n">Отвечает ИИ по вопросам портала, может ошибаться. Сложный случай — <a href="mailto:mxmgin@gmail.com">mxmgin@gmail.com</a></div>';
      var ta=body.querySelector('textarea'), f=body.querySelector('form');
      f.onsubmit=function(e){e.preventDefault(); var v=ta.value; ta.value=''; ta.style.height=''; ask(v)};
      ta.onkeydown=function(e){ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();f.onsubmit(e)} };
      ta.oninput=function(){ta.style.height='';ta.style.height=Math.min(120,ta.scrollHeight)+'px'};
      drawHelp(); if(window.innerWidth>640) ta.focus();
    }
  }
  function show(t){
    if(t) tab=t;
    if(open){ drawBody(); return }
    open=true; btn.style.display='none'; var old=document.querySelector('.ch-toast'); if(old) old.remove();
    box=document.createElement('div'); box.className='tpc'; box.setAttribute('role','dialog'); box.setAttribute('aria-label','Чат');
    box.innerHTML='<div class="ch-h"><div class="ch-tabs"><button type="button" data-t="chat">Общий чат</button><button type="button" data-t="help">Помощь</button></div>'+
      '<button class="x" type="button" aria-label="Закрыть"><svg class="ic" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div><div class="ch-body" style="flex:1;display:flex;flex-direction:column;min-height:0"></div>';
    document.body.appendChild(box);
    box.querySelector('.x').onclick=hide;
    box.addEventListener('keydown',function(e){ if(e.key==='Escape') hide() });
    [].forEach.call(box.querySelectorAll('.ch-tabs button'),function(b){ b.onclick=function(){ tab=b.getAttribute('data-t'); try{sessionStorage.setItem('tp_chat_tab',tab)}catch(e){}; drawBody() } });
    meLoaded=false; drawBody(); tr('chat_open',{tab:tab});
  }
  function hide(){ open=false; if(box) box.remove(); box=null; btn.style.display=''; poll() }
  btn.onclick=function(){ show() };
  window.TPChat={open:show};
  window.TPSupport={open:function(){show('help')}};
})();
