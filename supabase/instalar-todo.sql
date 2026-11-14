-- =====================================================================
-- ALGO LINDO · INSTALACIÓN COMPLETA (generado con npm run sql:bundle)
--
-- Cómo usarlo:
--   1. Supabase → tu proyecto → SQL Editor → New query.
--   2. Pegá TODO este archivo y tocá "Run".
--   3. Al final tiene que mostrar una fila con eventos = 3.
--
-- Correlo UNA sola vez sobre un proyecto nuevo. Si da "already exists",
-- es porque ya estaba instalado.
-- =====================================================================
create table if not exists public._migrations (
  name text primary key,
  applied_at timestamptz not null default now()
);
alter table public._migrations enable row level security;

-- ─────────────── 20261113000100_schema.sql ───────────────
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

insert into public._migrations (name) values ('20261113000100_schema.sql') on conflict do nothing;

-- ─────────────── 20261113000200_functions.sql ───────────────
-- =====================================================================
-- Funciones (RPC). Todas security definer + search_path vacío.
-- Las operaciones sensibles NO son ejecutables por anon/authenticated:
-- solo el servidor (service role / dueño) las llama.
-- =====================================================================

-- Entradas ocupadas de un tipo = vendidas + reservas vigentes.
create function public.ticket_type_used(p_ticket_type_id uuid)
returns integer
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(oi.quantity), 0)::integer
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where oi.ticket_type_id = p_ticket_type_id
    and (o.status = 'paid' or (o.status = 'pending' and o.expires_at > now()));
$$;

-- Disponibilidad pública (solo eventos publicados; no expone órdenes).
create function public.public_availability(p_event_ids uuid[])
returns table (event_id uuid, ticket_type_id uuid, available integer)
language sql stable security definer set search_path = '' as $$
  select tt.event_id,
         tt.id,
         greatest(tt.capacity - public.ticket_type_used(tt.id), 0)::integer
  from public.ticket_types tt
  join public.events e on e.id = tt.event_id
  where e.is_published and tt.event_id = any (p_event_ids);
$$;

-- Código corto legible para ingreso manual: XXX-XXXX-XXX (alfabeto sin 0/O/1/I/L).
-- La entropía sale de gen_random_uuid() (CSPRNG), evitando los bytes de versión/variante.
create function public.gen_ticket_code()
returns text
language plpgsql volatile set search_path = '' as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  b bytea := uuid_send(gen_random_uuid()) || uuid_send(gen_random_uuid());
  idx constant int[] := array[0, 1, 2, 3, 4, 5, 7, 9, 10, 11];
  c text := '';
  i int;
begin
  foreach i in array idx loop
    c := c || substr(alphabet, (get_byte(b, i) % 31) + 1, 1);
  end loop;
  return substr(c, 1, 3) || '-' || substr(c, 4, 4) || '-' || substr(c, 8, 3);
end
$$;

-- ---------------------------------------------------------------------
-- Reserva atómica
-- p_items: [{"ticket_type_id": "...", "quantity": 2}, ...]
-- Errores: EVENTO_NO_DISPONIBLE, EVENTO_PASADO, ITEMS_INVALIDOS,
--          TIPO_INVALIDO, CANTIDAD_INVALIDA, SIN_CUPO:<ticket_type_id>
-- ---------------------------------------------------------------------
create function public.reserve_order(
  p_event_id    uuid,
  p_items       jsonb,
  p_buyer_name  text,
  p_buyer_email text,
  p_buyer_dni   text,
  p_ttl_seconds integer default 600
)
returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_event    public.events%rowtype;
  v_line     record;
  v_tt       public.ticket_types%rowtype;
  v_total    integer := 0;
  v_order_id uuid;
