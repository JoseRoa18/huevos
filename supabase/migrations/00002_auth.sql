-- ============================================================
-- HUEVOS · Migración 2: autenticación y endurecimiento
-- Ejecutar en: Supabase Dashboard -> SQL Editor
-- ============================================================

-- Al registrarse un usuario nuevo, crear su perfil automáticamente.
-- El rol viene de user_metadata (por defecto 'cliente' para self-signup).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    case
      when new.raw_user_meta_data->>'role' in ('admin', 'vendedor', 'cliente')
        then new.raw_user_meta_data->>'role'
      else 'cliente'
    end
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Endurecer vistas del dashboard: ahora respetan RLS (requieren sesión).
-- Antes eran legibles sin login porque la app no tenía autenticación.
alter view public.stock_por_almacen set (security_invoker = on);
alter view public.ventas_recientes set (security_invoker = on);
