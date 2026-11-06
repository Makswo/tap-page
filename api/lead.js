// Заявки без входа: анкета предзаписи в группу (/group), позже — «под ключ» (/pro).
// Защита от спама: скрытое поле-ловушка и не больше 5 заявок в сутки с одного IP (храним только хэш).
// О каждой заявке пишем админу на почту (ADMIN_EMAILS).
'use strict';
const crypto = require('crypto');
const db = require('./_lib/db');
const auth = require('./_lib/auth');
const mail = require('./_lib/mail');
const { normSrc, send, body, site } = require('./_lib/util');

const KINDS = { group: 'Группа «ИИ под твою работу за 2 недели»', pro: 'Под ключ' };
const DEV = ['iphone', 'android', 'win', 'mac'];
const COUNTRY = ['ru', 'cis', 'world', 'unsure'];
const PER_DAY = 5;

function ipHash(req) {
  const ip = String(req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || '').split(',')[0].trim() || 'unknown';
  return crypto.createHash('sha256').update(ip + (process.env.SUPPORT_SALT || 'tap-page')).digest('hex').slice(0, 32);
}
function str(v, max) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max); }
function text(v, max) { return String(v == null ? '' : v).replace(/\r/g, '').trim().slice(0, max); }

// Чистим анкету; null — если чего-то обязательного нет.
function clean(b) {
  const kind = KINDS[b.kind] ? b.kind : null;
  const name = str(b.name, 80);
  const contact = str(b.contact, 120);
  const work = text(b.work, 600);
  const want = text(b.want, 1200);
  const dev = (Array.isArray(b.dev) ? b.dev : []).filter((d) => DEV.includes(d)).slice(0, 4);
  const country = COUNTRY.includes(b.country) ? b.country : null;
  if (!kind || name.length < 2 || contact.length < 3 || work.length < 3 || want.length < 3) return null;
  if (kind === 'group' && (!dev.length || !country)) return null;
  return { kind, name, contact, work, want, dev, country };
}

async function notify(lead) {
  if (!process.env.RESEND_API_KEY) return;
  const to = String(process.env.ADMIN_EMAILS || 'mxmgin@gmail.com').split(/[,\s]+/).filter(Boolean)[0];
  const subject = `Новая заявка: ${KINDS[lead.kind]} — ${lead.name}`;
  const t = `Имя: ${lead.name}\nКонтакт: ${lead.contact}${lead.email ? `\nПочта профиля: ${lead.email}` : ''}\n\nЧем занимается:\n${lead.work}\n\nКакие задачи хочет отдать ИИ:\n${lead.want}` +
    (lead.dev && lead.dev.length ? `\n\nУстройства: ${lead.dev.join(', ')}` : '') + (lead.country ? `\nСтрана: ${lead.country}` : '') + (lead.src ? `\nМетка: ${lead.src}` : '');
  const m = mail.render({ subject, text: t, cta: 'Открыть заявки', link: `${site()}/me#leads`, footer: 'Служебное письмо tap-page.ru: пришла новая заявка.' });
  await mail.sendBatch([{ to, subject, html: m.html, text: m.text }]);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'method' });
  try {
    const b = body(req);
    // Ловушка для ботов: человек это поле не видит. Отвечаем «ок», ничего не сохраняя.
    if (b.website) return send(res, 200, { ok: true });
    if (b.consent !== true) return send(res, 400, { error: 'consent' });
    const lead = clean(b);
    if (!lead) return send(res, 400, { error: 'fields' });

    const ip = ipHash(req);
    const day = new Date(Date.now() - 864e5).toISOString();
    const recent = await db.select('leads', { select: 'id', ip_hash: `eq.${ip}`, created_at: `gte.${day}`, limit: String(PER_DAY + 1) });
    if (recent.length >= PER_DAY) return send(res, 429, { error: 'limit' });

    let user = null;
    try { user = await auth.userFrom(req); } catch (e) { user = null; }
    const row = { ...lead, src: normSrc(b.from), ip_hash: ip, user_id: user ? user.id : null, email: user ? user.email : null, status: 'new' };
    const [saved] = await db.insert('leads', row);
    try { await notify(row); } catch (e) { console.warn('lead notify', e.message); }
    return send(res, 200, { ok: true, id: saved && saved.id });
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: 'server' });
  }
};
module.exports.clean = clean;
