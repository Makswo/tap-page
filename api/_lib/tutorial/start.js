// Шаг 1: заводим заказ и запоминаем метку источника (from). Промокод необязателен; если указан — проверяем (бесплатный код откроет инструкцию без оплаты).
'use strict';
const db = require('../db');
const { normCode, normSrc, send, body } = require('../util');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'method' });
  try {
    const b = body(req);
    const code = normCode(b.code);
    const src = normSrc(b.from);
    if (!code) {
      const [order] = await db.insert('tutorial_orders', { status: 'new', src });
      return send(res, 200, { order: order.id });
    }
    if (code.length < 3) return send(res, 400, { error: 'code' });

    const rows = await db.select('promo_codes', { select: 'code,uses', code: `eq.${code}`, active: 'is.true' });
    if (!rows.length) return send(res, 403, { error: 'code' });

    const [order] = await db.insert('tutorial_orders', { promo: code, status: 'new', src });
    await db.update('promo_codes', { code: `eq.${code}` }, { uses: (rows[0].uses || 0) + 1 });
    return send(res, 200, { order: order.id });
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: 'server' });
  }
};
