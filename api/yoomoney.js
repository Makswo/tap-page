// Шаг 3: ЮMoney присылает HTTP-уведомление о переводе.
// Адрес для настроек кошелька: https://tap-page.ru/api/yoomoney
// Подпись: поле sign (HMAC-SHA256, все параметры кроме sign по алфавиту,
// значения в URL-кодировке, ключ — секрет из настроек уведомлений).
// Старое поле sha1_hash проверяем, только если sign не пришёл.
'use strict';
const crypto = require('crypto');
const { markPaid } = require('./_lib/orders');
const { UUID, price } = require('./_lib/util');

function enc(v) {
  return encodeURIComponent(v).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function signString(p) {
  return Object.keys(p).filter((k) => k !== 'sign').sort()
    .map((k) => `${k}=${enc(p[k] == null ? '' : String(p[k]))}`).join('&');
}

function eqHex(a, b) {
  const x = Buffer.from(String(a || '').toLowerCase()); const y = Buffer.from(String(b || '').toLowerCase());
  return x.length > 0 && x.length === y.length && crypto.timingSafeEqual(x, y);
}

function verify(p, secret) {
  if (p.sign) {
    const mac = crypto.createHmac('sha256', secret).update(signString(p), 'utf8').digest('hex');
    return eqHex(mac, p.sign);
  }
  if (p.sha1_hash) {
    const s = [p.notification_type, p.operation_id, p.amount, p.currency, p.datetime, p.sender, p.codepro, secret, p.label].join('&');
    return eqHex(crypto.createHash('sha1').update(s, 'utf8').digest('hex'), p.sha1_hash);
  }
  return false;
}

function params(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return Object.fromEntries(new URLSearchParams(req.body));
  return {};
}

async function handler(req, res) {
  if (req.method !== 'POST') { res.statusCode = 200; return res.end('ok'); }
  const secret = process.env.YOOMONEY_SECRET;
  const p = params(req);
  if (!secret || !verify(p, secret)) {
    console.warn('yoomoney: bad signature', p.operation_id);
    res.statusCode = 400; return res.end('bad sign');
  }
  try {
    const label = String(p.label || '');
    const paid = Number(p.withdraw_amount || p.amount || 0);
    if (!UUID.test(label)) { res.statusCode = 200; return res.end('ok: no label'); }
    if (p.codepro === 'true' || p.unaccepted === 'true') { res.statusCode = 200; return res.end('ok: held'); }
    if (paid + 0.001 < price()) {
      console.warn('yoomoney: underpaid', label, paid);
      res.statusCode = 200; return res.end('ok: underpaid');
    }
    await markPaid(label, {
      provider: 'yoomoney',
      amount: Number(p.amount || 0),
      withdraw_amount: paid,
      operation_id: String(p.operation_id || ''),
    });
    res.statusCode = 200; return res.end('ok');
  } catch (e) {
    console.error(e);
    res.statusCode = 500; return res.end('error');
  }
}

module.exports = handler;
module.exports.verify = verify;
module.exports.signString = signString;
