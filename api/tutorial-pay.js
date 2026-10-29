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

    // Телефон (mode=redirect): страница ЮKassa только с выбранным способом — карта или СБП.
    // ЮKassa разрешает один способ оплаты только так; во встроенном виджете показываются все способы,
    // в том числе T-Pay, после которого банк не возвращает покупателя на сайт.
    // Компьютер: встроенный виджет со всеми способами.
    const redirect = b.mode === 'redirect';
    const method = redirect && ['bank_card', 'sbp'].includes(b.method) ? b.method : null;
    const p = await yk.createPayment({ order, price: price(), email, method, returnUrl: redirect ? `${site()}/start?order=${order}` : null });
    await db.update('tutorial_orders', { id: `eq.${order}` }, { provider: 'yookassa', payment_id: p.id, ...(email ? { email } : {}) });
    if (redirect) return send(res, 200, { url: p.confirmation && p.confirmation.confirmation_url });
    return send(res, 200, { token: p.confirmation && p.confirmation.confirmation_token });
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: 'server' });
  }
};
