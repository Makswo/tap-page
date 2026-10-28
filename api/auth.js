// Вход по коду на почту: otp — отправить код, verify — проверить, refresh — продлить сессию.
'use strict';
const auth = require('./_lib/auth');
const { send, body } = require('./_lib/util');

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'method' });
  try {
    const b = body(req);
    const email = String(b.email || '').trim().toLowerCase().slice(0, 200);

    if (b.action === 'otp') {
      if (!EMAIL.test(email)) return send(res, 400, { error: 'email' });
      const r = await auth.call('otp', { email, create_user: true });
      if (r.status === 429) return send(res, 429, { error: 'rate' });
      if (!r.ok) { console.error('otp', r.status, r.data); return send(res, 502, { error: 'send' }); }
      return send(res, 200, { ok: true });
    }

    if (b.action === 'verify') {
      const code = String(b.code || '').replace(/\D/g, '');
      if (!EMAIL.test(email) || code.length < 6 || code.length > 10) return send(res, 400, { error: 'code' });
      const r = await auth.call('verify', { type: 'email', email, token: code });
      if (r.status === 429) return send(res, 429, { error: 'rate' });
      if (!r.ok || !r.data.access_token) return send(res, 400, { error: 'code' });
      return send(res, 200, { session: auth.session(r.data), user: { id: r.data.user.id, email: r.data.user.email } });
    }

    if (b.action === 'refresh') {
      const t = String(b.refresh_token || '');
      if (!t) return send(res, 400, { error: 'token' });
      const r = await auth.call('token?grant_type=refresh_token', { refresh_token: t });
      if (!r.ok || !r.data.access_token) return send(res, 401, { error: 'expired' });
      return send(res, 200, { session: auth.session(r.data), user: { id: r.data.user.id, email: r.data.user.email } });
    }

    return send(res, 400, { error: 'action' });
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: 'server' });
  }
};
