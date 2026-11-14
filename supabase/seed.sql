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
