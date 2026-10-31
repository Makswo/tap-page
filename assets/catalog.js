/* Каталог курсов: данные для / и /me. */
var COURSES=[
  {id:'start', status:'open', title:'Как начать с Claude', price:'299 ₽', href:'/start',
   desc:'Личная инструкция по 10 твоим ответам: где установить, какой первый запрос дать и что поручить Claude в первую очередь.',
   items:['Установка под твои устройства','Готовые запросы под твою работу','План на 7 дней']},
  {id:'nabor', status:'soon', title:'Стартовый набор Макса',
   desc:'Следующий шаг после старта: научим Claude твоей работе. Набор скилов — готовых умений, чтобы он делал твои повторяющиеся задачи так же, как ты.',
   items:['Скилы под твою сферу и рутину','Письма, отчёты, посты и таблицы','Базовые дела — без тебя'],
   video:{src:'/assets/video/nabor.mp4',mini:'/assets/video/nabor-mini.mp4',poster:'/assets/video/nabor-poster.jpg'}},
  {id:'montage', status:'soon', title:'Студия авто-монтажа в Claude',
   desc:'Как собрать в Claude студию, которая монтирует вертикальные ролики: режет дубли и паузы, ставит субтитры и плашки.',
   items:['Монтаж по расшифровке речи','Субтитры и плашки в твоём стиле','Готовый ролик за минуты'],
   video:{src:'/assets/video/montage.mp4?v=2',mini:'/assets/video/montage-mini.mp4?v=2',poster:'/assets/video/montage-poster.jpg?v=2'}},
  {id:'assistant', status:'soon', title:'Личный помощник в Claude',
   desc:'Как сделать помощника, который знает твои дела: помнит контекст, разбирает входящие и готовит план дня.',
   items:['Память о тебе и твоих проектах','Разбор почты и календаря','План дня и напоминания']}
];
function courseById(id){for(var k=0;k<COURSES.length;k++)if(COURSES[k].id===id)return COURSES[k];return null}
