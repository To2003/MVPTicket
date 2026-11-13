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
