# 🥚 Huevos · Ventas e Inventario en Tiempo Real

Sistema de gestión para distribución de huevos con **inventario centralizado en la unidad mínima (el huevo)** y tres vistas conectadas a la misma base de datos:

| Rol | Ruta | Función |
| --- | --- | --- |
| **Administrador** | `/admin` | Dashboard en vivo, inventario por almacén/vehículo, ventas recientes |
| **Vendedor** | `/vendedor` | POS rápido (venta en ≤3 clics), teclado numérico propio, geolocalización, reporte de mermas |
| **Cliente** | `/cliente` | Catálogo, pedidos al mayor, repetir compra anterior |

## Equivalencias (regla de oro)

Todo se calcula en huevos. Los empaques son solo presentaciones:

| Empaque | Huevos |
| --- | --- |
| Unidad | 1 |
| Medio Cartón | 15 |
| Cartón | 30 |
| Caja (12 cartones) | 360 |
| Paleta (al mayor) | 4.320 |

> Vender "2 Cajas y 1 Cartón" descuenta **750 huevos** del inventario al instante (RPC `registrar_venta` en Postgres, atómico).

## Stack

- **Next.js 15** (App Router) + React 19 + Tailwind CSS 4
- **Supabase**: Postgres + Auth + Realtime + Storage (fotos de mermas)
- **Vercel**: hosting y despliegue continuo desde GitHub

La app funciona en **modo demo** (datos de ejemplo) mientras Supabase no esté configurado.

## Desarrollo local

```bash
npm install
npm run dev
```

## Conectar Supabase (una sola vez)

1. Crea un proyecto en [supabase.com](https://supabase.com/dashboard).
2. Abre **SQL Editor** y ejecuta el contenido de [`supabase/migrations/00001_init.sql`](supabase/migrations/00001_init.sql).
3. En **Storage**, crea un bucket llamado `evidencias` (para fotos de mermas).
4. Copia `.env.example` a `.env.local` y llena con los valores de **Project Settings → API**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Agrega esas mismas variables en Vercel: **Project → Settings → Environment Variables**.

## Estructura

```
src/
  lib/units.ts            # Core: conversión empaques <-> huevos
  lib/supabase/client.ts  # Cliente Supabase (null => modo demo)
  app/
    page.tsx              # Selector de rol
    admin/                # Dashboard en tiempo real
    vendedor/             # POS + mermas
    cliente/              # Portal de pedidos
supabase/
  migrations/00001_init.sql  # Esquema, triggers, RPC, RLS, realtime
```

## Autenticación

Login en `/login` con Supabase Auth (email + contraseña). El rol vive en la tabla
`profiles` y las vistas están protegidas con [`RequireRole`](src/components/RequireRole.tsx):
`/admin` solo admin; `/vendedor` y `/vendedor/merma` para vendedores (el admin
siempre tiene acceso). Los usuarios nuevos que se registren solos reciben rol
`cliente`; los roles `admin`/`vendedor` se asignan desde el panel de Supabase o
por la Admin API. La migración [`00002_auth.sql`](supabase/migrations/00002_auth.sql)
crea el perfil automáticamente al registrarse y endurece las vistas del dashboard.

## Roadmap

- [x] Autenticación con Supabase Auth y asignación de roles
- [ ] Soporte offline-first (cola local + sincronización)
- [ ] Mapa en vivo de ventas por GPS en el panel admin
- [ ] Límites de crédito y cobros
- [ ] Alertas de frecuencia de compra ("La Panadería El Trigo suele comprar los jueves")
