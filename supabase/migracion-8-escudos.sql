-- =====================================================================
-- Migración 8: escudos de los equipos.
-- Ejecutar UNA vez en Supabase, después de migracion-7-veedores.sql:
-- SQL Editor → New query → pegar todo → Run.
-- No toca los datos del campeonato. Si se corre dos veces, falla al principio
-- ("already exists") y no cambia nada.
-- =====================================================================

begin;

-- Nombre del archivo del escudo en el bucket "escudos", con versión para que nadie vea uno viejo
-- (equipo-12-1728150000000.webp). Vacío: el equipo todavía no tiene escudo.
alter table public.equipos
  add column escudo text check (escudo ~ '^equipo-[0-9]+-[0-9]+\.(webp|png)$');

-- Solo el superadmin cambia el escudo; el resto de la fila sigue como siempre (Franco cambia el nombre).
-- Desde el SQL Editor (sin sesión) se puede corregir a mano.
create function public.validar_cambio_escudo() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.escudo is distinct from old.escudo
    and (select auth.uid()) is not null
    and not (select public.es_superadmin()) then
    raise exception 'Los escudos los cambia solo el superadmin.';
  end if;
  return new;
end;
$$;

create trigger equipos_escudo
before update on public.equipos
for each row execute function public.validar_cambio_escudo();

-- Bucket público: cualquiera ve los escudos por su dirección, sin reglas. Hasta 100 KB, WebP o PNG.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('escudos', 'escudos', true, 102400, array['image/webp', 'image/png']);

-- Subir, leer (Storage lo pide para borrar) y borrar: solo el superadmin
create policy "Superadmin sube escudos" on storage.objects
  for insert to authenticated with check (bucket_id = 'escudos' and (select public.es_superadmin()));
create policy "Superadmin lee escudos" on storage.objects
  for select to authenticated using (bucket_id = 'escudos' and (select public.es_superadmin()));
create policy "Superadmin borra escudos" on storage.objects
  for delete to authenticated using (bucket_id = 'escudos' and (select public.es_superadmin()));

commit;