begin
  select * into v_event from public.events where id = p_event_id;
  if not found or not v_event.is_published then
    raise exception 'EVENTO_NO_DISPONIBLE';
  end if;
  if v_event.starts_at <= now() then
    raise exception 'EVENTO_PASADO';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'ITEMS_INVALIDOS';
  end if;

  -- Bloqueamos los tipos involucrados en orden de id (evita deadlocks).
  -- Mientras tengamos el lock, nadie más puede reservar ni confirmar estos tipos.
  perform 1
  from public.ticket_types
  where id in (select (e ->> 'ticket_type_id')::uuid from jsonb_array_elements(p_items) e)
  order by id
  for update;

  for v_line in
    select (e ->> 'ticket_type_id')::uuid as tt_id, sum((e ->> 'quantity')::integer)::integer as qty
    from jsonb_array_elements(p_items) e
    group by 1
  loop
    select * into v_tt from public.ticket_types where id = v_line.tt_id and event_id = p_event_id;
    if not found then
      raise exception 'TIPO_INVALIDO';
    end if;
    if v_line.qty is null or v_line.qty < 1 or v_line.qty > 20 then
      raise exception 'CANTIDAD_INVALIDA';
    end if;
    if public.ticket_type_used(v_tt.id) + v_line.qty > v_tt.capacity then
      raise exception 'SIN_CUPO:%', v_tt.id;
    end if;
    v_total := v_total + v_tt.price * v_line.qty;
  end loop;

  insert into public.orders (event_id, buyer_name, buyer_email, buyer_dni, total, expires_at)
  values (p_event_id, p_buyer_name, p_buyer_email, p_buyer_dni, v_total,
          now() + make_interval(secs => p_ttl_seconds))
  returning id into v_order_id;

  insert into public.order_items (order_id, ticket_type_id, quantity, unit_price)
  select v_order_id, tt.id, l.qty, tt.price
  from (
    select (e ->> 'ticket_type_id')::uuid as tt_id, sum((e ->> 'quantity')::integer)::integer as qty
    from jsonb_array_elements(p_items) e
    group by 1
  ) l
  join public.ticket_types tt on tt.id = l.tt_id;

  return v_order_id;
end
$$;

-- ---------------------------------------------------------------------
-- Confirmación idempotente de una orden pagada.
-- Resultados: confirmed | already_paid | duplicate_payment | amount_mismatch
--             | no_stock | order_not_found
-- ---------------------------------------------------------------------
create function public.confirm_order(p_order_id uuid, p_payment_id text, p_amount integer)
returns text
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_order public.orders%rowtype;
  v_line  record;
begin
  -- Serializa avisos concurrentes del mismo pago / orden.
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    return 'order_not_found';
  end if;

  if v_order.status = 'paid' then
    if v_order.paid_payment_id = p_payment_id then
      return 'already_paid';
    end if;
    return 'duplicate_payment';
  end if;

  if v_order.status = 'needs_refund' then
    if v_order.paid_payment_id = p_payment_id then
      return 'no_stock';
    end if;
    return 'duplicate_payment';
  end if;

  if p_amount is distinct from v_order.total then
    return 'amount_mismatch';
  end if;

  -- Pago que llega con la reserva vencida: solo se confirma si todavía hay cupo.
  if v_order.expires_at <= now() then
    perform 1
    from public.ticket_types
    where id in (select ticket_type_id from public.order_items where order_id = p_order_id)
    order by id
    for update;

    for v_line in
      select oi.ticket_type_id, oi.quantity, tt.capacity
      from public.order_items oi
      join public.ticket_types tt on tt.id = oi.ticket_type_id
      where oi.order_id = p_order_id
    loop
      -- Esta orden está vencida, así que no se cuenta a sí misma en "used".
      if public.ticket_type_used(v_line.ticket_type_id) + v_line.quantity > v_line.capacity then
        update public.orders
          set status = 'needs_refund', paid_payment_id = p_payment_id, paid_at = now()
          where id = p_order_id;
        return 'no_stock';
      end if;
    end loop;
  end if;

  update public.orders
    set status = 'paid', paid_payment_id = p_payment_id, paid_at = now()
    where id = p_order_id;

  insert into public.tickets (order_id, order_item_id, seq, event_id, ticket_type_id, holder_name, code)
  select v_order.id, oi.id, s.n, v_order.event_id, oi.ticket_type_id, v_order.buyer_name,
         public.gen_ticket_code()
  from public.order_items oi
  cross join lateral generate_series(1, oi.quantity) as s(n)
  where oi.order_id = p_order_id
  on conflict (order_item_id, seq) do nothing;

  return 'confirmed';
end
$$;

