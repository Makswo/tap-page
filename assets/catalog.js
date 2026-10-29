/* Каталог курсов и коллекция кристаллов: данные и общие блоки для / и /me. */
var COURSES=[
  {id:'start', gem:'start', status:'open', title:'Как начать с Claude', price:'299 ₽', href:'/start',
   desc:'Личная инструкция по 10 твоим ответам: где установить, какой первый запрос дать и что поручить Claude в первую очередь.',
   items:['Установка под твои устройства','Готовые запросы под твою работу','План на 7 дней']},
  {id:'nabor', gem:'nabor', status:'soon', title:'Стартовый набор Макса',
   desc:'Следующий шаг после старта: научим Claude твоей работе. Набор скилов — готовых умений, чтобы он делал твои повторяющиеся задачи так же, как ты.',
   items:['Скилы под твою сферу и рутину','Письма, отчёты, посты и таблицы','Базовые дела — без тебя'],
   video:{src:'/assets/video/nabor.mp4',mini:'/assets/video/nabor-mini.mp4',poster:'/assets/video/nabor-poster.jpg'}},
  {id:'montage', gem:'montage', status:'soon', title:'Студия авто-монтажа в Claude',
   desc:'Как собрать в Claude студию, которая монтирует вертикальные ролики: режет дубли и паузы, ставит субтитры и плашки.',
   items:['Монтаж по расшифровке речи','Субтитры и плашки в твоём стиле','Готовый ролик за минуты'],
   video:{src:'/assets/video/montage.mp4?v=2',mini:'/assets/video/montage-mini.mp4?v=2',poster:'/assets/video/montage-poster.jpg?v=2'}},
  {id:'assistant', gem:'assistant', status:'soon', title:'Личный помощник в Claude',
   desc:'Как сделать помощника, который знает твои дела: помнит контекст, разбирает входящие и готовит план дня.',
   items:['Память о тебе и твоих проектах','Разбор почты и календаря','План дня и напоминания']}
];
function courseById(id){for(var k=0;k<COURSES.length;k++)if(COURSES[k].id===id)return COURSES[k];return null}

// Сетка из 7 кристаллов: собранные светятся, остальные — тёмные силуэты.
function collectionHTML(owned){
  owned=owned||{};
  var n=0; GEMS.forEach(function(g){if(owned[g.id])n++});
  var h='<div class="coll">';
  GEMS.forEach(function(g){
    var have=!!owned[g.id], c=g.course&&courseById(g.course);
    var sub=have?'Собран':(g.secret?'Откроется позже':'За курс «'+c.title+'»');
    h+='<div class="slot'+(have?' have':'')+(g.secret?' secret':'')+'" style="--ch:'+g.hue+'deg">'+gemHTML({size:'md',hue:g.hue,locked:!have,secret:g.secret})+
      '<b>'+(have||!g.secret?TP.esc(g.name):'???')+'</b><span>'+TP.esc(sub)+'</span></div>';
  });
  h+='</div><div class="cprog"><div class="bar"><i style="width:'+Math.round(n/GEMS.length*100)+'%"></i></div><span>Собрано '+n+' из '+GEMS.length+'</span></div>';
  return h;
}

// Сертификат на кристалл (для профиля).
function certHTML(cert){
  var g=gemById(cert.course)||GEMS[0], c=courseById(cert.course);
  var v=cert.course==='start'?gemFromOrder(cert.order_id):{hue:0,name:g.name};
  var hue=g.hue+(cert.course==='start'?v.hue:0);
  var dt=new Date(cert.created_at).toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'});
  return '<div class="cert" style="--ch:'+hue+'deg"><div>'+gemHTML({size:'md',hue:hue})+'</div><div><div class="eyebrow">Сертификат</div><h3>'+TP.esc(g.title)+'</h3><dl>'+
    '<dt>Номер</dt><dd class="cno">№ '+TP.esc(certNo(cert.order_id||cert.id))+'</dd>'+
    '<dt>Камень</dt><dd>'+TP.esc(cert.course==='start'?v.name:g.name)+'</dd>'+
    '<dt>Курс</dt><dd>'+TP.esc(c?c.title:'')+'</dd>'+
    '<dt>Выдан</dt><dd>'+TP.esc(dt)+'</dd></dl>'+
    (cert.course==='start'&&cert.order_id?'<p><a class="btn gho sm" href="/start?order='+encodeURIComponent(cert.order_id)+'">Открыть инструкцию</a></p>':'')+'</div></div>';
}
