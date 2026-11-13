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