-- ---------------------------------------------------------------------
-- Escaneo atómico: dos lecturas simultáneas del mismo QR → un solo "ok".
-- result: ok | used | void | wrong_event | invalid
-- ---------------------------------------------------------------------
create function public.scan_ticket(p_ticket_id uuid, p_event_id uuid)
returns table (
  result           text,
  ticket_id        uuid,
  holder_name      text,
  ticket_type_name text,
  event_name       text,
  used_at          timestamptz
)
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_ticket public.tickets%rowtype;
begin
  update public.tickets t
    set status = 'used', used_at = now()
    where t.id = p_ticket_id and t.status = 'valid' and t.event_id = p_event_id
    returning * into v_ticket;

  if found then
    result := 'ok';
  else
    select * into v_ticket from public.tickets t where t.id = p_ticket_id;
    if not found then
      result := 'invalid';
      return next;
      return;
    elsif v_ticket.status = 'void' then
      result := 'void';
    elsif v_ticket.event_id <> p_event_id then
      result := 'wrong_event';
    else
      result := 'used';
    end if;
  end if;

  ticket_id := v_ticket.id;
  holder_name := v_ticket.holder_name;
  used_at := v_ticket.used_at;
  select tt.name into ticket_type_name from public.ticket_types tt where tt.id = v_ticket.ticket_type_id;
  select e.name into event_name from public.events e where e.id = v_ticket.event_id;
  return next;
end
$$;

-- ---------------------------------------------------------------------
-- Rate limit por ventana fija. Devuelve true si la llamada está permitida.
-- ---------------------------------------------------------------------
create function public.rate_limit_hit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_window timestamptz :=
    to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_count integer;
begin
  insert into public.rate_limits (key, window_start, count)
  values (p_key, v_window, 1)
  on conflict (key, window_start) do update set count = public.rate_limits.count + 1
  returning count into v_count;

  -- Limpieza ocasional de ventanas viejas.
  if random() < 0.02 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;

  return v_count <= p_limit;
end
$$;

insert into public._migrations (name) values ('20261113000200_functions.sql') on conflict do nothing;

-- ─────────────── 20261113000300_security.sql ───────────────
-- =====================================================================
-- RLS + permisos.
-- Público (anon/authenticated): solo lee eventos publicados, sus tipos de
-- entrada, la disponibilidad agregada y la galería. Nada más.
-- El servidor usa el rol dueño / service role, que no pasa por RLS.
-- =====================================================================

alter table public.events           enable row level security;
alter table public.ticket_types     enable row level security;
alter table public.orders           enable row level security;
alter table public.order_items      enable row level security;
alter table public.payments         enable row level security;
alter table public.tickets          enable row level security;
alter table public.contact_messages enable row level security;
alter table public.gallery_photos   enable row level security;
alter table public.rate_limits      enable row level security;
alter table public.local_files      enable row level security;

create policy "Público lee eventos publicados"
  on public.events for select to anon, authenticated
  using (is_published);

create policy "Público lee tipos de entrada de eventos publicados"
  on public.ticket_types for select to anon, authenticated
  using (exists (select 1 from public.events e where e.id = event_id and e.is_published));

create policy "Público lee la galería"
  on public.gallery_photos for select to anon, authenticated
  using (true);

-- Grants explícitos (en Supabase los default privileges dan de más; RLS
-- igual bloquea, pero revocamos para tener defensa en profundidad).
grant usage on schema public to anon, authenticated, service_role;

revoke all on public.events, public.ticket_types, public.orders, public.order_items,
  public.payments, public.tickets, public.contact_messages, public.gallery_photos,
  public.rate_limits, public.local_files
  from anon, authenticated;

grant select on public.events, public.ticket_types, public.gallery_photos to anon, authenticated;

grant all on public.events, public.ticket_types, public.orders, public.order_items,
  public.payments, public.tickets, public.contact_messages, public.gallery_photos,
  public.rate_limits, public.local_files
  to service_role;

-- Funciones: por defecto PUBLIC puede ejecutar; lo cerramos.
revoke execute on function
  public.ticket_type_used(uuid),
  public.public_availability(uuid[]),
  public.gen_ticket_code(),
  public.reserve_order(uuid, jsonb, text, text, text, integer),
  public.confirm_order(uuid, text, integer),
  public.scan_ticket(uuid, uuid),
  public.rate_limit_hit(text, integer, integer),
  public.touch_updated_at()
  from public, anon, authenticated;

