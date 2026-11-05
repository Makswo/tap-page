// Туториал /start одной функцией (лимит Vercel Hobby — 12 функций в api/).
// Старые адреса /api/tutorial-start, -answers, -pay, -guide работают через rewrites в vercel.json.
'use strict';
const { send } = require('./_lib/util');

const ACTIONS = {
  start: require('./_lib/tutorial/start'),     // POST: заказ (+ промокод, метка from)
  answers: require('./_lib/tutorial/answers'), // POST: ответы → данные оплаты
  pay: require('./_lib/tutorial/pay'),         // POST: платёж ЮKassa
  guide: require('./_lib/tutorial/guide'),     // GET: инструкция по оплаченному заказу
  visit: require('./_lib/tutorial/visit'),     // POST: заход на страницу с меткой
};

module.exports = (req, res) => {
  const q = req.query || {};
  let a = String(q.a || '');
  if (!a) { const m = String(req.url || '').match(/\/api\/tutorial-(\w+)/); if (m) a = m[1]; }
  const fn = ACTIONS[a];
  if (!fn) return send(res, 404, { error: 'action' });
  return fn(req, res);
};
