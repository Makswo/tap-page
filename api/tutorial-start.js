// Шаг 1: заводим заказ. Промокод необязателен; если указан — проверяем (бесплатный код откроет инструкцию без оплаты).
'use strict';
const db = require('./_lib/db');
const { normCode, send, body } = require('./_lib/util');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'method' });
  try {
    const code = normCode(body(req).code);
    if (!code) {
      const [order] = await db.insert('tutorial_orders', { status: 'new' });
      return send(res, 200, { order: order.id });
    }
    if (code.length < 3) return send(res, 400, { error: 'code' });

    const rows = await db.select('promo_codes', { select: 'code,uses', code: `eq.${code}`, active: 'is.true' });
    if (!rows.length) return send(res, 403, { error: 'code' });

    const [order] = await db.insert('tutorial_orders', { promo: code, status: 'new' });
    await db.update('promo_codes', { code: `eq.${code}` }, { uses: (rows[0].uses || 0) + 1 });
    return send(res, 200, { order: order.id });
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: 'server' });
  }
};
