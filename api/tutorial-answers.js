// Шаг 2: сохраняем ответы и отдаём данные для формы оплаты ЮMoney.
'use strict';
const db = require('./_lib/db');
const guide = require('./_lib/guide');
const yk = require('./_lib/yookassa');
const { markPaid } = require('./_lib/orders');
const { UUID, price, site, send, body } = require('./_lib/util');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'method' });
  try {
    const b = body(req);
    if (!UUID.test(String(b.order || ''))) return send(res, 400, { error: 'order' });
    const answers = guide.clean(b.answers);
    if (!answers) return send(res, 400, { error: 'answers' });

    const rows = await db.select('tutorial_orders', { select: 'id,status,promo', id: `eq.${b.order}` });
    if (!rows.length) return send(res, 404, { error: 'order' });
    await db.update('tutorial_orders', { id: `eq.${b.order}` }, { answers });

    // Бесплатный промокод (promo_codes.free = true): заказ сразу считается оплаченным.
    if (rows[0].status !== 'paid' && rows[0].promo) {
      const promo = await db.select('promo_codes', { select: 'free', code: `eq.${rows[0].promo}`, active: 'is.true' });
      if (promo.length && promo[0].free) {
        await markPaid(b.order, { provider: 'free', amount: 0, withdraw_amount: 0 });
        return send(res, 200, { paid: true, teaser: guide.teaser(answers), price: 0 });
      }
    }

    const wallet = process.env.YOOMONEY_WALLET;
    if (!wallet && !yk.enabled()) throw new Error('No payment provider: set YOOKASSA_* or YOOMONEY_WALLET');
    return send(res, 200, {
      paid: rows[0].status === 'paid',
      teaser: guide.teaser(answers),
      price: price(),
      provider: yk.enabled() ? 'yookassa' : 'yoomoney',
      needEmail: yk.enabled() && yk.receipts(),
      // Кошелёк ЮMoney — запасной способ, если он настроен.
      pay: wallet ? {
        action: 'https://yoomoney.ru/quickpay/confirm',
        receiver: wallet,
        'quickpay-form': 'button',
        sum: price().toFixed(2),
        label: b.order,
        successURL: `${site()}/start?order=${b.order}`,
      } : null,
    });
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: 'server' });
  }
};
