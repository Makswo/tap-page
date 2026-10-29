// Тонкая обёртка над REST Supabase: без зависимостей, только fetch.
// Ключ — service role, поэтому код работает только на сервере.
'use strict';

// Ищем переменные и без приставки, и с любой приставкой от Vercel
// Storage (например, STORAGE_SUPABASE_URL).
function env(names) {
  for (const n of names) if (process.env[n]) return process.env[n];
  const keys = Object.keys(process.env);
  for (const n of names) {
    const k = keys.find((x) => x.endsWith(`_${n}`) && !x.includes('PUBLIC') && process.env[x]);
    if (k) return process.env[k];
  }
  return '';
}

function cfg() {
  const url = env(['SUPABASE_URL']) || env(['NEXT_PUBLIC_SUPABASE_URL']);
  const key = env(['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_KEY']);
  if (!url || !key) throw new Error('Supabase env is missing: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  return { url: url.replace(/\/+$/, ''), key };
}

function qs(filters) {
  return Object.entries(filters || {})
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
}

async function call(method, table, filters, body, prefer) {
  const { url, key } = cfg();
  const q = qs(filters);
  const res = await fetch(`${url}/rest/v1/${table}${q ? `?${q}` : ''}`, {
    method,
    headers: {
      apikey: key,
      // Новые секретные ключи (sb_secret_...) идут только в apikey,
      // старый service_role (JWT) — ещё и в Authorization.
      ...(key.startsWith('sb_') ? {} : { Authorization: `Bearer ${key}` }),
      'Content-Type': 'application/json',
      Prefer: prefer || 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase ${method} ${table}: ${res.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : [];
}

module.exports = {
  select: (table, filters) => call('GET', table, filters),
  insert: (table, row) => call('POST', table, null, row),
  update: (table, filters, row) => call('PATCH', table, filters, row),
  // Вставка без ошибки на дубликат (по первичному или уникальному ключу).
  upsert: (table, row) => call('POST', table, null, row, 'resolution=merge-duplicates,return=representation'),
  remove: (table, filters) => call('DELETE', table, filters),
  insertIgnore: (table, row) => call('POST', table, null, row, 'resolution=ignore-duplicates,return=representation'),
  cfg,
};
