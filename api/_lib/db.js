// Тонкая обёртка над REST Supabase: без зависимостей, только fetch.
// Ключ — service role, поэтому код работает только на сервере.
'use strict';

function cfg() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Supabase env is missing: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  return { url: url.replace(/\/+$/, ''), key };
}

function qs(filters) {
  return Object.entries(filters || {})
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
}

async function call(method, table, filters, body) {
  const { url, key } = cfg();
  const q = qs(filters);
  const res = await fetch(`${url}/rest/v1/${table}${q ? `?${q}` : ''}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
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
};
