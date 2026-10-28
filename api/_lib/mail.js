// Письма через Resend: шаблон анонса курса и пакетная отправка.
'use strict';
const crypto = require('crypto');
const { cfg } = require('./db');
const { site } = require('./util');

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

// Подпись для ссылки «отписаться»: без входа, но подделать нельзя.
function unsubToken(userId, course) {
  const secret = process.env.UNSUB_SECRET || cfg().key;
  return crypto.createHmac('sha256', secret).update(`${userId}:${course}`).digest('hex').slice(0, 32);
}
function unsubUrl(userId, course) {
  return `${site()}/api/admin?unsub=${encodeURIComponent(userId)}&c=${encodeURIComponent(course)}&t=${unsubToken(userId, course)}`;
}

function render({ subject, text, cta, link, unsub }) {
  const paras = String(text || '').split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px;font-size:16px;line-height:1.55;color:#2b2f33">${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f3f4ef">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4ef;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:18px;padding:28px 26px;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif">
<tr><td style="padding-bottom:18px"><span style="display:inline-block;width:30px;height:30px;line-height:30px;text-align:center;border-radius:9px;background:#d4ff3f;color:#0b0e00;font-weight:800;font-size:15px">M</span>
<span style="font-weight:800;font-size:16px;color:#0b0e00;vertical-align:middle;margin-left:8px">makswo</span></td></tr>
<tr><td><h1 style="margin:0 0 14px;font-size:24px;line-height:1.2;color:#0b0e00">${esc(subject)}</h1>${paras}
${link ? `<p style="margin:22px 0 6px"><a href="${esc(link)}" style="display:inline-block;background:#d4ff3f;color:#0b0e00;text-decoration:none;font-weight:700;font-size:15px;padding:13px 24px;border-radius:999px">${esc(cta || 'Открыть курс')}</a></p>` : ''}
</td></tr>
<tr><td style="padding-top:22px;border-top:1px solid #eceee6;font-size:12px;line-height:1.5;color:#8a8f86">Ты получил это письмо, потому что нажал «Сообщить о старте» на tap-page.ru.${unsub ? ` <a href="${esc(unsub)}" style="color:#8a8f86">Отписаться</a>` : ''}<br>ИП Малыгин Максим Валерьевич · mxmgin@gmail.com</td></tr>
</table></td></tr></table></body></html>`;
  const plain = `${subject}\n\n${text}\n\n${link ? `${cta || 'Открыть курс'}: ${link}\n\n` : ''}${unsub ? `Отписаться: ${unsub}` : ''}`;
  return { html, text: plain };
}

// Отправка пачками по 100 через Resend. items: [{to, subject, html, text, unsub}]
async function sendBatch(items) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY is missing');
  const from = process.env.MAIL_FROM || 'tap-page <no-reply@tap-page.ru>';
  const ok = [], bad = [];
  for (let i = 0; i < items.length; i += 100) {
    const chunk = items.slice(i, i + 100);
    const r = await fetch(`${(process.env.RESEND_API_URL || 'https://api.resend.com').replace(/\/+$/, '')}/emails/batch`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(chunk.map((m) => ({
        from, to: [m.to], subject: m.subject, html: m.html, text: m.text,
        headers: m.unsub ? { 'List-Unsubscribe': `<${m.unsub}>` } : undefined,
      }))),
    });
    if (r.ok) ok.push(...chunk); else { console.error('resend', r.status, (await r.text()).slice(0, 300)); bad.push(...chunk); }
  }
  return { ok, bad };
}

module.exports = { render, sendBatch, unsubUrl, unsubToken };
