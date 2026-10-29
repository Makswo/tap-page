/* ИИ-поддержка tap-page: кнопка «Помощь» слева внизу и чат.
   Отвечает только про курсы, оплату, доступ и профиль (правила — в api/_lib/support.js). */
(function(){
  'use strict';
  var KEY='tp_support_v1', busy=false, open=false, msgs=[];
  try{msgs=JSON.parse(sessionStorage.getItem(KEY)||'[]')}catch(e){msgs=[]}
  function save(){try{sessionStorage.setItem(KEY,JSON.stringify(msgs.slice(-30)))}catch(e){}}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
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

  var css=document.createElement('style');
  css.textContent='.sp-btn{position:fixed;left:max(16px,env(safe-area-inset-left));bottom:calc(16px + env(safe-area-inset-bottom));z-index:45;display:inline-flex;align-items:center;gap:8px;height:48px;padding:0 18px 0 14px;border-radius:999px;background:var(--s2);border:1px solid var(--line2);color:var(--tx);font:650 14.5px var(--f);box-shadow:0 12px 30px rgba(0,0,0,.5);cursor:pointer}'+
    '.sp-btn:hover{background:var(--s3)}.sp-btn svg{width:20px;height:20px;color:var(--acc)}.sp-btn i{width:8px;height:8px;border-radius:50%;background:var(--ok);box-shadow:0 0 0 3px rgba(62,224,160,.18)}'+
    '.tps{position:fixed;left:max(16px,env(safe-area-inset-left));bottom:calc(76px + env(safe-area-inset-bottom));z-index:55;width:380px;height:min(580px,calc(100vh - 110px));display:flex;flex-direction:column;border-radius:22px;background:var(--s1);border:1px solid var(--line2);box-shadow:0 24px 70px rgba(0,0,0,.65);overflow:hidden;animation:spin2 .25s cubic-bezier(.2,.8,.2,1)}'+
    '@keyframes spin2{from{opacity:0;transform:translateY(16px) scale(.98)}to{opacity:1;transform:none}}'+
    '.sp-h{display:flex;align-items:center;gap:10px;padding:14px 14px 12px 16px;border-bottom:1px solid var(--line)}'+
    '.sp-h .av{width:34px;height:34px;border-radius:11px;background:var(--acc);color:var(--acc-ink);display:grid;place-items:center;font-weight:800}'+
    '.sp-h b{display:block;font-size:15px}.sp-h span{display:block;font-size:12px;color:var(--tx3)}.sp-h .x{margin-left:auto;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;color:var(--tx2)}.sp-h .x:hover{background:var(--s2)}'+
    '.sp-m{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;overscroll-behavior:contain}'+
    '.sp-b{max-width:86%;padding:10px 13px;border-radius:16px;font-size:14.5px;line-height:1.5;word-wrap:break-word}'+
    '.sp-b.a{background:var(--s2);border:1px solid var(--line);border-bottom-left-radius:6px;align-self:flex-start}.sp-b.u{background:var(--acc);color:var(--acc-ink);border-bottom-right-radius:6px;align-self:flex-end;font-weight:500}'+
    '.sp-b a{color:var(--acc);text-decoration:underline;text-underline-offset:2px;word-break:break-all}.sp-b.err{border-color:rgba(255,107,107,.4)}'+
    '.sp-dots{display:inline-flex;gap:4px}.sp-dots i{width:6px;height:6px;border-radius:50%;background:var(--tx3);animation:spd 1s infinite}.sp-dots i:nth-child(2){animation-delay:.15s}.sp-dots i:nth-child(3){animation-delay:.3s}@keyframes spd{0%,60%,100%{opacity:.3}30%{opacity:1}}'+
    '.sp-s{display:flex;flex-wrap:wrap;gap:6px;margin-top:2px}.sp-s button{min-height:32px;padding:4px 12px;border-radius:999px;border:1px solid var(--line2);font-size:13px;color:var(--tx2);background:none}.sp-s button:hover{color:var(--tx);background:var(--s2)}'+
    '.sp-f{display:flex;gap:8px;align-items:flex-end;padding:10px;border-top:1px solid var(--line)}'+
    '.sp-f textarea{flex:1;min-height:44px;max-height:120px;resize:none;border-radius:16px;background:var(--bg);border:1px solid var(--line2);padding:11px 14px;font:15px/1.4 var(--f);color:var(--tx);outline:none}.sp-f textarea:focus{border-color:var(--acc)}'+
    '.sp-f button{width:44px;height:44px;border-radius:50%;background:var(--acc);color:var(--acc-ink);display:grid;place-items:center;flex:none}.sp-f button[disabled]{opacity:.4}'+
    '.sp-n{padding:0 14px 10px;font-size:11.5px;color:var(--tx3)}.sp-n a{color:var(--tx2)}'+
    '@media (max-width:640px){.tps{left:0;right:0;bottom:0;top:0;width:auto;height:auto;border-radius:0;border:0}.sp-btn{height:44px;padding:0 14px 0 12px;font-size:14px}}'+
    '@media print{.tps,.sp-btn{display:none!important}}';
  document.head.appendChild(css);

  var btn=document.createElement('button'); btn.className='sp-btn'; btn.type='button'; btn.setAttribute('aria-label','Помощь');
  btn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>Помощь<i></i>';
  document.body.appendChild(btn);
  var box=null;

  function render(){
    if(!box) return;
    var m=box.querySelector('.sp-m');
    var h='<div class="sp-b a">'+fmt(HELLO)+'</div>';
    if(!msgs.length) h+='<div class="sp-s">'+SUGG.map(function(s){return '<button type="button">'+esc(s)+'</button>'}).join('')+'</div>';
    msgs.forEach(function(x){h+='<div class="sp-b '+(x.role==='user'?'u':'a')+(x.err?' err':'')+'">'+(x.role==='user'?esc(x.content).replace(/\n/g,'<br>'):fmt(x.content))+'</div>'});
    if(busy) h+='<div class="sp-b a"><span class="sp-dots"><i></i><i></i><i></i></span></div>';
    m.innerHTML=h; m.scrollTop=m.scrollHeight;
    [].forEach.call(m.querySelectorAll('.sp-s button'),function(b){b.onclick=function(){ask(b.textContent)}});
    box.querySelector('.sp-f button').disabled=busy;
  }
  function ask(text){
    text=String(text||'').trim(); if(!text||busy) return;
    msgs.push({role:'user',content:text.slice(0,1500)}); busy=true; save(); render();
    if(typeof track==='function') track('support_ask');
    var order=null; try{order=localStorage.getItem('claude_start_order_v1')}catch(e){}
    var tk=(window.TP&&TP.token)?TP.token():Promise.resolve(null);
    tk.then(function(t){
      var h={'Content-Type':'application/json'}; if(t) h.Authorization='Bearer '+t;
      return fetch('/api/support',{method:'POST',headers:h,body:JSON.stringify({messages:msgs.filter(function(x){return !x.err}).map(function(x){return {role:x.role,content:x.content}}),order:order})})
        .then(function(r){return r.json().catch(function(){return {}}).then(function(d){d._s=r.status;return d})});
    }).then(function(d){
      busy=false;
      if(d.answer) msgs.push({role:'assistant',content:d.answer});
      else msgs.push({role:'assistant',err:true,content:d.error==='rate'?'Слишком много вопросов подряд. Попробуй чуть позже или напиши на mxmginarm@gmail.com.':
        d.error==='off'?'Поддержка сейчас недоступна. Напиши на mxmginarm@gmail.com или в директ @makswo — ответим.':'Не получилось ответить. Попробуй ещё раз или напиши на mxmginarm@gmail.com.'});
      save(); render();
    },function(){ busy=false; msgs.push({role:'assistant',err:true,content:'Нет связи. Проверь интернет и попробуй ещё раз.'}); save(); render() });
  }
  function show(){
    if(open) return; open=true; btn.style.display='none';
    box=document.createElement('div'); box.className='tps'; box.setAttribute('role','dialog'); box.setAttribute('aria-label','Поддержка');
    box.innerHTML='<div class="sp-h"><div class="av">M</div><div><b>Поддержка tap-page</b><span>ИИ-помощник · отвечает сразу</span></div><button class="x" type="button" aria-label="Закрыть"><svg class="ic" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>'+
      '<div class="sp-m"></div><form class="sp-f"><textarea rows="1" maxlength="1500" placeholder="Опиши вопрос…"></textarea><button type="submit" aria-label="Отправить"><svg class="ic" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button></form>'+
      '<div class="sp-n">ИИ может ошибаться. Сложный случай — <a href="mailto:mxmginarm@gmail.com">mxmginarm@gmail.com</a></div>';
    document.body.appendChild(box);
    var ta=box.querySelector('textarea'), f=box.querySelector('form');
    box.querySelector('.x').onclick=hide;
    f.onsubmit=function(e){e.preventDefault(); var v=ta.value; ta.value=''; ta.style.height=''; ask(v)};
    ta.onkeydown=function(e){ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();f.onsubmit(e)} if(e.key==='Escape') hide() };
    ta.oninput=function(){ta.style.height='';ta.style.height=Math.min(120,ta.scrollHeight)+'px'};
    render(); if(window.innerWidth>640) ta.focus();
    if(typeof track==='function') track('support_open');
  }
  function hide(){ open=false; if(box) box.remove(); box=null; btn.style.display='' }
  btn.onclick=show;
  window.TPSupport={open:show};
})();
