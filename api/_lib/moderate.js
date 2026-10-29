// Модерация общего чата: без рекламы, ссылок, контактов и мата.
'use strict';

// Латиница, похожая на кириллицу, и цифры-подмены — чтобы «xyй», «6ля», «п1зда» тоже ловились.
const LOOK = { a: 'а', b: 'в', c: 'с', e: 'е', h: 'н', k: 'к', m: 'м', o: 'о', p: 'р', t: 'т', x: 'х', y: 'у', u: 'и', '3': 'з', '0': 'о', '6': 'б', '4': 'ч', '1': 'и', '@': 'а' };
function squash(s) {
  return String(s).toLowerCase().replace(/ё/g, 'е')
    .replace(/[a-z0-9@]/g, (c) => LOOK[c] || c)
    .replace(/[^а-яa-z]/g, '')          // убираем пробелы, точки, звёздочки между буквами
    .replace(/(.)\1{2,}/g, '$1$1');     // «бляяяя» → «бляя»
}

// Нецензурная лексика. STRONG ищем где угодно (даже «х у й» через пробелы),
// START — только в начале слова, чтобы не цеплять обычные слова вроде «требую» или «служебный».
const STRONG = ['хуй', 'пизд', 'пидор', 'пидр', 'залуп', 'гандон', 'гондон', 'ебан', 'ебал', 'ебат', 'блят', 'бляд', 'долбоеб', 'мудак', 'мудил', 'шлюх', 'fuck', 'cunt'];
const START = ['хуе', 'хуи', 'хую', 'хуя', 'бля', 'сука', 'суки', 'сучк', 'ебу', 'ебн', 'еблан', 'ебло', 'дроч', 'манда', 'шалав', 'заеб', 'выеб', 'уеб', 'поеб', 'наеб', 'отъеб', 'педик', 'shit', 'bitch', 'dick'];
// Обычные слова, внутри которых встречаются корни выше.
const SAFE = ['употреб', 'потреб', 'страхуй', 'застрахуй', 'колебат', 'колебан', 'хлебат', 'хлебал', 'гребат', 'гребан', 'учебан', 'рубля', 'корабля', 'сабля', 'грабля', 'мандарин', 'мандат', 'команда', 'командa', 'психуй'];
const SQ = (arr) => arr.map((w) => squash(w));
const STRONG_SQ = SQ(STRONG), START_SQ = SQ(START), SAFE_SQ = SQ(SAFE);
function cleanSafe(s) { let x = s; SAFE_SQ.forEach((w) => { x = x.split(w).join('_'); }); return x; }
function hasMat(text) {
  const full = cleanSafe(squash(text));
  if (STRONG_SQ.some((w) => full.includes(w))) return true;
  return String(text).split(/[\s,.!?;:()"«»\-—]+/).some((word) => {
    const w = cleanSafe(squash(word));
    return w && START_SQ.some((r) => w.startsWith(r));
  });
}

// Реклама и контакты.
const AD_RE = [
  /https?:\/\//i, /\bwww\./i,
  /\b[a-z0-9-]{2,}\.(ru|рф|com|net|org|io|me|su|info|biz|pro|app|online|site|shop|store|xyz|club|top|link|ly|gg|tv|cc|co|us|uk|de|kz|by|ua)\b/i,
  /\bt\.me\b/i, /(^|\s)@[a-z0-9_]{3,}/i,
  /(\+?\d[\s\-()]*){10,}/,
  /(telegram|телег|тг-канал|whatsapp|ватсап|вотсап|viber|вайбер|инстаграм|instagram|youtube|ютуб)\s*(канал|аккаунт|группа|чат|@|:)/i,
  /(подпиш|подписыва|переходи|перейди по|жми на ссылк|ссылка в|пиши в (лс|личк|директ|телег)|в личку|скидк|промокод на скидк|реклам|казино|ставк[аи] на|букмекер|заработ|пассивн\w* доход|крипт|инвестиц|трейдинг|сигналы|заказывай|купи|продам|продаю)/i,
];

function local(text, { admin } = {}) {
  const t = String(text || '');
  if (hasMat(t)) return 'mat';
  if (!admin && AD_RE.some((re) => re.test(t))) return 'ad';
  return null;
}

// Бесплатная модерация OpenAI (если есть ключ): оскорбления, угрозы, 18+ и т.п.
async function ai(text) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  try {
    const r = await fetch(`${(process.env.OPENAI_API_URL || 'https://api.openai.com').replace(/\/+$/, '')}/v1/moderations`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'omni-moderation-latest', input: String(text).slice(0, 2000) }),
    });
    if (!r.ok) return null;
    const d = await r.json();
    return d.results && d.results[0] && d.results[0].flagged ? 'toxic' : null;
  } catch (e) { return null; }
}

async function check(text, opts) {
  return local(text, opts) || (await ai(text));
}

const NICK_RE = /^[A-Za-zА-Яа-яЁё0-9_\- .]{2,24}$/;
function nickProblem(nick) {
  const n = String(nick || '').trim();
  if (!NICK_RE.test(n)) return 'format';
  if (local(n) || /makswo|admin|админ|модер|support|поддержк|tap-?page/i.test(n) || /^(макс|max|maks|мах)$/i.test(n)) return 'bad';
  return null;
}

module.exports = { check, local, nickProblem, squash };
