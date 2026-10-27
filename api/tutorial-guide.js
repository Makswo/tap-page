// Шаг 4: выдаём инструкцию — только по оплаченному заказу.
// Для записи экрана в ролик есть предпросмотр по секретному ключу:
// /start?preview=КЛЮЧ&p=role,sphere,pain,dev1+dev2,country,exp,goal,time,mail,style
'use strict';
const crypto = require('crypto');
const db = require('./_lib/db');
const guide = require('./_lib/guide');
const { UUID, send } = require('./_lib/util');

function same(a, b) {
  const x = Buffer.from(String(a)); const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function payload(answers) {
  return { status: 'paid', html: guide.build(answers), style: answers.style, answers };
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') return send(res, 405, { error: 'method' });
  try {
    const q = req.query || {};

    const key = process.env.PREVIEW_KEY;
    if (q.preview) {
      if (!key || !same(q.preview, key)) return send(res, 403, { error: 'preview' });
      const v = String(q.p || '').split(',');
      const a = guide.clean({ role: v[0], sphere: v[1], pain: v[2], dev: String(v[3] || '').split('+'), country: v[4], exp: v[5], goal: v[6], time: v[7], mail: v[8], style: v[9] });
      if (!a) return send(res, 400, { error: 'answers' });
      return send(res, 200, payload(a));
    }

    if (!UUID.test(String(q.order || ''))) return send(res, 400, { error: 'order' });
    const rows = await db.select('tutorial_orders', { select: 'status,answers', id: `eq.${q.order}` });
    if (!rows.length) return send(res, 404, { error: 'order' });
    const o = rows[0];
    if (o.status !== 'paid') return send(res, 200, { status: o.status, hasAnswers: !!o.answers });
    const a = guide.clean(o.answers);
    if (!a) return send(res, 200, { status: 'paid', html: null });
    return send(res, 200, payload(a));
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: 'server' });
  }
};
