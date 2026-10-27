'use strict';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function price() {
  const p = Number(process.env.TUTORIAL_PRICE || 99);
  return Number.isFinite(p) && p > 0 ? p : 99;
}

function site() {
  return (process.env.SITE_URL || 'https://tap-page.ru').replace(/\/+$/, '');
}

// Промокод без разницы в регистре, пробелах и «ё».
function normCode(s) {
  return String(s || '').toUpperCase().replace(/Ё/g, 'Е').replace(/\s+/g, '').slice(0, 40);
}

function send(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

function body(req) {
  const b = req.body;
  if (!b) return {};
  if (typeof b === 'string') {
    try { return JSON.parse(b); } catch (e) { return {}; }
  }
  return b;
}

module.exports = { UUID, price, site, normCode, send, body };
