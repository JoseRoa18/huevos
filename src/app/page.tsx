import Link from "next/link";

const roles = [
  {
    href: "/admin",
    emoji: "📊",
    titulo: "Administrador",
    desc: "Dashboard en vivo, inventario maestro, precios por volumen, auditoría de vendedores y aprobación de créditos.",
  },
  {
    href: "/vendedor",
    emoji: "🛵",
    titulo: "Vendedor",
    desc: "POS rápido en 3 clics, inventario de tu vehículo, registro de clientes, cobros y reporte de mermas.",
  },
  {
    href: "/cliente",
    emoji: "🏪",
    titulo: "Cliente",
    desc: "Catálogo, pedidos al mayor, repetir compras anteriores y seguimiento de tu despacho.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center gap-10 px-6 py-16">
      <header className="text-center">
        <div className="text-6xl">🥚</div>
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
          Huevos <span className="text-yema">·</span> Ventas en Tiempo Real
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-marron-suave">
          Un solo inventario central en la unidad mínima — el huevo — con tres
          vistas conectadas: administrador, vendedores y clientes.
        </p>
      </header>

      <div className="grid w-full gap-6 sm:grid-cols-3">
        {roles.map((rol) => (
          <Link
            key={rol.href}
            href={rol.href}
            className="group rounded-3xl border-2 border-cascara bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-yema hover:shadow-lg"
          >
            <div className="text-5xl">{rol.emoji}</div>
            <h2 className="mt-4 text-2xl font-bold group-hover:text-accion">
              {rol.titulo}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-marron-suave">
              {rol.desc}
            </p>
          </Link>
        ))}
      </div>

      <Link
        href="/login"
        className="btn-pos bg-accion px-10 py-4 text-xl text-white"
      >
        🔑 Iniciar sesión
      </Link>

      <footer className="text-sm text-marron-suave">
        1 Cartón = 30 · 1 Caja = 360 · 1 Paleta = 4.320 huevos
      </footer>
    </main>
  );
}
