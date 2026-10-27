# tap-page.ru

Одностраничники для мастеров и малого бизнеса. Каждая страница — отдельная папка с `index.html`.

| Адрес | Папка |
|---|---|
| tap-page.ru | `index.html` |
| tap-page.ru/anastasia.gurieva | `anastasia-gurieva/` (адрес задан в `vercel.json`) |
| tap-page.ru/start | `start/` — туториал «Как начать с Claude» (noindex) |

Новая страница: создать папку `имя/index.html`; если адрес должен отличаться от имени папки (например, с точкой), добавить в `rewrites` строку вида `{ "source": "/адрес", "destination": "/папка" }`, затем `git add -A`, `git commit`, `git push` — Vercel обновит сайт сам.

## Туториал /start: промокод и оплата ЮMoney

Путь покупателя: промокод из директа → 10 вопросов → экран анализа → оплата 99 ₽ в ЮMoney → инструкция.
Текст инструкции собирается на сервере (`api/_lib/guide.js`) и отдаётся только оплаченным заказам.

| Файл | Что делает |
|---|---|
| `api/tutorial-start.js` | проверяет промокод, создаёт заказ |
| `api/tutorial-answers.js` | сохраняет ответы, отдаёт данные формы оплаты |
| `api/yoomoney.js` | принимает уведомление ЮMoney, проверяет подпись, отмечает заказ оплаченным |
| `api/tutorial-guide.js` | отдаёт инструкцию по оплаченному заказу (и предпросмотр по ключу) |
| `supabase/tutorial.sql` | таблицы `promo_codes` и `tutorial_orders` |

Переменные окружения в Vercel (Settings → Environment Variables):
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `YOOMONEY_WALLET` (номер кошелька), `YOOMONEY_SECRET` (секрет из настроек HTTP-уведомлений), `PREVIEW_KEY` (любая длинная строка), необязательно `TUTORIAL_PRICE` (по умолчанию 99).

Уведомления ЮMoney: yoomoney.ru/transfer/myservices/http-notification → адрес `https://tap-page.ru/api/yoomoney`.

Сменить промокод: в Supabase добавить строку в `promo_codes` (код ЗАГЛАВНЫМИ), у старой поставить `active = false`, поменять текст автоответа в Glocal.

Предпросмотр без оплаты (для записи экрана): `tap-page.ru/start?preview=PREVIEW_KEY&p=biz,Салон,mail,iphone+mac,ru,never,time,m5,google,steps`
### Встроенная оплата ЮKassa
Если заданы `YOOKASSA_SHOP_ID` и `YOOKASSA_SECRET_KEY`, на экране оплаты показывается встроенная форма ЮKassa (карта, СБП, SberPay, T-Pay) прямо на странице. Кошелёк ЮMoney остаётся запасной ссылкой.
- Уведомления ЮKassa: Интеграция → HTTP-уведомления → `https://tap-page.ru/api/yookassa`, событие `payment.succeeded`.
- Чеки по 54-ФЗ для ИП (не НПД): `YOOKASSA_RECEIPTS=1` (покупатель вводит email), `YOOKASSA_VAT_CODE` — код НДС (по умолчанию 1, «без НДС»).
- Оферта: `oferta/index.html` → tap-page.ru/oferta.
