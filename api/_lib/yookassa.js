// ЮKassa: создание платежа для встроенного виджета и проверка статуса.
// Ключи: YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY (ЮKassa → Интеграция → Ключи API).
// Чеки по 54-ФЗ (для ИП не на НПД): YOOKASSA_RECEIPTS=1 — тогда покупатель
// вводит email, а ЮKassa отправляет на него чек. YOOKASSA_VAT_CODE — код НДС
// (по умолчанию 1 — «без НДС»; уточни у бухгалтера под свою систему налогообложения).
// YOOKASSA_TAX_SYSTEM — код системы налогообложения в чеке (6 — патент, 2 — УСН «доходы»).
'use strict';
const crypto = require('crypto');

const API = process.env.YOOKASSA_API_URL || 'https://api.yookassa.ru/v3';

function enabled() {
  return Boolean(process.env.YOOKASSA_SHOP_ID && process.env.YOOKASSA_SECRET_KEY);
}

function receipts() {
  return process.env.YOOKASSA_RECEIPTS === '1';
}

function auth() {
  const t = Buffer.from(`${process.env.YOOKASSA_SHOP_ID}:${process.env.YOOKASSA_SECRET_KEY}`).toString('base64');
  return `Basic ${t}`;
}

async function call(method, path, body) {
  const headers = { Authorization: auth(), 'Content-Type': 'application/json' };
  if (method === 'POST') headers['Idempotence-Key'] = crypto.randomUUID();
  const res = await fetch(`${API}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch (e) { data = { raw: text }; }
  if (!res.ok) {
    const err = new Error(`YooKassa ${method} ${path}: ${res.status} ${data.description || text.slice(0, 200)}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

// Платёж: на компьютере — встроенный виджет (embedded), на телефоне — страница ЮKassa (redirect)
// с возвратом на return_url: так приложения банков (T-Pay, SberPay, СБП) надёжно возвращают на сайт.
async function createPayment({ order, price, email, returnUrl, method }) {
  const value = Number(price).toFixed(2);
  const body = {
    amount: { value, currency: 'RUB' },
    confirmation: returnUrl ? { type: 'redirect', return_url: returnUrl, locale: 'ru_RU' } : { type: 'embedded', locale: 'ru_RU' },
    capture: true,
    // Один способ оплаты (карта или СБП): форма покажет только его.
    ...(method === 'bank_card' || method === 'sbp' ? { payment_method_data: { type: method } } : {}),
    description: `Туториал «Как начать с Claude», заказ ${order.slice(0, 8).toUpperCase()}`,
    metadata: { order_id: order },
  };
  if (receipts()) {
    body.receipt = {
      customer: { email },
      // Система налогообложения для чека: 6 — патент (ПСН), 2 — УСН «доходы».
      ...(process.env.YOOKASSA_TAX_SYSTEM ? { tax_system_code: Number(process.env.YOOKASSA_TAX_SYSTEM) } : {}),
      items: [{
        description: 'Персональная инструкция «Как начать с Claude» (цифровой материал)',
        quantity: '1.00',
        amount: { value, currency: 'RUB' },
        vat_code: Number(process.env.YOOKASSA_VAT_CODE || 1),
        payment_mode: 'full_payment',
        payment_subject: 'service',
      }],
    };
  }
  return call('POST', '/payments', body);
}

function getPayment(id) {
  return call('GET', `/payments/${encodeURIComponent(id)}`);
}

// Платёж засчитываем, только если ЮKassa сама подтвердила статус и сумму.
function isPaid(p, order, price) {
  return Boolean(p && p.status === 'succeeded' && p.paid === true
    && p.metadata && p.metadata.order_id === order
    && p.amount && p.amount.currency === 'RUB' && Number(p.amount.value) + 0.001 >= price);
}

module.exports = { enabled, receipts, createPayment, getPayment, isPaid };
