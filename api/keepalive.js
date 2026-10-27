// Раз в день Vercel дёргает этот адрес (см. crons в vercel.json):
// один лёгкий запрос к базе, чтобы бесплатный проект Supabase не засыпал.
'use strict';
const db = require('./_lib/db');
const { send } = require('./_lib/util');

module.exports = async (req, res) => {
  try {
    const rows = await db.select('promo_codes', { select: 'code', limit: '1' });
    return send(res, 200, { ok: true, rows: rows.length });
  } catch (e) {
    console.error(e);
    return send(res, 500, { ok: false });
  }
};
