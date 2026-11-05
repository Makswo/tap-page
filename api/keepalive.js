// Раз в день Vercel дёргает этот адрес (см. crons в vercel.json):
// лёгкий запрос к базе, чтобы бесплатный проект Supabase не засыпал,
// и письма после покупки (через 24 и 72 часа, только с согласием) — см. _lib/followups.js.
'use strict';
const db = require('./_lib/db');
const followups = require('./_lib/followups');
const { send } = require('./_lib/util');

module.exports = async (req, res) => {
  // Vercel подписывает вызовы cron заголовком Authorization: Bearer CRON_SECRET (если секрет задан).
  const secret = process.env.CRON_SECRET;
  const cron = !secret || String(req.headers && req.headers.authorization) === `Bearer ${secret}`;
  try {
    const rows = await db.select('promo_codes', { select: 'code', limit: '1' });
    let mails = null;
    if (cron) { try { mails = await followups.run(); } catch (e) { console.error('followups', e); mails = { error: e.message }; } }
    return send(res, 200, { ok: true, rows: rows.length, mails });
  } catch (e) {
    console.error(e);
    return send(res, 500, { ok: false });
  }
};
