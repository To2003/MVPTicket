-- =====================================================================
-- Algo Lindo · esquema base
-- Compatible con Supabase (roles anon/authenticated ya existen) y con
-- Postgres "pelado" (Postgres embebido de desarrollo/tests).
-- =====================================================================

-- Roles de Supabase: en Postgres pelado los creamos para que RLS y los
-- grants sean los mismos en todos lados.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end
$$;

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
create type public.order_status as enum ('pending', 'paid', 'needs_refund');
create type public.ticket_status as enum ('valid', 'used', 'void');
create type public.contact_event_type as enum ('cumpleanos', 'privado', 'otro');

-- ---------------------------------------------------------------------
-- Eventos y tipos de entrada
-- ---------------------------------------------------------------------
create table public.events (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name          text not null check (length(name) between 1 and 120),
  description   text not null default '',
  flyer_path    text,
  starts_at     timestamptz not null,
  venue_name    text not null,
  venue_address text not null default '',
  is_published  boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index events_published_starts_idx on public.events (is_published, starts_at);

create table public.ticket_types (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events (id) on delete cascade,
  name       text not null check (length(name) between 1 and 60),
  price      integer not null check (price > 0),
  capacity   integer not null check (capacity >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index ticket_types_event_idx on public.ticket_types (event_id);

-- ---------------------------------------------------------------------
-- Órdenes (la orden "pending" ES la reserva de cupo)
-- ---------------------------------------------------------------------
create table public.orders (
  id               uuid primary key default gen_random_uuid(),
  event_id         uuid not null references public.events (id) on delete restrict,
  buyer_name       text not null,
  buyer_email      text not null,
  buyer_dni        text not null,
  total            integer not null check (total >= 0),
  status           public.order_status not null default 'pending',
  expires_at       timestamptz not null,
  mp_preference_id text,
  paid_payment_id  text,
  paid_at          timestamptz,
  email_sent_at    timestamptz,
  created_at       timestamptz not null default now()
);
create index orders_event_idx on public.orders (event_id);
create index orders_status_expires_idx on public.orders (status, expires_at);
create index orders_created_idx on public.orders (created_at desc);

create table public.order_items (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references public.orders (id) on delete cascade,
  ticket_type_id uuid not null references public.ticket_types (id) on delete restrict,
  quantity       integer not null check (quantity > 0),
  unit_price     integer not null check (unit_price >= 0)
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_ticket_type_idx on public.order_items (ticket_type_id);

-- ---------------------------------------------------------------------
-- Pagos de Mercado Pago (log + clave de idempotencia)
-- ---------------------------------------------------------------------
create table public.payments (
  mp_payment_id text primary key,
  order_id      uuid references public.orders (id) on delete set null,
  status        text not null,
  amount        integer,
  outcome       text,
  raw           jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index payments_order_idx on public.payments (order_id);

-- ---------------------------------------------------------------------
-- Entradas
-- ---------------------------------------------------------------------
create table public.tickets (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references public.orders (id) on delete cascade,
  order_item_id  uuid not null references public.order_items (id) on delete cascade,
  seq            integer not null check (seq > 0),
  event_id       uuid not null references public.events (id) on delete restrict,
  ticket_type_id uuid not null references public.ticket_types (id) on delete restrict,
  holder_name    text not null,
  code           text not null unique,
  status         public.ticket_status not null default 'valid',
  used_at        timestamptz,
  voided_at      timestamptz,
  created_at     timestamptz not null default now(),
  -- Red de seguridad de idempotencia: una sola entrada por unidad comprada.
  unique (order_item_id, seq)
);
create index tickets_order_idx on public.tickets (order_id);
create index tickets_event_idx on public.tickets (event_id, status);

-- ---------------------------------------------------------------------
-- Contacto, galería, rate limit, archivos locales
-- ---------------------------------------------------------------------
create table public.contact_messages (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  email          text not null,
  event_type     public.contact_event_type not null,
  estimated_date date,
  message        text not null,
  is_read        boolean not null default false,
  created_at     timestamptz not null default now()
);
create index contact_messages_created_idx on public.contact_messages (created_at desc);

create table public.gallery_photos (
  id         uuid primary key default gen_random_uuid(),
  image_url  text not null,
  caption    text not null default '',
  sort_order integer not null default 0
);

create table public.rate_limits (
  key          text not null,
  window_start timestamptz not null,
  count        integer not null default 0,
  primary key (key, window_start)
);

-- Solo se usa si no hay Supabase Storage configurado (modo local).
create table public.local_files (
  path         text primary key,
  content_type text not null,
  data         bytea not null,
  created_at   timestamptz not null default now()
);

-- updated_at automático
create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end
$$;
create trigger events_touch before update on public.events
  for each row execute function public.touch_updated_at();
create trigger payments_touch before update on public.payments
  for each row execute function public.touch_updated_at();
