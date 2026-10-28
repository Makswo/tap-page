/* Видео от Макса в маленьком окне справа внизу (как на сайтах продуктов).
   Пока видео нет — показываем заглушку. Когда снимешь ролик, положи mp4 в /assets/video/
   и передай путь в src при вызове TPVideo({...}). */
function TPVideo(o){
  'use strict';
  o=o||{};
  var key='tp_vw_closed_'+(o.key||'x');
  try{ if(sessionStorage.getItem(key)) return }catch(e){}
  var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
  if(!document.getElementById('tpvw-css')){
    var st=document.createElement('style'); st.id='tpvw-css';
    st.textContent='.vw{position:fixed;right:max(18px,env(safe-area-inset-right));bottom:calc(18px + env(safe-area-inset-bottom));z-index:40;width:132px;aspect-ratio:9/16;border-radius:20px;overflow:hidden;cursor:pointer;'+
      'background:#0d0f11;border:1px solid var(--line2);box-shadow:0 18px 50px rgba(0,0,0,.6);transition:transform .2s,opacity .3s;animation:vwin .5s .6s cubic-bezier(.2,.8,.2,1) both}'+
      '.vw:hover{transform:translateY(-3px) scale(1.02)}@keyframes vwin{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:none}}'+
      '.vw video,.vwm video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}'+
      '.vph{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;text-align:center;padding:12px;'+
      'background:radial-gradient(80% 50% at 50% 30%,rgba(212,255,63,.16),transparent 70%),radial-gradient(80% 50% at 50% 100%,rgba(168,85,247,.28),transparent 70%),#0d0f11}'+
      '.vph .av{width:44px;height:44px;border-radius:50%;background:var(--acc);color:var(--acc-ink);display:grid;place-items:center;font-weight:800;font-size:20px;box-shadow:0 0 0 4px rgba(212,255,63,.15)}'+
      '.vph b{font-size:13px;line-height:1.2;color:var(--tx)}.vph small{font-family:var(--m);font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--tx3)}'+
      '.vw .vcap{position:absolute;left:0;right:0;bottom:0;padding:22px 10px 10px;background:linear-gradient(180deg,transparent,rgba(0,0,0,.75));font-size:12px;font-weight:650;color:#fff;display:flex;align-items:center;gap:6px}'+
      '.vw .vcap i{width:22px;height:22px;border-radius:50%;background:var(--acc);display:grid;place-items:center;flex:none}.vw .vcap svg{width:10px;height:10px;fill:var(--acc-ink);margin-left:2px}'+
      '.vx{position:absolute;top:6px;right:6px;z-index:2;width:24px;height:24px;border-radius:50%;background:rgba(0,0,0,.55);color:#fff;display:grid;place-items:center}.vx svg{width:12px;height:12px}'+
      '.vwm{position:fixed;inset:0;z-index:60;display:grid;place-items:center;padding:16px;background:rgba(4,5,6,.8);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}'+
      '.vwm .vbox{position:relative;height:min(82vh,680px);aspect-ratio:9/16;max-width:100%;border-radius:24px;overflow:hidden;background:#0d0f11;border:1px solid var(--line2)}'+
      '.vwm .vph .av{width:64px;height:64px;font-size:28px}.vwm .vph b{font-size:20px;max-width:14em}.vwm .vph p{margin:0;color:var(--tx2);font-size:14px;max-width:18em}'+
      '.vwm .vx{top:10px;right:10px;width:34px;height:34px}.vwm .vx svg{width:15px;height:15px}'+
      '@media (max-width:640px){.vw{width:84px;border-radius:16px}.vph .av{width:32px;height:32px;font-size:15px}.vw .vph b{display:none}.vw .vph{justify-content:flex-start;padding-top:34px}.vw .vph small{display:none}.vw .vcap{font-size:0;justify-content:center;padding:16px 7px 9px}.vw .vcap i{width:18px;height:18px}}'+
      '@media print{.vw,.vwm{display:none!important}}';
    document.head.appendChild(st);
  }
  var X='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  var ph=function(big){return '<div class="vph"><div class="av">M</div><b>'+esc(big?(o.soonTitle||o.title):o.title)+'</b>'+(big?'<p>'+esc(o.soonText||'Видео скоро появится здесь.')+'</p>':'<small>видео скоро</small>')+'</div>'};
  var el=document.createElement('div'); el.className='vw'; el.setAttribute('role','button'); el.setAttribute('tabindex','0'); el.setAttribute('aria-label',o.title||'Видео');
  el.innerHTML=(o.src?'<video src="'+esc(o.src)+'"'+(o.poster?' poster="'+esc(o.poster)+'"':'')+' muted loop playsinline autoplay preload="metadata"></video>':ph(false))+
    '<div class="vcap"><i><svg viewBox="0 0 10 10"><path d="M0 0l10 5-10 5z"/></svg></i>'+esc(o.label||'Смотреть')+'</div>'+
    '<button class="vx" type="button" aria-label="Скрыть видео">'+X+'</button>';
  document.body.appendChild(el);
  el.querySelector('.vx').onclick=function(e){e.stopPropagation();el.remove();try{sessionStorage.setItem(key,'1')}catch(_){}};
  function open(){
    if(typeof track==='function') track('video_open',{v:o.key});
    var m=document.createElement('div'); m.className='vwm';
    m.innerHTML='<div class="vbox">'+(o.src?'<video src="'+esc(o.src)+'"'+(o.poster?' poster="'+esc(o.poster)+'"':'')+' controls autoplay playsinline></video>':ph(true))+'<button class="vx" type="button" aria-label="Закрыть">'+X+'</button></div>';
    document.body.appendChild(m);
    var mini=el.querySelector('video'); if(mini) mini.pause();
    function close(){ m.remove(); document.removeEventListener('keydown',onk); if(mini) mini.play().catch(function(){}) }
    function onk(e){ if(e.key==='Escape') close() }
    m.querySelector('.vx').onclick=close; m.onclick=function(e){ if(e.target===m) close() };
    document.addEventListener('keydown',onk);
  }
  el.onclick=open;
  el.onkeydown=function(e){ if(e.key==='Enter'||e.key===' '){e.preventDefault();open()} };
  return el;
}
