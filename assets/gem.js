/* Кристаллы tap-page: форма, свечение, искры по клику и 7 цветов коллекции.
   Подключается на /, /me и /start. */
var GEM_N=0;
// форма кристалла: компактный многогранник, прозрачные крупные грани
var SHARD_O='69,58 142,66 184,125 156,188 86,215 29,172 29,102';
var SHARD_T='82,149 71,111 29,172|0.51|-7;29,172 29,102 71,111|0.66|-3;29,102 69,58 71,111|0.88|-6;71,111 94,80 69,58|0.94|-10;69,58 142,66 94,80|0.92|-15;94,80 132,89 142,66|0.79|-20;142,66 184,125 132,89|0.49|-26;132,89 149,125 184,125|0.31|-27;184,125 156,188 149,125|0.12|-28;149,125 120,152 156,188|0.06|-24;156,188 86,215 120,152|0.08|-19;120,152 82,149 86,215|0.17|-14;86,215 29,172 82,149|0.31|-8;94,80 132,89 102,122|0.98|-10;132,89 149,125 102,122|0.86|-10;149,125 120,152 102,122|0.7|-10;120,152 82,149 102,122|0.62|-10;82,149 71,111 102,122|0.78|-10;71,111 94,80 102,122|0.93|-10'.split(';').map(function(x){x=x.split('|');return [x[0],+x[1],+x[2]]});
var SHARD_R='94,80,132,89,0.6;132,89,149,125,0.6;149,125,120,152,0.6;120,152,82,149,0.6;82,149,71,111,0.6;71,111,94,80,0.6;94,80,102,122,0.3;132,89,102,122,0.3;149,125,102,122,0.3;120,152,102,122,0.3;82,149,102,122,0.3;71,111,102,122,0.3'.split(';').map(function(x){return x.split(',').map(Number)});
function gemSVG(hue){
  var u='g'+(++GEM_N), h=hue||0;
  function c(l,a,dh){return 'hsla('+(264+h+(dh||0))+',74%,'+l+'%,'+(a==null?1:a)+')'}
  var grads='', body='';
  SHARD_T.forEach(function(t,k){var l=40+54*t[1], id=u+'f'+k;
    grads+='<linearGradient id="'+id+'" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="'+c(Math.min(97,l+7),.94,t[2])+'"/><stop offset="1" stop-color="'+c(Math.max(24,l-9),.9,t[2])+'"/></linearGradient>';
    body+='<polygon points="'+t[0]+'" fill="url(#'+id+')" stroke="'+c(Math.min(97,l+20),.75,t[2])+'" stroke-width=".7" stroke-linejoin="round"/>'});
  var defs='<defs>'+grads+
    '<clipPath id="'+u+'clip"><polygon points="'+SHARD_O+'"/></clipPath>'+
    '<radialGradient id="'+u+'core" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset=".35" stop-color="#fff" stop-opacity=".25"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>'+
    '<linearGradient id="'+u+'s" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".6"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>'+
    '<filter id="'+u+'soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2"/></filter></defs>';
  var inner='<g clip-path="url(#'+u+'clip)">'+
    '<ellipse cx="110" cy="118" rx="42" ry="38" fill="url(#'+u+'core)" class="gcore"/>'+
    '<polygon points="96,84 128,92 106,110" fill="rgba(255,255,255,.75)" filter="url(#'+u+'soft)"/>'+
    '<path d="M40 150 L84 128 M150 160 L170 130" stroke="rgba(255,255,255,.35)" stroke-width="1.2" fill="none"/>'+
    '<rect class="gshine" x="-160" y="-20" width="160" height="300" fill="url(#'+u+'s)" transform="skewX(-18)"/></g>';
  var ridges=SHARD_R.map(function(r){return '<line x1="'+r[0]+'" y1="'+r[1]+'" x2="'+r[2]+'" y2="'+r[3]+'" stroke="rgba(255,255,255,'+r[4]+')" stroke-width="1" stroke-linecap="round"/>'}).join('');
  var edge='<polygon points="'+SHARD_O+'" fill="none" stroke="'+c(94,.95)+'" stroke-width="1.5" stroke-linejoin="round"/>';
  var star='<path d="M142 56 l2.4 -9 l2.4 9 l9 2.4 l-9 2.4 l-2.4 9 l-2.4 -9 l-9 -2.4z" fill="#fff" class="gstar"/>';
  return '<svg class="gemsvg" viewBox="0 0 200 262" aria-hidden="true">'+defs+body+inner+ridges+edge+star+'</svg>';
}
function gemHTML(opts){
  opts=opts||{};
  return '<div class="gem'+(opts.size?' gem-'+opts.size:'')+(opts.locked?' locked':'')+(opts.secret?' secret':'')+'" style="--gh:'+(opts.hue||0)+'deg">'+
    '<div class="gglow"></div><canvas class="gfx"></canvas>'+
    '<div class="gfloat">'+gemSVG(opts.hue||0)+'</div><div class="gshadow"></div></div>';
}
// пар вокруг кристалла и искры по клику
var REDUCED=false; try{REDUCED=window.matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){}
function gemFX(root){
  var cv=root.querySelector('.gfx'); if(!cv||!cv.getContext) return;
  var ctx=cv.getContext('2d'), dpr=Math.min(2,window.devicePixelRatio||1), W=0,H=0, S=1, V=[], K=[], R=[], F=[], D=[], vis=true, raf=0;
  var gh=parseFloat(root.style.getPropertyValue('--gh'))||0;
  function size(){W=cv.offsetWidth;H=cv.offsetHeight;S=root.offsetWidth/132;cv.width=Math.max(1,W*dpr);cv.height=Math.max(1,H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0)}
  // клуб пара: большой мягкий, поднимается и расплывается
  function puff(init,boost){
    var alien=Math.random()<.28;
    return {x:W/2+(Math.random()-.5)*root.offsetWidth*.7, y:H/2+root.offsetHeight*(.05+Math.random()*.3),
      vx:(Math.random()-.5)*.18*S, vy:-(.12+Math.random()*.28)*S*(boost?2.2:1), r:(22+Math.random()*26)*S,
      life:init?Math.random()*300:0, max:260+Math.random()*220, ph:Math.random()*6.28,
      h:alien?170+gh+Math.random()*16:262+gh+Math.random()*30, a:(boost?.42:.3)*(alien?.85:1)};
  }
  function burst(){
    var n=Math.round(46+30*Math.min(1.4,S)), cx=W/2, cy=H/2-root.offsetHeight*.04;
    for(var k=0;k<n;k++){
      var ang=Math.random()*6.283, sp=(2.2+Math.random()*5.2)*Math.max(.6,S), c=Math.random();
      K.push({x:cx,y:cy,px:cx,py:cy,vx:Math.cos(ang)*sp,vy:Math.sin(ang)*sp-1.2*S,life:0,max:44+Math.random()*46,w:(1+Math.random()*1.6)*Math.max(.7,S),
        col:c<.34?'255,255,255':c<.78?'216,180,254':'110,255,230'});
    }
    R.push({r:root.offsetWidth*.25,life:0,max:38},{r:root.offsetWidth*.15,life:-8,max:44});
    F.push({life:0,max:34});
    root.classList.remove('gzap'); void root.offsetWidth; root.classList.add('gzap');
    go();
  }
  function frame(){
    raf=0;
    // кристалл мог появиться на скрытом экране: пересчитываем размер холста, когда он стал видимым
    if(cv.offsetWidth!==W||cv.offsetHeight!==H){ var was=W; size(); if(!was&&W){ V=[]; if(!REDUCED) for(var q=0;q<28;q++) V.push(puff(true)) } }
    if(!W||!H){ return }
    ctx.clearRect(0,0,W,H); ctx.globalCompositeOperation='lighter';
    var ambient=vis&&!REDUCED&&!document.hidden;
    // пар
    for(var k=V.length-1;k>=0;k--){var p=V[k];
      p.life++; p.ph+=.012; p.x+=p.vx+Math.sin(p.ph)*.22*S; p.y+=p.vy;
      var t=p.life/p.max; if(t>=1){ if(ambient&&V.length<=30) V[k]=puff(false); else V.splice(k,1); continue }
      var a=Math.sin(Math.PI*t)*p.a, rr=p.r*(1+t*1.6);
      var g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,rr);
      g.addColorStop(0,'hsla('+p.h+',95%,62%,'+a+')'); g.addColorStop(.45,'hsla('+p.h+',95%,60%,'+(a*.45)+')'); g.addColorStop(1,'hsla('+p.h+',95%,50%,0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(p.x,p.y,rr,0,6.283); ctx.fill();
    }
    // вспышка по клику: на месте, без подъёма вверх
    for(k=F.length-1;k>=0;k--){var f=F[k]; f.life++; var ft=f.life/f.max; if(ft>=1){F.splice(k,1);continue}
      var fa=(ft<.15?ft/.15:1-(ft-.15)/.85)*.32, fr=root.offsetWidth*(.55+ft*.35), fx=W/2, fy=H/2;
      var fg=ctx.createRadialGradient(fx,fy,0,fx,fy,fr); fg.addColorStop(0,'hsla('+(272+gh)+',100%,70%,'+fa+')'); fg.addColorStop(.5,'hsla('+(272+gh)+',100%,60%,'+(fa*.4)+')'); fg.addColorStop(1,'hsla('+(272+gh)+',100%,55%,0)');
      ctx.fillStyle=fg; ctx.beginPath(); ctx.arc(fx,fy,fr,0,6.283); ctx.fill()}
    // кольца
    for(k=R.length-1;k>=0;k--){var q=R[k]; q.life++; if(q.life<0) continue; var tt=q.life/q.max; if(tt>=1){R.splice(k,1);continue}
      ctx.strokeStyle='rgba(225,200,255,'+((1-tt)*.55)+')'; ctx.lineWidth=2*(1-tt)*Math.max(.7,S);
      ctx.beginPath(); ctx.arc(W/2,H/2,q.r+tt*root.offsetWidth*1.1,0,6.283); ctx.stroke()}
    // мерцающие точки вокруг
    if(ambient&&D.length<14&&Math.random()<.12) D.push({x:W/2+(Math.random()-.5)*root.offsetWidth*1.6,y:H/2+(Math.random()-.5)*root.offsetHeight*1.3,life:0,max:60+Math.random()*90,r:(.7+Math.random()*1.2)*Math.max(.7,S),vy:-(.05+Math.random()*.2),col:Math.random()<.55?'255,255,255':'170,200,255'});
    for(k=D.length-1;k>=0;k--){var o=D[k]; o.life++; o.y+=o.vy; var ot=o.life/o.max; if(ot>=1){D.splice(k,1);continue}
      var oa=Math.sin(Math.PI*ot); var og=ctx.createRadialGradient(o.x,o.y,0,o.x,o.y,o.r*5); og.addColorStop(0,'rgba('+o.col+','+oa+')'); og.addColorStop(.3,'rgba('+o.col+','+(oa*.35)+')'); og.addColorStop(1,'rgba('+o.col+',0)');
      ctx.fillStyle=og; ctx.beginPath(); ctx.arc(o.x,o.y,o.r*5,0,6.283); ctx.fill()}
    // искры
    for(k=K.length-1;k>=0;k--){var s=K[k]; s.life++; s.px=s.x; s.py=s.y; s.vx*=.965; s.vy=s.vy*.965+.07*S; s.x+=s.vx; s.y+=s.vy;
      var u=s.life/s.max; if(u>=1){K.splice(k,1);continue}
      var al=(1-u)*(u<.1?u*10:1);
      ctx.strokeStyle='rgba('+s.col+','+al+')'; ctx.lineWidth=s.w*(1-u*.6); ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(s.px-s.vx*1.6,s.py-s.vy*1.6); ctx.lineTo(s.x,s.y); ctx.stroke();
      var gg=ctx.createRadialGradient(s.x,s.y,0,s.x,s.y,s.w*4); gg.addColorStop(0,'rgba('+s.col+','+(al*.7)+')'); gg.addColorStop(1,'rgba('+s.col+',0)');
      ctx.fillStyle=gg; ctx.beginPath(); ctx.arc(s.x,s.y,s.w*4,0,6.283); ctx.fill();
    }
    if(ambient||K.length||R.length||F.length||D.length||V.length) raf=requestAnimationFrame(frame);
  }
  function go(){ if(!raf) raf=requestAnimationFrame(frame) }
  size();
  if(!REDUCED) for(var k=0;k<28;k++) V.push(puff(true));
  root.setAttribute('role','button'); root.setAttribute('tabindex','0'); root.setAttribute('aria-label','Кристалл старта — нажми');
  root.addEventListener('click',function(){ burst(); if(typeof track==='function') track('gem_tap') });
  root.addEventListener('keydown',function(e){ if(e.key==='Enter'||e.key===' '){e.preventDefault();burst()} });
  if('IntersectionObserver' in window) new IntersectionObserver(function(e){vis=e[0].isIntersecting; if(vis) go()}).observe(root);
  document.addEventListener('visibilitychange',function(){ if(!document.hidden) go() });
  window.addEventListener('resize',size);
  go();
}
function mountGems(scope){[].forEach.call((scope||document).querySelectorAll('.gem'),function(g){if(!g._s&&!g.classList.contains('locked')){g._s=1;gemFX(g)}})}
// уникальный оттенок и «порода» кристалла по номеру заказа
function gemFromOrder(id){
  var h=0,s=String(id||'start');for(var k=0;k<s.length;k++)h=(h*31+s.charCodeAt(k))>>>0;
  var names=['Аметист','Фиалка','Ирис','Сумеречный','Аврора','Полночь'];
  return {hue:(h%41)-20, name:names[(h>>>8)%names.length], no:String(id||'').replace(/-/g,'').slice(0,8).toUpperCase()||'DEMO0000', facets:8+((h>>>4)%5)*2};
}

