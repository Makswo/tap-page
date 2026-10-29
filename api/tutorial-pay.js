// Создаёт платёж в ЮKassa: токен для встроенного виджета или ссылку на страницу оплаты (mode=redirect, телефоны).
'use strict';
const db = require('./_lib/db');
const yk = require('./_lib/yookassa');
const { markPaid } = require('./_lib/orders');
const { UUID, price, site, send, body } = require('./_lib/util');

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'method' });
  try {
    if (!yk.enabled()) return send(res, 400, { error: 'disabled' });
    const b = body(req);
    const order = String(b.order || '');
    if (!UUID.test(order)) return send(res, 400, { error: 'order' });

    const rows = await db.select('tutorial_orders', { select: 'status,answers,payment_id', id: `eq.${order}` });
    if (!rows.length) return send(res, 404, { error: 'order' });
    const o = rows[0];
    if (o.status === 'paid') return send(res, 200, { paid: true });
    if (!o.answers) return send(res, 400, { error: 'answers' });

    // Прошлый платёж мог пройти, а уведомление — ещё не дойти.
    if (o.payment_id) {
      try {
        const prev = await yk.getPayment(o.payment_id);
        if (yk.isPaid(prev, order, price())) {
          await markPaid(order, { provider: 'yookassa', amount: Number(prev.amount.value), withdraw_amount: Number(prev.amount.value), operation_id: prev.id });
          return send(res, 200, { paid: true });
        }
      } catch (e) { console.warn('yookassa: previous payment check failed', e.message); }
    }

    let email = '';
    if (yk.receipts()) {
      email = String(b.email || '').trim().slice(0, 120);
      if (!EMAIL.test(email)) return send(res, 400, { error: 'email' });
    }

    const redirect = b.mode === 'redirect';
    const method = ['bank_card', 'sbp'].includes(b.method) ? b.method : null;
    const returnUrl = redirect ? `${site()}/start?order=${order}` : null;
    let p, single = !!method;
    try {
      p = await yk.createPayment({ order, price: price(), email, method, returnUrl });
    } catch (e) {
      // ЮKassa может не разрешить выбор одного способа для виджета — тогда создаём обычный платёж.
      if (!method || !(e.status >= 400 && e.status < 500)) throw e;
      console.warn('yookassa: single method rejected, fallback', e.message);
      p = await yk.createPayment({ order, price: price(), email, returnUrl });
      single = false;
    }
    await db.update('tutorial_orders', { id: `eq.${order}` }, { provider: 'yookassa', payment_id: p.id, ...(email ? { email } : {}) });
    if (redirect) return send(res, 200, { url: p.confirmation && p.confirmation.confirmation_url });
    return send(res, 200, { token: p.confirmation && p.confirmation.confirmation_token, single });
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: 'server' });
  }
};
