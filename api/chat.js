// Общий чат: сообщения участников и события «получил кристалл».
// GET ?after=ID — новые сообщения (без after — последние 50), &me=1 — мой ник.
// POST nick — выбрать ник; send — написать; delete/ban — модерация (только админ).
'use strict';
const db = require('./_lib/db');
const auth = require('./_lib/auth');
const mod = require('./_lib/moderate');
const { send, body } = require('./_lib/util');

const REASON = { mat: 'mat', ad: 'ad', toxic: 'toxic' };

async function withNicks(rows) {
  const ids = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];
  const profs = ids.length ? await db.select('profiles', { select: 'user_id,nick,role', user_id: `in.(${ids.join(',')})` }) : [];
  const by = {}; profs.forEach((p) => { by[p.user_id] = p; });
  return rows.map((r) => ({
    id: r.id, at: r.created_at, kind: r.kind, text: r.kind === 'msg' ? r.text : null, course: r.course,
    nick: (by[r.user_id] && by[r.user_id].nick) || null, role: (by[r.user_id] && by[r.user_id].role) || 'user',
  }));
}

async function profile(user) {
  const p = await db.select('profiles', { select: 'nick,role,banned', user_id: `eq.${user.id}` });
  return p[0] || null;
}

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      const q = req.query || {};
      const after = Number(q.after) || 0;
      let rows = after
        ? await db.select('chat_messages', { select: 'id,created_at,user_id,kind,text,course', id: `gt.${after}`, deleted: 'is.false', order: 'id.asc', limit: '60' })
        : (await db.select('chat_messages', { select: 'id,created_at,user_id,kind,text,course', deleted: 'is.false', order: 'id.desc', limit: '50' })).reverse();
      const out = { messages: await withNicks(rows) };
      if (q.me) {
        const user = await auth.userFrom(req);
        if (user) { const p = await profile(user); out.me = { nick: p && p.nick, admin: auth.isAdmin(user), banned: !!(p && p.banned) }; }
      }
      return send(res, 200, out);
    }
    if (req.method !== 'POST') return send(res, 405, { error: 'method' });

    const user = await auth.userFrom(req);
    if (!user) return send(res, 401, { error: 'auth' });
    const admin = auth.isAdmin(user);
    const b = body(req);

    if (b.action === 'nick') {
      const nick = String(b.nick || '').trim().replace(/\s+/g, ' ');
      const bad = mod.nickProblem(nick);
      if (bad === 'format' || (bad && !admin)) return send(res, 400, { error: bad === 'format' ? 'nick_format' : 'nick_bad' });
      const p = await profile(user);
      try {
        if (p) await db.update('profiles', { user_id: `eq.${user.id}` }, { nick, role: admin ? 'admin' : p.role });
        else await db.insert('profiles', { user_id: user.id, nick, role: admin ? 'admin' : 'user' });
      } catch (e) {
        if (/409|23505|duplicate/.test(e.message)) return send(res, 409, { error: 'nick_taken' });
        throw e;
      }
      return send(res, 200, { ok: true, nick });
    }

    if (b.action === 'send') {
      const text = String(b.text || '').trim().replace(/\n{3,}/g, '\n\n');
      if (!text) return send(res, 400, { error: 'empty' });
      if (text.length > 500) return send(res, 400, { error: 'long' });
      const p = await profile(user);
      if (!p || !p.nick) return send(res, 400, { error: 'nick' });
      if (p.banned) return send(res, 403, { error: 'banned' });
      if (!admin) {
        const since = new Date(Date.now() - 10 * 60e3).toISOString();
        const recent = await db.select('chat_messages', { select: 'created_at', user_id: `eq.${user.id}`, kind: 'eq.msg', created_at: `gte.${since}`, order: 'created_at.desc', limit: '20' });
        if (recent.length >= 20 || (recent[0] && Date.now() - new Date(recent[0].created_at).getTime() < 8000)) return send(res, 429, { error: 'slow' });
      }
      const reason = await mod.check(text, { admin });
      if (reason) {
        try { await db.insert('chat_blocked', { user_id: user.id, text: text.slice(0, 500), reason }); } catch (e) { /* лог не критичен */ }
        return send(res, 422, { error: REASON[reason] || 'blocked' });
      }
      const ins = await db.insert('chat_messages', { user_id: user.id, kind: 'msg', text });
      return send(res, 200, { ok: true, message: (await withNicks(ins))[0] });
    }

    if (b.action === 'delete' || b.action === 'ban') {
      if (!admin) return send(res, 403, { error: 'admin' });
      const id = Number(b.id);
      if (!id) return send(res, 400, { error: 'id' });
      const rows = await db.select('chat_messages', { select: 'id,user_id', id: `eq.${id}` });
      if (!rows.length) return send(res, 404, { error: 'id' });
      await db.update('chat_messages', { id: `eq.${id}` }, { deleted: true });
      if (b.action === 'ban' && rows[0].user_id) {
        await db.update('profiles', { user_id: `eq.${rows[0].user_id}` }, { banned: true });
        await db.update('chat_messages', { user_id: `eq.${rows[0].user_id}`, kind: 'eq.msg' }, { deleted: true });
      }
      return send(res, 200, { ok: true });
    }

    return send(res, 400, { error: 'action' });
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: 'server' });
  }
};