// Коллекция: 7 кристаллов. Первые четыре выдаются за курсы, три — секретные.
// hue — сдвиг оттенка от базового фиолетового (264°).
var GEMS=[
  {id:'start',     name:'Аметист',   title:'Кристалл старта',      hue:0,    course:'start'},
  {id:'nabor',     name:'Сапфир',    title:'Кристалл системы',     hue:-46,  course:'nabor'},
  {id:'montage',   name:'Изумруд',   title:'Кристалл монтажа',     hue:-112, course:'montage'},
  {id:'assistant', name:'Рубин',     title:'Кристалл помощника',   hue:92,   course:'assistant'},
  {id:'topaz',     name:'Топаз',     title:'Секретный кристалл',   hue:144,  secret:true},
  {id:'aqua',      name:'Аквамарин', title:'Секретный кристалл',   hue:-78,  secret:true},
  {id:'rose',      name:'Морганит',  title:'Секретный кристалл',   hue:62,   secret:true}
];
function gemById(id){for(var k=0;k<GEMS.length;k++)if(GEMS[k].id===id)return GEMS[k];return null}
function certNo(id){var n=String(id||'').replace(/-/g,'').slice(0,8).toUpperCase()||'DEMO0000';return n.slice(0,4)+'-'+n.slice(4)}
