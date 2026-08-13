"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowser, supabaseConfigurado } from "@/lib/supabase/client";
import RequireRole from "@/components/RequireRole";
import AppShell from "@/components/AppShell";
import DesgloseBar from "@/components/DesgloseBar";
import { IcoAlmacen, IcoCamion } from "@/components/Icons";

type Almacen = { nombre: string; tipo: string; huevos: number };
type VentaReciente = { hora: string; vendedor: string; huevos: number; monto: number };

// Datos de demostración mientras Supabase no está conectado
const DEMO_ALMACENES: Almacen[] = [
  { nombre: "Almacén Central", tipo: "almacén", huevos: 51840 },
  { nombre: "Camión — Vendedor 1", tipo: "vehículo", huevos: 4320 },
  { nombre: "Camión — Vendedor 2", tipo: "vehículo", huevos: 2190 },
];

const DEMO_VENTAS: VentaReciente[] = [
  { hora: "10:42", vendedor: "Vendedor 1", huevos: 750, monto: 157.5 },
  { hora: "10:31", vendedor: "Vendedor 2", huevos: 360, monto: 75.6 },
  { hora: "10:05", vendedor: "Vendedor 1", huevos: 30, monto: 7.5 },
];

function AdminDashboard() {
  const [almacenes, setAlmacenes] = useState<Almacen[]>(DEMO_ALMACENES);
  const [ventas, setVentas] = useState<VentaReciente[]>(DEMO_VENTAS);
  const [enVivo, setEnVivo] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;

    async function cargar() {
      const [{ data: stock }, { data: ultimas }] = await Promise.all([
        supabase!.from("stock_por_almacen").select("nombre, tipo, huevos"),
        supabase!
          .from("ventas_recientes")
          .select("hora, vendedor, huevos, monto")
          .limit(10),
      ]);
      if (stock) setAlmacenes(stock as Almacen[]);
      if (ultimas) setVentas(ultimas as VentaReciente[]);
      setEnVivo(true);
    }
    cargar();

    // Sincronización en tiempo real: cualquier venta refresca el panel
    const canal = supabase
      .channel("dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "sales" }, cargar)
      .on("postgres_changes", { event: "*", schema: "public", table: "stock" }, cargar)
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, []);

  const totalHuevos = almacenes.reduce((a, x) => a + x.huevos, 0);
  const ventasHoy = ventas.reduce((a, v) => a + v.monto, 0);

  return (
    <AppShell seccion="Panel de operaciones">
      <main className="mx-auto max-w-6xl px-5 py-8">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold">Operación en curso</h1>
          <span
            className={`flex items-center gap-2 rounded-md border px-3 py-1 text-xs font-bold uppercase tracking-wide ${
              enVivo
                ? "border-verde/30 bg-verde/5 text-verde"
                : "border-ambar/40 bg-panal text-ambar-oscuro"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${enVivo ? "animate-pulse bg-verde" : "bg-ambar"}`}
            />
            {enVivo ? "En vivo" : supabaseConfigurado ? "Conectando" : "Demostración"}
          </span>
        </div>

        {/* Indicadores principales */}
        <section className="mt-6 grid gap-px overflow-hidden rounded-lg border border-borde bg-borde sm:grid-cols-3">
          <div className="bg-superficie p-5">
            <p className="eyebrow">Inventario total</p>
            <p className="mt-2 font-display text-4xl font-extrabold tabular-nums">
              {totalHuevos.toLocaleString("es")}
            </p>
            <div className="mt-3">
              <DesgloseBar huevos={totalHuevos} />
            </div>
          </div>
          <div className="bg-superficie p-5">
            <p className="eyebrow">Ventas registradas</p>
            <p className="mt-2 font-display text-4xl font-extrabold tabular-nums text-verde">
              ${ventasHoy.toFixed(2)}
            </p>
            <p className="mt-3 text-xs text-tinta-suave">
              {ventas.length} transacciones recientes
            </p>
          </div>
          <div className="bg-superficie p-5">
            <p className="eyebrow">Puntos de inventario</p>
            <p className="mt-2 font-display text-4xl font-extrabold tabular-nums">
              {almacenes.length}
            </p>
            <p className="mt-3 text-xs text-tinta-suave">
              almacenes y vehículos con stock asignado
            </p>
          </div>
        </section>

        {/* Inventario por punto */}
        <section className="mt-8">
          <p className="eyebrow">Inventario por almacén y vehículo</p>
          <div className="mt-3 overflow-x-auto rounded-lg border border-borde bg-superficie">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-borde text-[11px] uppercase tracking-wider text-tinta-suave">
                  <th className="px-4 py-3 font-bold">Ubicación</th>
                  <th className="px-4 py-3 text-right font-bold">Huevos</th>
                  <th className="w-2/5 px-4 py-3 font-bold">Composición</th>
                </tr>
              </thead>
              <tbody>
                {almacenes.map((a) => {
                  const esVehiculo = a.tipo.startsWith("veh");
                  return (
                    <tr key={a.nombre} className="border-b border-borde last:border-0">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          {esVehiculo ? (
                            <IcoCamion className="h-5 w-5 text-tinta-suave" />
                          ) : (
                            <IcoAlmacen className="h-5 w-5 text-tinta-suave" />
                          )}
                          <div>
                            <p className="font-semibold">{a.nombre}</p>
                            <p className="text-xs capitalize text-tinta-suave">{a.tipo}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right font-display text-lg font-bold tabular-nums">
                        {a.huevos.toLocaleString("es")}
                      </td>
                      <td className="px-4 py-3.5">
                        <DesgloseBar huevos={a.huevos} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Ventas recientes */}
        <section className="mt-8">
          <p className="eyebrow">Ventas recientes</p>
          <div className="mt-3 overflow-x-auto rounded-lg border border-borde bg-superficie">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead>
                <tr className="border-b border-borde text-[11px] uppercase tracking-wider text-tinta-suave">
                  <th className="px-4 py-3 font-bold">Hora</th>
                  <th className="px-4 py-3 font-bold">Vendedor</th>
                  <th className="px-4 py-3 text-right font-bold">Huevos</th>
                  <th className="px-4 py-3 text-right font-bold">Monto</th>
                </tr>
              </thead>
              <tbody>
                {ventas.map((v, i) => (
                  <tr key={i} className="border-b border-borde last:border-0">
                    <td className="px-4 py-3 tabular-nums text-tinta-suave">{v.hora}</td>
                    <td className="px-4 py-3 font-semibold">{v.vendedor}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {v.huevos.toLocaleString("es")}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-verde">
                      ${v.monto.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {!supabaseConfigurado && (
          <p className="mt-6 rounded-md border-l-2 border-ambar bg-panal p-4 text-sm">
            Datos de demostración. Configura <code>NEXT_PUBLIC_SUPABASE_URL</code> y{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> para operar con inventario real.
          </p>
        )}
      </main>
    </AppShell>
  );
}

export default function Page() {
  return (
    <RequireRole roles={["admin"]}>
      <AdminDashboard />
    </RequireRole>
  );
}
