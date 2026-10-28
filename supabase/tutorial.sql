-- Туториал «Как начать с Claude»: промокоды и заказы.
-- Выполнить один раз: Supabase → SQL Editor → New query → вставить → Run.

create table if not exists promo_codes (
  code        text primary key,           -- всегда ЗАГЛАВНЫМИ, без пробелов
  active      boolean not null default true,
  uses        integer not null default 0,
  note        text,
  created_at  timestamptz not null default now()
);

create table if not exists tutorial_orders (
  id              uuid primary key default gen_random_uuid(),
  promo           text references promo_codes(code),
  answers         jsonb,
  status          text not null default 'new',   -- new → paid
  amount          numeric,                       -- пришло на кошелёк
  withdraw_amount numeric,                       -- списано у покупателя
  operation_id    text,
  paid_at         timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists tutorial_orders_status_idx on tutorial_orders (status);

-- Доступ только с сервера (service role). Публичный ключ ничего не видит.
alter table promo_codes enable row level security;
alter table tutorial_orders enable row level security;

-- Первый промокод — тот же, что в автоответе Glocal на СТАРТ.
-- Поменять код: добавь новый и выключи старый (active = false).
insert into promo_codes (code, note) values ('CLAUDE26', 'автоответ Glocal на СТАРТ')
on conflict (code) do nothing;

-- Полезные запросы:
-- select status, count(*) from tutorial_orders group by status;
-- select * from tutorial_orders where status = 'paid' order by paid_at desc;
-- update promo_codes set active = false where code = 'CLAUDE26';

-- Профили (Supabase Auth, вход по коду на почту): привязка инструкций,
-- сертификаты на кристаллы и лист ожидания курсов. Доступ только с сервера.
alter table public.tutorial_orders add column if not exists user_id uuid references auth.users(id) on delete set null;
create index if not exists tutorial_orders_user_id_idx on public.tutorial_orders(user_id);

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course text not null,
  order_id uuid unique references public.tutorial_orders(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, course)
);
alter table public.certificates enable row level security;

create table if not exists public.waitlist (
  user_id uuid not null references auth.users(id) on delete cascade,
  course text not null,
  email text,
  created_at timestamptz not null default now(),
  primary key (user_id, course)
);
alter table public.waitlist enable row level security;

-- ИИ-поддержка: вопросы и ответы чата, IP только в виде хэша (для лимитов).
create table if not exists public.support_messages (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  ip_hash text not null,
  user_id uuid references auth.users(id) on delete set null,
  question text,
  answer text,
  blocked boolean not null default false
);
create index if not exists support_messages_ip_time_idx on public.support_messages(ip_hash, created_at desc);
alter table public.support_messages enable row level security;
