// Отметка заказа оплаченным — общая для ЮMoney и ЮKassa.
'use strict';
const db = require('./db');

async function markPaid(order, fields) {
  return db.update('tutorial_orders', { id: `eq.${order}`, status: 'neq.paid' }, {
    status: 'paid',
    paid_at: new Date().toISOString(),
    ...fields,
  });
}

module.exports = { markPaid };
