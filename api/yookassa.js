// Уведомления ЮKassa (Интеграция → HTTP-уведомления):
// адрес https://tap-page.ru/api/yookassa, событие payment.succeeded.
// Самому уведомлению не верим: берём id платежа и спрашиваем статус у ЮKassa.
'use strict';
const yk = require('./_lib/yookassa');
const { markPaid } = require('./_lib/orders');
const { UUID, price, body } = require('./_lib/util');

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.statusCode = 200; return res.end('ok'); }
  try {
    const b = body(req);
    const id = b && b.object && b.object.id;
    if (!yk.enabled() || !id || !['payment.succeeded', 'payment.canceled'].includes(b.event)) { res.statusCode = 200; return res.end('ok: skip'); }

    const p = await yk.getPayment(String(id));
    // Платежи Glocal идут через этот же магазин ЮKassa, а адрес уведомлений
    // у магазина один. Их узнаём по metadata.payment_id и пересылаем в Glocal —
    // он сам перепроверит платёж в ЮKassa.
    if (p.metadata && p.metadata.payment_id && !p.metadata.order_id) {
      const to = process.env.GLOCAL_WEBHOOK_URL || 'https://glocal.pixelharbor.games/api/pay/yookassa';
      const r = await fetch(to, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
      if (!r.ok) throw new Error(`Glocal webhook ${r.status}`);
      res.statusCode = 200; return res.end('ok: glocal');
    }
    const order = String((p.metadata && p.metadata.order_id) || '');
    if (!UUID.test(order)) { res.statusCode = 200; return res.end('ok: no order'); }
    if (!yk.isPaid(p, order, price())) { res.statusCode = 200; return res.end('ok: not paid'); }

    await markPaid(order, { provider: 'yookassa', payment_id: p.id, amount: Number(p.amount.value), withdraw_amount: Number(p.amount.value), operation_id: p.id });
    res.statusCode = 200; return res.end('ok');
  } catch (e) {
    console.error(e);
    // 500 — ЮKassa повторит уведомление позже.
    res.statusCode = 500; return res.end('error');
  }
};
