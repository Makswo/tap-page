// Панель админа: рассылка «курс открылся» по листу ожидания.
// GET — статистика; POST send — тестовое письмо себе или рассылка; GET ?unsub= — отписка по ссылке из письма.
'use strict';
const db = require('./_lib/db');
const auth = require('./_lib/auth');
const mail = require('./_lib/mail');
const { UUID, send, body, site } = require('./_lib/util');

const COURSES = { nabor: 'Стартовый набор Макса', montage: 'Студия авто-монтажа в Claude', assistant: 'Личный помощник в Claude' };

function page(res, title, text) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<body style="margin:0;background:#08090a;color:#f1f4ec;font:16px/1.5 -apple-system,Segoe UI,Roboto,Arial,sans-serif;display:grid;place-items:center;min-height:100vh;padding:16px">
<div style="max-width:420px;text-align:center"><div style="width:44px;height:44px;margin:0 auto 16px;border-radius:13px;background:#d4ff3f;color:#0b0e00;font-weight:800;display:grid;place-items:center">M</div>
<h1 style="font-size:24px;margin:0 0 8px">${title}</h1><p style="color:#a3a9a0;margin:0 0 20px">${text}</p><a href="${site()}/" style="color:#d4ff3f">tap-page.ru</a></div></body>`);
}

async function stats() {
  const [rows, hist] = await Promise.all([
    db.select('waitlist', { select: 'course,email,created_at,notified_at', order: 'created_at.desc', limit: '5000' }),
    db.select('announcements', { select: 'created_at,course,subject,sent,failed,test', order: 'created_at.desc', limit: '20' }),
  ]);
  const courses = Object.keys(COURSES).map((id) => {
    const list = rows.filter((r) => r.course === id);
    return { id, title: COURSES[id], total: list.length, pending: list.filter((r) => !r.notified_at).length,
      emails: list.slice(0, 200).map((r) => ({ email: r.email, at: r.created_at, notified: !!r.notified_at })) };
  });
  return { courses, history: hist };
}

module.exports = async (req, res) => {
  try {
    const q = req.query || {};
    // Отписка по ссылке из письма — без входа, по подписи.
    if (req.method === 'GET' && q.unsub) {
      const ok = UUID.test(String(q.unsub)) && COURSES[q.c] && String(q.t || '') === mail.unsubToken(q.unsub, q.c);
      if (!ok) return page(res, 'Ссылка не подошла', 'Возможно, она устарела. Напиши на mxmginarm@gmail.com — отпишем вручную.');
      await db.remove('waitlist', { user_id: `eq.${q.unsub}`, course: `eq.${q.c}` });
      return page(res, 'Готово, ты отписан', `Больше не пришлём писем о курсе «${COURSES[q.c]}».`);
    }

    const user = await auth.userFrom(req);
    if (!user) return send(res, 401, { error: 'auth' });
    if (!auth.isAdmin(user)) return send(res, 403, { error: 'admin' });

    if (req.method === 'GET') return send(res, 200, { ...(await stats()), mail: !!process.env.RESEND_API_KEY });
    if (req.method !== 'POST') return send(res, 405, { error: 'method' });

    const b = body(req);
    if (b.action !== 'send') return send(res, 400, { error: 'action' });
    const course = String(b.course || '');
    if (!COURSES[course]) return send(res, 400, { error: 'course' });
    const subject = String(b.subject || '').trim().slice(0, 150);
    const text = String(b.text || '').trim().slice(0, 4000);
    const cta = String(b.cta || 'Открыть курс').trim().slice(0, 40);
    const link = String(b.link || '').trim().slice(0, 300);
    if (!subject || !text) return send(res, 400, { error: 'empty' });
    if (link && !/^https:\/\//.test(link)) return send(res, 400, { error: 'link' });
    if (!process.env.RESEND_API_KEY) return send(res, 503, { error: 'mail' });

    if (b.test) {
      const m = mail.render({ subject, text, cta, link, unsub: null });
      const r = await mail.sendBatch([{ to: user.email, subject: `[Тест] ${subject}`, html: m.html, text: m.text }]);
      await db.insert('announcements', { course, subject, sent: r.ok.length, failed: r.bad.length, test: true, sent_by: user.email });
      return send(res, 200, { ok: !!r.ok.length, sent: r.ok.length, failed: r.bad.length, to: user.email });
    }

    const pending = await db.select('waitlist', { select: 'user_id,email', course: `eq.${course}`, notified_at: 'is.null', limit: '1000' });
    const items = pending.filter((p) => p.email).map((p) => {
      const unsub = mail.unsubUrl(p.user_id, course);
      const m = mail.render({ subject, text, cta, link, unsub });
      return { to: p.email, subject, html: m.html, text: m.text, unsub, user_id: p.user_id };
    });
    if (!items.length) return send(res, 409, { error: 'none' });
    const r = await mail.sendBatch(items);
    const now = new Date().toISOString();
    for (let i = 0; i < r.ok.length; i += 100) {
      const ids = r.ok.slice(i, i + 100).map((x) => x.user_id).join(',');
      await db.update('waitlist', { course: `eq.${course}`, user_id: `in.(${ids})` }, { notified_at: now });
    }
    await db.insert('announcements', { course, subject, sent: r.ok.length, failed: r.bad.length, test: false, sent_by: user.email });
    return send(res, 200, { ok: true, sent: r.ok.length, failed: r.bad.length });
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: 'server' });
  }
};
