-- ============================================================
-- HUEVOS · Migración 5: el usuario edita su propio perfil
-- Ejecutar en: Supabase Dashboard -> SQL Editor
-- ============================================================

alter table public.profiles
  add column if not exists telefono text,
  add column if not exists direccion text;

-- Cada usuario puede actualizar su propia fila...
create policy "editar mi perfil" on public.profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- ...pero solo las columnas de datos personales: el rol queda fuera
-- del alcance (nadie puede auto-ascenderse a admin).
revoke update on table public.profiles from authenticated, anon;
grant update (full_name, telefono, direccion) on table public.profiles to authenticated;
