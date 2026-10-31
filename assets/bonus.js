/* Бонусы к курсам: что человек забирает вместе с курсом. Иконки — линейные, в акцентном цвете. */
var BONUS_ICONS={
  // стопка карточек с запросами
  start:'<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><rect x="13" y="6" width="27" height="33" rx="5"/><path d="M8 13v24a5 5 0 0 0 5 5h20"/><path d="M20 16h13M20 22.5h13M20 29h8"/></svg>',
  // команда агентов: три связанных узла
  nabor:'<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="11" r="5.5"/><circle cx="10" cy="35" r="5.5"/><circle cx="38" cy="35" r="5.5"/><path d="M21 16l-8 14M27 16l8 14M15.5 35h17"/><path d="M24 22v3M24 28.5v.5"/></svg>',
  // хлопушка с искрой
  montage:'<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="19" width="30" height="22" rx="4"/><path d="M6 19l3.5-9.5 28 0-3.5 9.5"/><path d="M15 10l-3.5 9M24 10l-3.5 9M33 10l-3.5 9"/><path d="M41 6v6M38 9h6M42 20v4M40 22h4"/></svg>',
  // солнце над списком дел
  assistant:'<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 20a10 10 0 0 1 20 0"/><path d="M24 4v4M10 9l2.8 2.8M38 9l-2.8 2.8M5 20h4M39 20h4"/><path d="M9 27h30M9 34h22M9 41h14"/></svg>'
};
var BONUS={
  start:{title:'50 готовых запросов',sub:'Под твою сферу и задачи — скопировал и вставил'},
  nabor:{title:'Команда агентов для бизнеса',sub:'Готовые скилы: письма клиентам, КП, отчёты, контент-план'},
  montage:{title:'10 топовых агентов для монтажа',sub:'Дубли, субтитры, плашки, цвет, звук, обложки'},
  assistant:{title:'Утренний бриф',sub:'Каждое утро — план дня, важные письма и встречи'}
};
// Кристаллы остались маленьким приятным знаком: за каждый курс — кристалл, о нём узнают в общем чате.
var CRYSTAL={start:['Аметист',0],nabor:['Сапфир',-46],montage:['Изумруд',-112],assistant:['Рубин',92]};
function crystalTag(id,text){var c=CRYSTAL[id]||CRYSTAL.start;return '<span class="cry" style="--ch:'+c[1]+'deg"><i></i>'+(text||'+ кристалл «'+c[0]+'»')+'</span>'}
function bonusIcon(id,cls){return '<span class="bico'+(cls?' '+cls:'')+'" aria-hidden="true">'+(BONUS_ICONS[id]||BONUS_ICONS.start)+'</span>'}
(function(){
  if(document.getElementById('bico-css')) return;
  var st=document.createElement('style'); st.id='bico-css';
  st.textContent='.bico{display:inline-grid;place-items:center;flex:none;width:44px;height:44px;border-radius:14px;color:var(--acc);background:rgba(212,255,63,.08);border:1px solid rgba(212,255,63,.28)}'+
    '.cry{display:inline-flex;align-items:center;gap:6px;font-size:12px;line-height:1.3;color:var(--tx3)}.cry i{width:7px;height:7px;flex:none;border-radius:2px;transform:rotate(45deg);background:hsl(calc(264deg + var(--ch,0deg)) 80% 68%);box-shadow:0 0 6px hsl(calc(264deg + var(--ch,0deg)) 90% 60%)}'+
    '.bico svg{width:58%;height:58%}.bico.sm{width:30px;height:30px;border-radius:10px}.bico.lg{width:84px;height:84px;border-radius:24px}.bico.mute{color:var(--tx2);background:var(--s2);border-color:var(--line2)}';
  document.head.appendChild(st);
})();
