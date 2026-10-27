// Шаг 2: сохраняем ответы и отдаём данные для формы оплаты ЮMoney.
'use strict';
const db = require('./_lib/db');
const guide = require('./_lib/guide');
const { UUID, price, site, send, body } = require('./_lib/util');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'method' });
  try {
    const b = body(req);
    if (!UUID.test(String(b.order || ''))) return send(res, 400, { error: 'order' });
    const answers = guide.clean(b.answers);
    if (!answers) return send(res, 400, { error: 'answers' });

    const rows = await db.select('tutorial_orders', { select: 'id,status', id: `eq.${b.order}` });
    if (!rows.length) return send(res, 404, { error: 'order' });
    await db.update('tutorial_orders', { id: `eq.${b.order}` }, { answers });

    const wallet = process.env.YOOMONEY_WALLET;
    if (!wallet) throw new Error('YOOMONEY_WALLET is missing');
    return send(res, 200, {
      paid: rows[0].status === 'paid',
      teaser: guide.teaser(answers),
      price: price(),
      pay: {
        action: 'https://yoomoney.ru/quickpay/confirm',
        receiver: wallet,
        'quickpay-form': 'button',
        sum: price().toFixed(2),
        label: b.order,
        successURL: `${site()}/start?order=${b.order}`,
      },
    });
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: 'server' });
  }
};