grant execute on function
  public.ticket_type_used(uuid),
  public.public_availability(uuid[]),
  public.gen_ticket_code(),
  public.reserve_order(uuid, jsonb, text, text, text, integer),
  public.confirm_order(uuid, text, integer),
  public.scan_ticket(uuid, uuid),
  public.rate_limit_hit(text, integer, integer)
  to service_role;

-- Única RPC pública: disponibilidad agregada de eventos publicados.
grant execute on function public.public_availability(uuid[]) to anon, authenticated;

-- Supabase Storage: bucket público de flyers (solo si existe el esquema storage).
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public)
    values ('flyers', 'flyers', true)
    on conflict (id) do nothing;
  end if;
end
$$;

insert into public._migrations (name) values ('20261113000300_security.sql') on conflict do nothing;

-- ─────────────── Datos de ejemplo ───────────────
-- =====================================================================
-- Datos de ejemplo (equivalente SQL de `npm run seed`, para correr desde
-- el SQL Editor de Supabase). Fechas relativas a hoy.
-- =====================================================================

create or replace function pg_temp.seed_saturday(days_ahead int, hh int) returns timestamptz
language sql as $$
  select ((d + ((6 - extract(isodow from d)::int + 7) % 7)) + make_time(hh, 0, 0)) at time zone 'America/Argentina/Buenos_Aires'
  from (select (now() at time zone 'America/Argentina/Buenos_Aires')::date + days_ahead as d) x
$$;

create or replace function pg_temp.seed_person(out p_name text, out p_email text, out p_dni text)
language plpgsql as $$
declare
  f text;
  l text;
begin
  f := (array['Sofía','Martina','Valentina','Camila','Lucía','Julieta','Agustina','Florencia','Micaela','Paula','Carolina','Rocío','Milagros','Belén','Lautaro','Tomás','Joaquín','Matías','Facundo','Nicolás','Santiago','Federico','Gonzalo','Ignacio','Juan Cruz','Franco','Bruno','Ezequiel','Malena','Abril','Delfina','Pilar','Renata','Bautista','Thiago','Lorenzo'])[1 + floor(random() * 36)::int];
  l := (array['González','Rodríguez','Fernández','López','Martínez','Pérez','Gómez','Díaz','Sosa','Romero','Álvarez','Torres','Ruiz','Ramírez','Flores','Benítez','Acosta','Medina','Herrera','Aguirre','Pereyra','Gutiérrez','Giménez','Molina','Silva','Castro','Rojas','Ortiz','Núñez','Luna','Juárez','Cabrera','Ríos','Morales','Godoy','Ferreyra'])[1 + floor(random() * 36)::int];
  p_name := f || ' ' || l;
  p_email := translate(lower(f), 'áéíóúñü ', 'aeiounu') || '.' || translate(lower(l), 'áéíóúñü ', 'aeiounu') || floor(random() * 90 + 10)::int || '@example.com';
  p_dni := (28000000 + floor(random() * 19000000))::bigint::text;
end
$$;

-- Crea una orden y la confirma con la misma función que usa el webhook.
create or replace function pg_temp.seed_paid_order(
  p_event uuid, p_tt uuid, p_qty int, p_price int, p_paid_at timestamptz,
  p_tt2 uuid default null, p_qty2 int default 0, p_price2 int default 0
) returns uuid
language plpgsql as $$
declare
  v_id uuid;
  v_total int := p_qty * p_price + p_qty2 * p_price2;
  v_pay text := 'seed-' || substr(gen_random_uuid()::text, 1, 8);
  v_res text;
  p record;
begin
  select * into p from pg_temp.seed_person();
  insert into public.orders (event_id, buyer_name, buyer_email, buyer_dni, total, expires_at)
  values (p_event, p.p_name, p.p_email, p.p_dni, v_total, now() + interval '10 minutes')
  returning id into v_id;
  insert into public.order_items (order_id, ticket_type_id, quantity, unit_price) values (v_id, p_tt, p_qty, p_price);
  if p_qty2 > 0 then
    insert into public.order_items (order_id, ticket_type_id, quantity, unit_price) values (v_id, p_tt2, p_qty2, p_price2);
  end if;
  v_res := public.confirm_order(v_id, v_pay, v_total);
  if v_res <> 'confirmed' then
    raise exception 'confirm_order devolvió %', v_res;
  end if;
  update public.orders
    set created_at = p_paid_at - interval '3 minutes', paid_at = p_paid_at,
        expires_at = p_paid_at + interval '7 minutes', email_sent_at = p_paid_at
    where id = v_id;
  update public.tickets set created_at = p_paid_at where order_id = v_id;
  insert into public.payments (mp_payment_id, order_id, status, amount, outcome, raw, created_at)
  values (v_pay, v_id, 'approved', v_total, 'confirmed', '{"seed": true}', p_paid_at);
  return v_id;
