"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatoDesglose } from "@/lib/units";
import { getSupabaseBrowser, supabaseConfigurado } from "@/lib/supabase/client";
import RequireRole from "@/components/RequireRole";

type Almacen = { nombre: string; tipo: string; huevos: number };
type VentaReciente = { hora: string; vendedor: string; huevos: number; monto: number };

// Datos de ejemplo mientras Supabase no está conectado
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

    // Sincronización en tiempo real: cualquier venta refresca el dashboard
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
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-8">
      <header className="flex items-center justify-between">
        <Link href="/" className="text-sm text-marron-suave">← Inicio</Link>
        <h1 className="text-2xl font-extrabold">📊 Panel Administrador</h1>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            enVivo ? "bg-accion text-white" : "bg-yema-suave"
          }`}
        >
          {enVivo ? "● EN VIVO" : supabaseConfigurado ? "conectando…" : "DEMO"}
        </span>
      </header>

      {/* Tarjetas de resumen */}
      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border-2 border-cascara bg-white p-5">
          <p className="text-sm font-bold uppercase text-marron-suave">Inventario total</p>
          <p className="mt-1 text-4xl font-extrabold">{totalHuevos.toLocaleString("es")}</p>
          <p className="mt-1 text-sm text-marron-suave">{formatoDesglose(totalHuevos)}</p>
        </div>
        <div className="rounded-2xl border-2 border-cascara bg-white p-5">
          <p className="text-sm font-bold uppercase text-marron-suave">Ventas (últimas)</p>
          <p className="mt-1 text-4xl font-extrabold text-accion">${ventasHoy.toFixed(2)}</p>
          <p className="mt-1 text-sm text-marron-suave">{ventas.length} transacciones</p>
        </div>
        <div className="rounded-2xl border-2 border-cascara bg-white p-5">
          <p className="text-sm font-bold uppercase text-marron-suave">Almacenes / Vehículos</p>
          <p className="mt-1 text-4xl font-extrabold">{almacenes.length}</p>
          <p className="mt-1 text-sm text-marron-suave">inventario asignado por unidad</p>
        </div>
      </section>

      {/* Inventario por almacén / vehículo */}
      <section className="mt-8">
        <h2 className="text-lg font-bold">Inventario por Almacén / Vehículo</h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border-2 border-cascara bg-white">
          <table className="w-full text-left">
            <thead className="bg-crema text-sm uppercase text-marron-suave">
              <tr>
                <th className="p-3">Ubicación</th>
                <th className="p-3">Tipo</th>
                <th className="p-3 text-right">Huevos</th>
                <th className="p-3">Equivalencia</th>
              </tr>
            </thead>
            <tbody>
              {almacenes.map((a) => (
                <tr key={a.nombre} className="border-t border-cascara">
                  <td className="p-3 font-bold">{a.nombre}</td>
                  <td className="p-3">{a.tipo === "vehículo" || a.tipo === "vehiculo" ? "🚚" : "🏭"} {a.tipo}</td>
                  <td className="p-3 text-right font-mono">{a.huevos.toLocaleString("es")}</td>
                  <td className="p-3 text-sm text-marron-suave">{formatoDesglose(a.huevos)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Ventas recientes */}
      <section className="mt-8">
        <h2 className="text-lg font-bold">Ventas Recientes</h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border-2 border-cascara bg-white">
          <table className="w-full text-left">
            <thead className="bg-crema text-sm uppercase text-marron-suave">
              <tr>
                <th className="p-3">Hora</th>
                <th className="p-3">Vendedor</th>
                <th className="p-3 text-right">Huevos</th>
                <th className="p-3 text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              {ventas.map((v, i) => (
                <tr key={i} className="border-t border-cascara">
                  <td className="p-3 font-mono">{v.hora}</td>
                  <td className="p-3">{v.vendedor}</td>
                  <td className="p-3 text-right font-mono">{v.huevos.toLocaleString("es")}</td>
                  <td className="p-3 text-right font-bold text-accion">${v.monto.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {!supabaseConfigurado && (
        <p className="mt-6 rounded-xl bg-yema-suave/40 p-4 text-sm">
          ⚠️ Mostrando <b>datos de ejemplo</b>. Conecta Supabase (variables{" "}
          <code>NEXT_PUBLIC_SUPABASE_URL</code> y <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>)
          para ver el inventario y las ventas en tiempo real.
        </p>
      )}
    </main>
  );
}

export default function Page() {
  return (
    <RequireRole roles={["admin"]}>
      <AdminDashboard />
    </RequireRole>
  );
}
