// Заход на страницу: метка источника и анонимный id браузера — для воронки в админке.
// Без IP и без личных данных. Шлётся из assets/src.js (sendBeacon) один раз за сессию на страницу.
'use strict';
const db = require('../db');
const { normSrc, send, body } = require('../util');

const PAGES = ['home', 'start', 'me', 'kit', 'group', 'pro', 'other'];
const VID = /^[a-z0-9]{8,32}$/;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'method' });
  try {
    const b = body(req);
    const vid = String(b.vid || '');
    if (!VID.test(vid)) return send(res, 400, { error: 'vid' });
    const page = PAGES.includes(b.page) ? b.page : 'other';
    await db.insert('visits', { vid, page, src: normSrc(b.from) });
    return send(res, 200, { ok: true });
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: 'server' });
  }
};
