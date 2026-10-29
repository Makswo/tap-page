// Отметка заказа оплаченным — общая для ЮMoney и ЮKassa.
// Сразу после оплаты отправляем покупателю письмо со ссылкой на инструкцию:
// если банк не вернул его на сайт (например, T-Pay), инструкция всё равно под рукой.
'use strict';
const db = require('./db');
const mail = require('./mail');
const { site } = require('./util');

async function sendGuideLink(row) {
  if (!row || !row.email || row.guide_emailed_at || row.provider === 'free' || !process.env.RESEND_API_KEY) return;
  const link = `${site()}/start?order=${row.id}`;
  const m = mail.render({
    subject: 'Твоя инструкция «Как начать с Claude» готова',
    text: 'Спасибо за покупку! Инструкция собрана по твоим ответам и уже ждёт.\n\nСсылка ниже личная — она открывает инструкцию с любого устройства. Не публикуй её.\n\nМакс',
    cta: 'Открыть инструкцию',
    link,
    footer: 'Ты получил это письмо, потому что оплатил инструкцию на tap-page.ru. Вопросы — mxmgin@gmail.com.',
  });
  const r = await mail.sendBatch([{ to: row.email, subject: 'Твоя инструкция «Как начать с Claude» готова', html: m.html, text: m.text }]);
  if (r.ok.length) await db.update('tutorial_orders', { id: `eq.${row.id}` }, { guide_emailed_at: new Date().toISOString() });
}

async function markPaid(order, fields) {
  const rows = await db.update('tutorial_orders', { id: `eq.${order}`, status: 'neq.paid' }, {
    status: 'paid',
    paid_at: new Date().toISOString(),
    ...fields,
  });
  for (const row of rows || []) {
    try { await sendGuideLink(row); } catch (e) { console.warn('guide email', e.message); }
  }
  return rows;
}

module.exports = { markPaid };
