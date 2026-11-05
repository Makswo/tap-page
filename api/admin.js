// Панель админа: рассылка «курс открылся» по листу ожидания и воронка по меткам источников.
// GET ?funnel=1&days=30 — воронка; GET — статистика рассылок; POST send — тестовое письмо себе или рассылка; GET ?unsub= — отписка по ссылке из письма.
'use strict';
const db = require('./_lib/db');
const auth = require('./_lib/auth');
const mail = require('./_lib/mail');
const { UUID, send, body, site } = require('./_lib/util');

const COURSES = { nabor: 'Стартовый набор Макса', montage: 'Студия авто-монтажа с ИИ', assistant: 'Свой ИИ-помощник', group: 'Группа «Помощник за 2 недели»' };

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

// Supabase отдаёт не больше 1000 строк за раз — читаем страницами.
async function all(table, filters, max = 50000) {
  const out = [];
  for (let off = 0; off < max; off += 1000) {
    const rows = await db.select(table, { ...filters, limit: '1000', offset: String(off) });
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

// Воронка по меткам: заходы (уникальные браузеры) → начали вопросы → ответили → оплатили 299 → набор.
async function funnel(days) {
  const since = days ? { created_at: `gte.${new Date(Date.now() - days * 864e5).toISOString()}` } : {};
  const [visits, orders] = await Promise.all([
    all('visits', { select: 'vid,src', ...since, order: 'id.asc' }),
    all('tutorial_orders', { select: 'src,status,provider,amount,role:answers->>role', ...since, order: 'created_at.asc' }),
  ]);
  const by = {};
  const row = (src) => by[src || ''] || (by[src || ''] = { src: src || null, vids: new Set(), started: 0, answered: 0, paid: 0, free: 0, revenue: 0, kit: 0 });
  visits.forEach((v) => row(v.src).vids.add(v.vid));
  orders.forEach((o) => {
    const r = row(o.src);
    r.started += 1;
    if (o.role) r.answered += 1;
    if (o.status === 'paid') {
      if (o.provider === 'free' || !Number(o.amount)) r.free += 1;
      else { r.paid += 1; r.revenue += Number(o.amount) || 0; }
    }
  });
  const rows = Object.values(by).map((r) => ({ src: r.src, visitors: r.vids.size, started: r.started, answered: r.answered, paid: r.paid, free: r.free, revenue: Math.round(r.revenue), kit: r.kit }))
    .sort((a, b) => b.revenue - a.revenue || b.started - a.started || b.visitors - a.visitors);
  const total = rows.reduce((t, r) => { Object.keys(t).forEach((k) => { t[k] += r[k]; }); return t; }, { visitors: 0, started: 0, answered: 0, paid: 0, free: 0, revenue: 0, kit: 0 });
  // Уникальные браузеры в итоге считаем по всем заходам, а не суммой строк (один человек мог прийти по двум меткам).
  total.visitors = new Set(visits.map((v) => v.vid)).size;
  return { days, rows, total };
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

    if (req.method === 'GET' && q.funnel) {
      const days = [7, 30, 90].includes(Number(q.days)) ? Number(q.days) : 0;
      return send(res, 200, { funnel: await funnel(days) });
    }
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
