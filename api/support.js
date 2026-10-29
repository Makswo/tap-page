// ИИ-поддержка: отвечает на вопросы о портале через OpenAI или Claude API.
'use strict';
const crypto = require('crypto');
const db = require('./_lib/db');
const auth = require('./_lib/auth');
const support = require('./_lib/support');
const { UUID, send, body } = require('./_lib/util');

const PER_HOUR = 30, PER_DAY = 120, MAX_LEN = 1500, MAX_TURNS = 16;

function ipHash(req) {
  const ip = String(req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || '').split(',')[0].trim() || 'unknown';
  return crypto.createHash('sha256').update(ip + (process.env.SUPPORT_SALT || 'tap-page')).digest('hex').slice(0, 32);
}

async function context(req, order) {
  const lines = [];
  try {
    const user = await auth.userFrom(req);
    if (user) {
      const [certs, guides] = await Promise.all([
        db.select('certificates', { select: 'course', user_id: `eq.${user.id}` }),
        db.select('tutorial_orders', { select: 'id,paid_at', user_id: `eq.${user.id}`, status: 'eq.paid' }),
      ]);
      lines.push(`Пользователь вошёл в профиль: ${user.email}.`);
      lines.push(`Оплаченных инструкций в профиле: ${guides.length}${guides.length ? ' (ссылки: ' + guides.map((g) => 'https://tap-page.ru/start?order=' + g.id).join(', ') + ')' : ''}.`);
      lines.push(`Кристаллов в профиле: ${certs.length}${certs.length ? ' (' + certs.map((c) => c.course).join(', ') + ')' : ''}.`);
      return { user, text: lines.join('\n') };
    }
    lines.push('Пользователь не вошёл в профиль.');
  } catch (e) { console.warn('support ctx user', e.message); }
  try {
    if (order && UUID.test(order)) {
      const rows = await db.select('tutorial_orders', { select: 'status,answers,paid_at', id: `eq.${order}` });
      if (rows.length) {
        const o = rows[0];
        lines.push(o.status === 'paid'
          ? `На этом устройстве есть ОПЛАЧЕННЫЙ заказ «Как начать с Claude». Его личная ссылка: https://tap-page.ru/start?order=${order}`
          : `На этом устройстве есть начатый, но НЕ оплаченный заказ «Как начать с Claude» (${o.answers ? 'вопросы пройдены' : 'вопросы не пройдены'}). Продолжить: https://tap-page.ru/start`);
      }
    }
  } catch (e) { console.warn('support ctx order', e.message); }
  return { user: null, text: lines.join('\n') };
}

// Провайдер ИИ: OpenAI, если задан OPENAI_API_KEY, иначе Claude (ANTHROPIC_API_KEY).
async function ask(system, msgs) {
  if (process.env.OPENAI_API_KEY) {
    const r = await fetch(`${(process.env.OPENAI_API_URL || 'https://api.openai.com').replace(/\/+$/, '')}/v1/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        max_completion_tokens: 700,
        messages: [{ role: 'system', content: system }].concat(msgs),
      }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`openai ${r.status} ${JSON.stringify(d).slice(0, 300)}`);
    return String((d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || '').trim();
  }
  const r = await fetch(`${(process.env.ANTHROPIC_API_URL || 'https://api.anthropic.com').replace(/\/+$/, '')}/v1/messages`, {
    method: 'POST',
    headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5', max_tokens: 700, system, messages: msgs }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`anthropic ${r.status} ${JSON.stringify(d).slice(0, 300)}`);
  return (d.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n').trim();
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'method' });
  try {
    if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) return send(res, 503, { error: 'off' });
    const b = body(req);
    const msgs = (Array.isArray(b.messages) ? b.messages : []).slice(-MAX_TURNS)
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
      .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_LEN) }));
    while (msgs.length && msgs[0].role !== 'user') msgs.shift();
    if (!msgs.length || msgs[msgs.length - 1].role !== 'user') return send(res, 400, { error: 'messages' });
    const question = msgs[msgs.length - 1].content;

    // Ограничение частоты по IP (храним только хэш).
    const ip = ipHash(req);
    const hour = new Date(Date.now() - 3600e3).toISOString(), day = new Date(Date.now() - 86400e3).toISOString();
    const recent = await db.select('support_messages', { select: 'created_at', ip_hash: `eq.${ip}`, created_at: `gte.${day}`, limit: String(PER_DAY + 1) });
    if (recent.length >= PER_DAY || recent.filter((r) => r.created_at >= hour).length >= PER_HOUR) return send(res, 429, { error: 'rate' });

    const ctx = await context(req, String(b.order || ''));
    let answer;
    try { answer = await ask(support.system(ctx.text), msgs); }
    catch (e) { console.error('ai', e.message); return send(res, 502, { error: 'ai' }); }
    answer = answer || 'Не получилось ответить. Напиши, пожалуйста, на mxmginarm@gmail.com.';

    try { await db.insert('support_messages', { ip_hash: ip, user_id: ctx.user ? ctx.user.id : null, question: question.slice(0, 2000), answer: answer.slice(0, 4000) }); }
    catch (e) { console.warn('support log', e.message); }
    return send(res, 200, { answer });
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: 'server' });
  }
};
