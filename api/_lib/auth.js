// Вход по коду на почту через Supabase Auth. Все запросы идут с сервера,
// чтобы браузер общался только с нашим доменом.
'use strict';
const { cfg } = require('./db');

function headers(token) {
  const { key } = cfg();
  const h = { apikey: key, 'Content-Type': 'application/json' };
  if (token) h.Authorization = `Bearer ${token}`;
  else if (!key.startsWith('sb_')) h.Authorization = `Bearer ${key}`;
  return h;
}

async function call(path, body, token, method) {
  const { url } = cfg();
  const res = await fetch(`${url}/auth/v1/${path}`, {
    method: method || 'POST',
    headers: headers(token),
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch (e) { data = { raw: text.slice(0, 200) }; }
  return { ok: res.ok, status: res.status, data };
}

function session(d) {
  return {
    access_token: d.access_token,
    refresh_token: d.refresh_token,
    expires_at: d.expires_at || Math.floor(Date.now() / 1000) + Number(d.expires_in || 3600),
  };
}

// Пользователь по токену из заголовка Authorization: Bearer ...
async function userFrom(req) {
  const h = String((req.headers && (req.headers.authorization || req.headers.Authorization)) || '');
  const m = h.match(/^Bearer\s+(\S+)$/i);
  if (!m) return null;
  const r = await call('user', null, m[1], 'GET');
  if (!r.ok || !r.data || !r.data.id) return null;
  return { id: r.data.id, email: r.data.email || '' };
}

module.exports = { call, session, userFrom };
