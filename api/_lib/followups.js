// Письма после покупки инструкции — только тем, кто поставил галочку «присылать письма» (mail_ok).
// 1-е через сутки: подсказка по плану. 2-е через трое суток: «Стартовый набор» (предзапись).
// Запускается раз в день из /api/keepalive (cron Vercel Hobby — не чаще раза в сутки),
// поэтому письмо приходит в первый запуск после 24 / 72 часов.
'use strict';
const db = require('./db');
const mail = require('./mail');
const { site } = require('./util');

const H = 36e5;
const LETTERS = {
  mail1_at: {
    subject: 'Как идёт первый день с ИИ?',
    text: (o) => `Привет! Вчера ты собрал инструкцию «Как начать с ИИ».\n\nОдин совет на сегодня: открой план на 7 дней и отметь первый день — даже если сделал только установку. Отмеченный день помогает не бросить на втором.\n\nЕсли что-то не получилось — открой инструкцию и нажми «Чат» внизу страницы: там ответит поддержка.\n\nМакс`,
    cta: 'Открыть мою инструкцию',
    link: (o) => `${site()}/start?order=${o.id}`,
  },
  mail2_at: {
    subject: 'Следующий шаг — свой ИИ-помощник за 7 дней',
    text: () => `Привет! Если инструкция помогла начать, следующий шаг — «Стартовый набор».\n\nЗа 7 дней по 5–15 минут твой помощник узнает твою работу, подключится к почте и календарю там, где это возможно, и будет присылать утренний отчёт. Без кода, в Claude, ChatGPT или DeepSeek.\n\nСейчас идёт предзапись. Для тебя — зачёт 299 ₽ за инструкцию: 2 691 ₽ вместо 2 990 ₽ в первые 72 часа после старта.\n\nМакс`,
    cta: 'Программа и предзапись',
    link: () => `${site()}/kit`,
  },
};

async function due(field, fromH, toH, now) {
  return db.select('tutorial_orders', {
    select: 'id,email', status: 'eq.paid', mail_ok: 'is.true', email: 'not.is.null', [field]: 'is.null',
    and: `(paid_at.lte.${new Date(now - fromH * H).toISOString()},paid_at.gte.${new Date(now - toH * H).toISOString()})`,
    limit: '200',
  });
}

async function run(now = Date.now()) {
  if (!process.env.RESEND_API_KEY) return { skipped: 'mail' };
  const out = {};
  // 1-е письмо — пока не прошло 72 часа; позже сразу второе, чтобы не слать два в один день.
  for (const [field, from, to] of [['mail1_at', 24, 72], ['mail2_at', 72, 240]]) {
    const L = LETTERS[field];
    const rows = (await due(field, from, to, now)).filter((o) => o.email);
    const items = rows.map((o) => {
      const unsub = mail.orderUnsubUrl(o.id);
      const m = mail.render({ subject: L.subject, text: L.text(o), cta: L.cta, link: L.link(o), unsub,
        footer: 'Ты получил это письмо, потому что при оплате на tap-page.ru попросил присылать письма.' });
      return { to: o.email, subject: L.subject, html: m.html, text: m.text, unsub, id: o.id };
    });
    if (!items.length) { out[field] = 0; continue; }
    const r = await mail.sendBatch(items);
    const ts = new Date(now).toISOString();
    // Помечаем и неудачные: повторять одно письмо каждый день хуже, чем не отправить его.
    const ids = items.map((x) => x.id);
    for (let i = 0; i < ids.length; i += 100) {
      await db.update('tutorial_orders', { id: `in.(${ids.slice(i, i + 100).join(',')})` }, { [field]: ts });
    }
    out[field] = r.ok.length;
  }
  return out;
}

module.exports = { run, LETTERS };