end
$$;

do $$
declare
  v_vin uuid; v_cum uuid; v_pri uuid;
  t_va uuid; t_vg uuid; t_cg uuid; t_pg uuid;
  v_left int := 117;
  v_q int;
  i int;
  v_order uuid;
  p record;
begin
  truncate public.tickets, public.payments, public.order_items, public.orders, public.ticket_types,
    public.events, public.contact_messages, public.gallery_photos, public.rate_limits, public.local_files
    restart identity cascade;

  -- Eventos
  insert into public.events (slug, name, description, flyer_path, starts_at, venue_name, venue_address, is_published, created_at)
  values ('noche-de-vinilos-y-vermu', 'Noche de Vinilos & Vermú',
    E'La séptima edición de nuestro ciclo más mimado. DJs que pasan solo vinilos (funk, disco, soul y algún clásico nacional), barra de vermú de autor y la terraza abierta hasta tarde.\n\nVení temprano: de 21 a 22 hs el primer vermú va por la casa. Mayores de 18. Se puede ir de a uno, te vas a ir con amigos nuevos.',
    '/seed/flyers/noche-de-vinilos.svg', pg_temp.seed_saturday(18, 21), 'Club Atlético Fernández Fierro',
    'Sánchez de Bustamante 772, Almagro, CABA', true, now() - interval '30 days')
  returning id into v_vin;
  insert into public.ticket_types (event_id, name, price, capacity, sort_order) values (v_vin, 'Anticipada', 12000, 80, 0) returning id into t_va;
  insert into public.ticket_types (event_id, name, price, capacity, sort_order) values (v_vin, 'General', 15000, 150, 1) returning id into t_vg;

  insert into public.events (slug, name, description, flyer_path, starts_at, venue_name, venue_address, is_published, created_at)
  values ('cumbia-en-la-terraza', 'Cumbia en la Terraza',
    E'Arrancamos con el atardecer y terminamos cuando el cuerpo diga basta. Banda de cumbia en vivo, DJ con lo mejor de la tropical y una terraza con vista a toda la ciudad.\n\nCupo súper limitado porque queremos que se baile cómodo. Si llueve, nos mudamos al salón de abajo (la fiesta no se suspende).',
    '/seed/flyers/cumbia-en-la-terraza.svg', pg_temp.seed_saturday(8, 18), 'Terraza Konex',
    'Sarmiento 3131, Abasto, CABA', true, now() - interval '30 days')
  returning id into v_cum;
  insert into public.ticket_types (event_id, name, price, capacity, sort_order) values (v_cum, 'General', 10000, 120, 0) returning id into t_cg;

  insert into public.events (slug, name, description, flyer_path, starts_at, venue_name, venue_address, is_published, created_at)
  values ('fiesta-de-primavera', 'Fiesta de Primavera',
    'Recibimos la primavera al aire libre con DJs invitados, flores por todos lados y mucho glitter. Fue una noche hermosa: gracias a todos los que vinieron.',
    '/seed/flyers/fiesta-de-primavera.svg', pg_temp.seed_saturday(-61, 22), 'Jardín de la Casa Nacional del Bicentenario',
    'Riobamba 985, Recoleta, CABA', true, now() - interval '90 days')
  returning id into v_pri;
  insert into public.ticket_types (event_id, name, price, capacity, sort_order) values (v_pri, 'General', 9000, 200, 0) returning id into t_pg;

  -- Cumbia: 117 de 120 vendidas (casi agotado)
  while v_left > 0 loop
    v_q := least(v_left, 1 + floor(random() * 4)::int);
    v_left := v_left - v_q;
    perform pg_temp.seed_paid_order(v_cum, t_cg, v_q, 10000, now() - (1 + random() * 24) * interval '1 day');
  end loop;

  -- Vinilos: ventas moderadas en los dos tipos
  for i in 1..18 loop
    perform pg_temp.seed_paid_order(v_vin, t_va, 1 + floor(random() * 3)::int, 12000, now() - (1 + random() * 19) * interval '1 day',
      case when i % 4 = 0 then t_vg end, case when i % 4 = 0 then 1 + floor(random() * 2)::int else 0 end, 15000);
  end loop;

  -- Primavera (pasado): vendidas y casi todas usadas en la puerta
  for i in 1..26 loop
    perform pg_temp.seed_paid_order(v_pri, t_pg, 1 + floor(random() * 4)::int, 9000, now() - (58 + random() * 22) * interval '1 day');
  end loop;
  update public.tickets t set status = 'used', used_at = e.starts_at + random() * interval '150 minutes'
    from public.events e where t.event_id = e.id and e.id = v_pri and random() < 0.9;

  -- Una entrada anulada
  update public.tickets set status = 'void', voided_at = now() - interval '2 days'
    where id = (select id from public.tickets where event_id = v_vin order by created_at limit 1);

  -- Pago aprobado que llegó tarde y sin cupo → "A devolver"
  select * into p from pg_temp.seed_person();
  insert into public.orders (event_id, buyer_name, buyer_email, buyer_dni, total, status, expires_at, paid_payment_id, paid_at, created_at)
  values (v_cum, p.p_name, p.p_email, p.p_dni, 40000, 'needs_refund', now() - interval '2 days', 'seed-late-1',
    now() - interval '2 days' + interval '25 minutes', now() - interval '2 days' - interval '10 minutes')
  returning id into v_order;
  insert into public.order_items (order_id, ticket_type_id, quantity, unit_price) values (v_order, t_cg, 4, 10000);
  insert into public.payments (mp_payment_id, order_id, status, amount, outcome, raw)
  values ('seed-late-1', v_order, 'approved', 40000, 'no_stock', '{"seed": true}');

  -- Reserva vencida que nunca se pagó
  select * into p from pg_temp.seed_person();
  insert into public.orders (event_id, buyer_name, buyer_email, buyer_dni, total, expires_at, created_at)
  values (v_vin, p.p_name, p.p_email, p.p_dni, 24000, now() - interval '1 day', now() - interval '1 day' - interval '10 minutes')
  returning id into v_order;
  insert into public.order_items (order_id, ticket_type_id, quantity, unit_price) values (v_order, t_va, 2, 12000);

  -- Galería
  insert into public.gallery_photos (image_url, caption, sort_order) values
    ('/seed/galeria/foto-1.svg', 'Fiesta de Primavera · septiembre', 0),
    ('/seed/galeria/foto-2.svg', 'Noche de Vinilos · edición 6', 1),
    ('/seed/galeria/foto-3.svg', 'Cumbia en la Terraza · marzo', 2),
    ('/seed/galeria/foto-4.svg', 'Cumple de 30 de Meli', 3),
    ('/seed/galeria/foto-5.svg', 'Noche de Vinilos · edición 5', 4),
    ('/seed/galeria/foto-6.svg', 'Fiesta de fin de año 2025', 5);

  -- Consultas
  insert into public.contact_messages (name, email, event_type, estimated_date, message, is_read, created_at) values
    ('Delfina Acosta', 'delfina.acosta@example.com', 'cumpleanos', (pg_temp.seed_saturday(40, 21) at time zone 'America/Argentina/Buenos_Aires')::date,
     '¡Hola! Cumplo 30 y quiero hacer algo tipo su Noche de Vinilos pero privado, para unas 60 personas. ¿Tienen lugar o lo hacemos en una terraza? Me encantaría que haya vermú 🙌',
     false, now() - interval '5 hours'),
    ('Gonzalo Herrera', 'gonzalo.herrera@example.com', 'privado', (pg_temp.seed_saturday(30, 20) at time zone 'America/Argentina/Buenos_Aires')::date,
     'Buenas, trabajo en una agencia de diseño y queremos hacer la fiesta de fin de año del equipo (35 personas). Buscamos algo descontracturado con DJ y barra. ¿Me pasan presupuesto?',
     true, now() - interval '3 days');
end
$$;

select
  (select count(*) from public.events) as eventos,
  (select count(*) from public.orders) as ordenes,
  (select count(*) from public.tickets) as entradas,
  (select count(*) from public.gallery_photos) as fotos,
  (select count(*) from public.contact_messages) as consultas;
