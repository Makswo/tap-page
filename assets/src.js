/* Метки источников: tap-page.ru/start?from=start_r23.
   Метка из ссылки запоминается в браузере на 30 дней (последняя побеждает) и уходит в заказ.
   Каждая страница один раз за сессию отмечает заход: метка + анонимный id браузера, без личных данных. */
(function(){
  var KEY='tp_src_v1', VKEY='tp_vid_v1', DAY=864e5, RE=/^[a-z0-9][a-z0-9_-]{0,39}$/;
  function get(k){try{return localStorage.getItem(k)}catch(e){return null}}
  function set(k,v){try{localStorage.setItem(k,v)}catch(e){}}
  var q=null; try{q=new URLSearchParams(location.search).get('from')}catch(e){}
  q=q?String(q).trim().toLowerCase():'';
  if(RE.test(q)) set(KEY,JSON.stringify({v:q,at:Date.now()}));
  function src(){
    try{var s=JSON.parse(get(KEY)||'null'); if(s&&RE.test(s.v)&&Date.now()-s.at<30*DAY) return s.v}catch(e){}
    return null;
  }
  window.TP_SRC=src;

  var vid=get(VKEY);
  if(!vid||!/^[a-z0-9]{8,32}$/.test(vid)){ vid=(Math.random().toString(36).slice(2)+Date.now().toString(36)).slice(0,20); set(VKEY,vid) }
  var p=location.pathname.replace(/\/+$/,'')||'/';
  var page={'/':'home','/start':'start','/me':'me','/kit':'kit','/group':'group','/pro':'pro'}[p]||'other';
  var seen='tp_seen_'+page; try{ if(sessionStorage.getItem(seen)) return; sessionStorage.setItem(seen,'1') }catch(e){}
  var data=JSON.stringify({vid:vid,page:page,from:src()});
  try{ if(navigator.sendBeacon&&navigator.sendBeacon('/api/tutorial?a=visit',new Blob([data],{type:'text/plain'}))) return }catch(e){}
  try{ fetch('/api/tutorial?a=visit',{method:'POST',headers:{'Content-Type':'text/plain'},body:data,keepalive:true}) }catch(e){}
})();
