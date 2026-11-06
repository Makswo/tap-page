/* Иконки админа в верхней панели (как в Glocal): воронка, заявки, рассылки, поддержка → /admin#раздел.
   Флаг «я админ» приходит из /api/account (поле admin) и хранится в браузере; сервер всё равно
   проверяет права на каждом запросе, так что флаг только решает, показывать ли иконки. */
(function(){
  var KEY='tp_admin_v1';
  var IC={
    funnel:['Воронка','M13 3L5 13h6l-1 8 8-10h-6z'],
    leads:['Заявки в группу','M16 20v-1a4 4 0 00-4-4H8a4 4 0 00-4 4v1M10 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM20 20v-1a4 4 0 00-3-3.9M15 4.2a3.5 3.5 0 010 6.6'],
    mail:['Рассылки','M21 4L3 11l7 3 3 7z'],
    support:['Поддержка','M20 12a7 7 0 01-7 7H8l-4 3 1-4.3A7 7 0 1120 12z']
  };
  function get(){try{return localStorage.getItem(KEY)==='1'}catch(e){return false}}
  function css(){
    if(document.getElementById('admbar-css')) return;
    var st=document.createElement('style'); st.id='admbar-css';
    st.textContent='.admbar{display:flex;gap:6px;align-items:center}'+
      '.admbar a{width:36px;height:36px;border-radius:12px;display:grid;place-items:center;border:1px solid var(--line2);color:var(--tx2);flex:none;text-decoration:none;transition:color .15s,border-color .15s,background .15s}'+
      '.admbar a:hover{color:var(--tx);background:var(--s2)}.admbar a.on{color:var(--acc-ink);background:var(--acc);border-color:var(--acc)}'+
      '.admbar svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}'+
      '@media (max-width:560px){.admbar{gap:4px}.admbar a{width:32px;height:32px;border-radius:10px}.admbar svg{width:15px;height:15px}}';
    document.head.appendChild(st);
  }
  function active(){ return location.pathname.replace(/\/+$/,'')==='/admin'?((location.hash||'#funnel').slice(1)):'' }
  function draw(){
    var nav=document.querySelector('.nav .wrap'); if(!nav) return;
    var old=nav.querySelector('.admbar');
    var on=get()&&window.TP&&TP.user();
    if(!on){ if(old) old.remove(); return }
    css();
    var bar=old||document.createElement('div'); bar.className='admbar';
    var cur=active();
    bar.innerHTML=Object.keys(IC).map(function(k){
      return '<a href="/admin#'+k+'" class="'+(cur===k?'on':'')+'" title="'+IC[k][0]+'" aria-label="'+IC[k][0]+'"><svg viewBox="0 0 24 24"><path d="'+IC[k][1]+'"/></svg></a>';
    }).join('');
    if(!old){ var acct=nav.querySelector('#acct, a[href="/me"]'); acct?nav.insertBefore(bar,acct):nav.appendChild(bar) }
  }
  window.TPAdminBar={
    set:function(isAdmin){ try{isAdmin?localStorage.setItem(KEY,'1'):localStorage.removeItem(KEY)}catch(e){} draw() },
    draw:draw
  };
  window.addEventListener('hashchange',draw);
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',draw); else draw();
  // Проверяем флаг на сервере, если человек вошёл: снимет иконки, если права отозваны.
  if(window.TP&&TP.user()&&!/\/(me|admin)\/?$/.test(location.pathname)&&!sessionStorage.getItem('tp_admchk')){
    try{sessionStorage.setItem('tp_admchk','1')}catch(e){}
    TP.call('GET','/api/account').then(function(d){ if(d&&d.user) TPAdminBar.set(!!d.admin) },function(){});
  }
})();
