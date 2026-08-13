-- ============================================================
-- HUEVOS · Migración 4: el admin gestiona facturas (marcar pagada)
-- Ejecutar en: Supabase Dashboard -> SQL Editor
-- ============================================================

create policy "admin gestiona facturas" on public.facturas
  for update to authenticated
  using (public.es_admin()) with check (public.es_admin());
