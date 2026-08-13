import Link from "next/link";
import AppShell from "@/components/AppShell";
import { IcoGrafica, IcoCamion, IcoTienda, IcoFlecha, ICONO_EMPAQUE } from "@/components/Icons";
import { EMPAQUES, type EmpaqueClave } from "@/lib/units";

const ROLES = [
  {
    href: "/admin",
    Icono: IcoGrafica,
    titulo: "Administración",
    desc: "Inventario maestro, transferencias a vehículos, precios por volumen y auditoría de la operación en vivo.",
  },
  {
    href: "/vendedor",
    Icono: IcoCamion,
    titulo: "Fuerza de ventas",
    desc: "Punto de venta en tres toques, inventario del vehículo asignado, cobros y registro de mermas.",
  },
  {
    href: "/cliente",
    Icono: IcoTienda,
    titulo: "Clientes",
    desc: "Pedidos al mayor para panaderías, bodegas y minimarkets, con historial para repetir compras.",
  },
];

const ORDEN: EmpaqueClave[] = ["UNIDAD", "MEDIO_CARTON", "CARTON", "CAJA", "PALETA"];

export default function Home() {
  return (
    <AppShell seccion="Sistema de distribución">
      <main className="mx-auto max-w-6xl px-5">
        {/* Tesis del sistema */}
        <section className="border-b border-borde py-14 sm:py-20">
          <p className="eyebrow">Ventas e inventario en tiempo real</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            Toda la operación, contada en la unidad que importa: el huevo.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-tinta-suave">
            Un solo inventario central en la unidad mínima. Los empaques son
            presentaciones de venta: cada cartón, caja o paleta despachada se
            descuenta al instante, sin descuadres.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/login"
              className="btn-tactil w-full bg-verde px-8 py-3.5 text-center text-lg text-white hover:bg-verde-oscuro sm:w-auto"
            >
              Iniciar sesión
            </Link>
            <span className="text-sm text-tinta-suave">
              Administración · Vendedores · Clientes
            </span>
          </div>
        </section>

        {/* La unidad mínima: tabla de equivalencias como pieza central */}
        <section className="border-b border-borde py-10">
          <p className="eyebrow">Equivalencias del sistema</p>
          <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-borde bg-borde sm:grid-cols-5">
            {ORDEN.map((clave) => {
              const e = EMPAQUES[clave];
              const Icono = ICONO_EMPAQUE[clave];
              return (
                <div key={clave} className="bg-superficie p-4">
                  <Icono className="h-6 w-6 text-ambar-oscuro" />
                  <p className="mt-3 font-display text-2xl font-extrabold tabular-nums">
                    {e.huevos.toLocaleString("es")}
                  </p>
                  <p className="text-xs font-semibold uppercase tracking-wide text-tinta-suave">
                    {clave === "CAJA" ? "Caja · 12 cartones" : clave === "PALETA" ? "Paleta · al mayor" : e.nombre}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Accesos por rol */}
        <section className="py-10">
          <p className="eyebrow">Vistas del sistema</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {ROLES.map(({ href, Icono, titulo, desc }) => (
              <Link
                key={href}
                href={href}
                className="group rounded-lg border border-borde bg-superficie p-6 transition-colors hover:border-ambar"
              >
                <Icono className="h-7 w-7 text-tinta" />
                <h2 className="mt-4 flex items-center gap-2 font-display text-xl font-bold">
                  {titulo}
                  <IcoFlecha className="h-4 w-4 text-ambar opacity-0 transition-opacity group-hover:opacity-100" />
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-tinta-suave">{desc}</p>
              </Link>
            ))}
          </div>
        </section>

        <footer className="border-t border-borde py-6 text-xs text-tinta-suave">
          Inventario sincronizado en tiempo real · Acceso según rol asignado
        </footer>
      </main>
    </AppShell>
  );
}
