// Профиль: GET — мои сертификаты, инструкции и лист ожидания;
// POST claim — привязать оплаченную инструкцию к профилю; POST waitlist — сообщить о старте курса.
'use strict';
const db = require('./_lib/db');
const auth = require('./_lib/auth');
const { UUID, send, body } = require('./_lib/util');

// Курсы, которые пока «скоро» (на них можно подписаться).
const SOON = ['nabor', 'montage', 'assistant'];

async function certFor(user, order) {
  const have = await db.select('certificates', { select: 'id,course,order_id,created_at', user_id: `eq.${user.id}`, course: 'eq.start' });
  if (have.length) return have[0];
  const ins = await db.insertIgnore('certificates', { user_id: user.id, course: 'start', order_id: order });
  if (ins.length) return ins[0];
  const again = await db.select('certificates', { select: 'id,course,order_id,created_at', user_id: `eq.${user.id}`, course: 'eq.start' });
  return again[0] || null;
}

module.exports = async (req, res) => {
  try {
    const user = await auth.userFrom(req);
    if (!user) return send(res, 401, { error: 'auth' });

    if (req.method === 'GET') {
      const [certs, orders, wait] = await Promise.all([
        db.select('certificates', { select: 'course,order_id,created_at', user_id: `eq.${user.id}`, order: 'created_at.asc' }),
        db.select('tutorial_orders', { select: 'id,answers,paid_at', user_id: `eq.${user.id}`, status: 'eq.paid', order: 'paid_at.desc' }),
        db.select('waitlist', { select: 'course', user_id: `eq.${user.id}` }),
      ]);
      return send(res, 200, {
        user,
        admin: auth.isAdmin(user),
        certificates: certs,
        guides: orders.map((o) => ({ id: o.id, paid_at: o.paid_at, role: o.answers && o.answers.role, sphere: o.answers && o.answers.sphere })),
        waitlist: wait.map((w) => w.course),
      });
    }

    if (req.method !== 'POST') return send(res, 405, { error: 'method' });
    const b = body(req);

    if (b.action === 'claim') {
      if (!UUID.test(String(b.order || ''))) return send(res, 400, { error: 'order' });
      const rows = await db.select('tutorial_orders', { select: 'id,status,user_id', id: `eq.${b.order}` });
      if (!rows.length) return send(res, 404, { error: 'order' });
      const o = rows[0];
      if (o.status !== 'paid') return send(res, 409, { error: 'unpaid' });
      if (o.user_id && o.user_id !== user.id) return send(res, 403, { error: 'other' });
      if (!o.user_id) await db.update('tutorial_orders', { id: `eq.${o.id}`, user_id: 'is.null' }, { user_id: user.id });
      const cert = await certFor(user, o.id);
      return send(res, 200, { ok: true, certificate: cert });
    }

    if (b.action === 'waitlist') {
      const course = String(b.course || '');
      if (!SOON.includes(course)) return send(res, 400, { error: 'course' });
      await db.insertIgnore('waitlist', { user_id: user.id, course, email: user.email });
      return send(res, 200, { ok: true });
    }

    return send(res, 400, { error: 'action' });
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: 'server' });
  }
};
