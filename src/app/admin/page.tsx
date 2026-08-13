"use client";

import { useEffect, useState } from "react";
import { formatoDesglose } from "@/lib/units";
import { getSupabaseBrowser, supabaseConfigurado } from "@/lib/supabase/client";
import RequireRole from "@/components/RequireRole";
import AppShell from "@/components/AppShell";
import DesgloseBar from "@/components/DesgloseBar";
import {
  IcoAlmacen,
  IcoCamion,
  IcoCarrito,
  IcoGrafica,
  IcoLista,
} from "@/components/Icons";

type Pestana = "resumen" | "pedidos" | "inventario" | "ventas";

type Almacen = { nombre: string; tipo: string; huevos: number };
type VentaReciente = { hora: string; vendedor: string; huevos: number; monto: number };

type PedidoAdmin = {
  id: string;
  total_huevos: number;
  total_monto: number;
  estado: string;
  created_at: string;
  cliente: { full_name: string } | null;
};

type FacturaAdmin = {
  id: string;
  numero: number;
  monto: number;
  pagada: boolean;
  created_at: string;
  pedido: { cliente: { full_name: string } | null } | null;
};

const SIGUIENTE_ESTADO: Record<string, { estado: string; accion: string }> = {
  PENDIENTE: { estado: "CONFIRMADO", accion: "Confirmar" },
  CONFIRMADO: { estado: "EN_DESPACHO", accion: "Despachar" },
  EN_DESPACHO: { estado: "ENTREGADO", accion: "Marcar entregado" },
};

const CLASE_ESTADO: Record<string, string> = {
  PENDIENTE: "bg-panal text-ambar-oscuro",
  CONFIRMADO: "bg-tinta/10 text-tinta",
  EN_DESPACHO: "bg-tinta text-white",
  ENTREGADO: "bg-verde/10 text-verde",
  CANCELADO: "bg-rojo/10 text-rojo",
};

// Datos de demostración mientras Supabase no está conectado
const DEMO_ALMACENES: Almacen[] = [
  { nombre: "Almacén Central", tipo: "almacén", huevos: 51840 },
  { nombre: "Camión — Vendedor 1", tipo: "vehículo", huevos: 4320 },
];

const DEMO_VENTAS: VentaReciente[] = [
  { hora: "10:42", vendedor: "Vendedor 1", huevos: 750, monto: 157.5 },
  { hora: "10:05", vendedor: "Vendedor 1", huevos: 30, monto: 7.5 },
];

function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString("es", { day: "2-digit", month: "short" });
}

function AdminDashboard() {
  const [pestana, setPestana] = useState<Pestana>("resumen");
  const [almacenes, setAlmacenes] = useState<Almacen[]>(DEMO_ALMACENES);
  const [ventas, setVentas] = useState<VentaReciente[]>(DEMO_VENTAS);
  const [pedidos, setPedidos] = useState<PedidoAdmin[]>([]);
  const [facturas, setFacturas] = useState<FacturaAdmin[]>([]);
  const [enVivo, setEnVivo] = useState(false);
  const [gestionando, setGestionando] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;

    async function cargar() {
      const [{ data: stock }, { data: ultimas }, { data: peds }, { data: facts }] =
        await Promise.all([
          supabase!.from("stock_por_almacen").select("nombre, tipo, huevos"),
          supabase!
            .from("ventas_recientes")
            .select("hora, vendedor, huevos, monto")
            .limit(10),
          supabase!
            .from("pedidos")
            .select("id, total_huevos, total_monto, estado, created_at, cliente:profiles(full_name)")
            .order("created_at", { ascending: false })
            .limit(20),
          supabase!
            .from("facturas")
            .select("id, numero, monto, pagada, created_at, pedido:pedidos(cliente:profiles(full_name))")
            .order("created_at", { ascending: false })
            .limit(20),
        ]);
      if (stock) setAlmacenes(stock as Almacen[]);
      if (ultimas) setVentas(ultimas as VentaReciente[]);
      if (peds) setPedidos(peds as unknown as PedidoAdmin[]);
      if (facts) setFacturas(facts as unknown as FacturaAdmin[]);
      setEnVivo(true);
    }
    cargar();

    // Sincronización en tiempo real: ventas, stock y pedidos refrescan el panel
    const canal = supabase
      .channel("dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "sales" }, cargar)
      .on("postgres_changes", { event: "*", schema: "public", table: "stock" }, cargar)
      .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, cargar)
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, []);

  async function avanzarPedido(p: PedidoAdmin, nuevoEstado: string) {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    setGestionando(p.id);
    const { error } = await supabase
      .from("pedidos")
      .update({ estado: nuevoEstado })
      .eq("id", p.id);
    if (!error) {
      setPedidos((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, estado: nuevoEstado } : x)),
      );
      if (nuevoEstado === "ENTREGADO") {
        const { data: facts } = await supabase
          .from("facturas")
          .select("id, numero, monto, pagada, created_at, pedido:pedidos(cliente:profiles(full_name))")
          .order("created_at", { ascending: false })
          .limit(20);
        if (facts) setFacturas(facts as unknown as FacturaAdmin[]);
      }
    }
    setGestionando(null);
  }

  async function marcarPagada(f: FacturaAdmin) {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    setGestionando(f.id);
    const { error } = await supabase
      .from("facturas")
      .update({ pagada: true })
      .eq("id", f.id);
    if (!error) {
      setFacturas((prev) =>
        prev.map((x) => (x.id === f.id ? { ...x, pagada: true } : x)),
      );
    }
    setGestionando(null);
  }

  const totalHuevos = almacenes.reduce((a, x) => a + x.huevos, 0);
  const ventasHoy = ventas.reduce((a, v) => a + v.monto, 0);
  const pendientes = pedidos.filter((p) =>
    ["PENDIENTE", "CONFIRMADO", "EN_DESPACHO"].includes(p.estado),
  ).length;
  const porCobrar = facturas.filter((f) => !f.pagada).length;

  const pestanas: { clave: Pestana; nombre: string; Icono: (p: { className?: string }) => React.ReactNode; badge?: number }[] = [
    { clave: "resumen", nombre: "Resumen", Icono: IcoGrafica },
    { clave: "pedidos", nombre: "Pedidos", Icono: IcoLista, badge: pendientes + porCobrar },
    { clave: "inventario", nombre: "Inventario", Icono: IcoAlmacen },
    { clave: "ventas", nombre: "Ventas", Icono: IcoCarrito },
  ];

  return (
    <AppShell seccion="Panel de operaciones">
      <main className="mx-auto max-w-6xl px-4 py-6 pb-28 sm:px-5">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold capitalize">{pestana}</h1>
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

        {/* ---------- RESUMEN ---------- */}
        {pestana === "resumen" && (
          <>
            <section className="mt-5 grid gap-px overflow-hidden rounded-lg border border-borde bg-borde sm:grid-cols-3">
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
                <p className="eyebrow">Pedidos activos</p>
                <p className="mt-2 font-display text-4xl font-extrabold tabular-nums">
                  {pendientes}
                </p>
                <p className="mt-3 text-xs text-tinta-suave">
                  {porCobrar} factura{porCobrar === 1 ? "" : "s"} por cobrar
                </p>
              </div>
            </section>

            {pendientes > 0 && (
              <button
                onClick={() => setPestana("pedidos")}
                className="btn-tactil mt-4 w-full border border-ambar/50 bg-panal px-4 py-3.5 text-left hover:border-ambar"
              >
                <span className="font-semibold">
                  {pendientes} pedido{pendientes === 1 ? "" : "s"} esperando gestión
                </span>
                <span className="ml-2 text-sm text-tinta-suave">→ ir a Pedidos</span>
              </button>
            )}
          </>
        )}

        {/* ---------- PEDIDOS Y FACTURAS ---------- */}
        {pestana === "pedidos" && (
          <>
            {pedidos.length === 0 ? (
              <p className="mt-5 rounded-lg border border-borde bg-superficie p-6 text-center text-sm text-tinta-suave">
                Sin pedidos por ahora. Aparecerán aquí en tiempo real cuando un
                cliente ordene desde su portal.
              </p>
            ) : (
              <section className="mt-5 space-y-3">
                {pedidos.map((p) => {
                  const paso = SIGUIENTE_ESTADO[p.estado];
                  return (
                    <div key={p.id} className="rounded-lg border border-borde bg-superficie p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold">
                          {p.cliente?.full_name ?? "Cliente"}
                          <span className="ml-2 text-xs font-normal tabular-nums text-tinta-suave">
                            {fechaCorta(p.created_at)}
                          </span>
                        </p>
                        <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-bold uppercase ${CLASE_ESTADO[p.estado] ?? ""}`}>
                          {p.estado.replaceAll("_", " ").toLowerCase()}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm text-tinta-suave">
                        {formatoDesglose(p.total_huevos)}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <span className="font-display text-xl font-extrabold tabular-nums text-verde">
                          ${Number(p.total_monto).toFixed(2)}
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {(p.estado === "PENDIENTE" || p.estado === "CONFIRMADO") && (
                            <button
                              onClick={() => avanzarPedido(p, "CANCELADO")}
                              disabled={gestionando === p.id}
                              className="btn-tactil border border-rojo/40 px-4 py-2 text-sm text-rojo hover:border-rojo disabled:opacity-50"
                            >
                              Cancelar
                            </button>
                          )}
                          {paso && (
                            <button
                              onClick={() => avanzarPedido(p, paso.estado)}
                              disabled={gestionando === p.id}
                              className="btn-tactil bg-verde px-4 py-2 text-sm text-white hover:bg-verde-oscuro disabled:opacity-50"
                            >
                              {gestionando === p.id ? "…" : paso.accion}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </section>
            )}

            {facturas.length > 0 && (
              <>
                <p className="eyebrow mt-8">Facturas</p>
                <section className="mt-3 space-y-3">
                  {facturas.map((f) => (
                    <div
                      key={f.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-borde bg-superficie p-4"
                    >
                      <div>
                        <p className="font-display font-bold tabular-nums">
                          F-{String(f.numero).padStart(6, "0")}
                          <span className="ml-2 text-xs font-normal text-tinta-suave">
                            {fechaCorta(f.created_at)}
                          </span>
                        </p>
                        <p className="text-sm text-tinta-suave">
                          {f.pedido?.cliente?.full_name ?? "Cliente"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-display text-lg font-extrabold tabular-nums">
                          ${Number(f.monto).toFixed(2)}
                        </span>
                        {f.pagada ? (
                          <span className="rounded bg-verde/10 px-2.5 py-1 text-xs font-bold uppercase text-verde">
                            Pagada
                          </span>
                        ) : (
                          <button
                            onClick={() => marcarPagada(f)}
                            disabled={gestionando === f.id}
                            className="btn-tactil bg-tinta px-4 py-2 text-sm text-white disabled:opacity-50"
                          >
                            {gestionando === f.id ? "…" : "Marcar pagada"}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </section>
              </>
            )}
          </>
        )}

        {/* ---------- INVENTARIO ---------- */}
        {pestana === "inventario" && (
          <section className="mt-5 space-y-3">
            {almacenes.map((a) => {
              const esVehiculo = a.tipo.startsWith("veh");
              return (
                <div key={a.nombre} className="rounded-lg border border-borde bg-superficie p-4">
                  <div className="flex items-center justify-between gap-3">
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
                    <p className="font-display text-2xl font-extrabold tabular-nums">
                      {a.huevos.toLocaleString("es")}
                    </p>
                  </div>
                  <div className="mt-3">
                    <DesgloseBar huevos={a.huevos} />
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {/* ---------- VENTAS ---------- */}
        {pestana === "ventas" && (
          <section className="mt-5 overflow-hidden rounded-lg border border-borde bg-superficie">
            {ventas.length === 0 ? (
              <p className="p-6 text-center text-sm text-tinta-suave">
                Sin ventas registradas todavía.
              </p>
            ) : (
              ventas.map((v, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between border-b border-borde px-4 py-3.5 last:border-0"
                >
                  <div>
                    <p className="font-semibold">{v.vendedor}</p>
                    <p className="text-xs tabular-nums text-tinta-suave">
                      {v.hora} · {v.huevos.toLocaleString("es")} huevos
                    </p>
                  </div>
                  <span className="font-display text-lg font-extrabold tabular-nums text-verde">
                    ${v.monto.toFixed(2)}
                  </span>
                </div>
              ))
            )}
          </section>
        )}

        {!supabaseConfigurado && (
          <p className="mt-6 rounded-md border-l-2 border-ambar bg-panal p-4 text-sm">
            Datos de demostración. Configura <code>NEXT_PUBLIC_SUPABASE_URL</code> y{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> para operar con inventario real.
          </p>
        )}
      </main>

      {/* Navegación inferior */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-borde bg-superficie pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto grid max-w-6xl grid-cols-4">
          {pestanas.map(({ clave, nombre, Icono, badge }) => {
            const activa = pestana === clave;
            return (
              <button
                key={clave}
                onClick={() => setPestana(clave)}
                className={`relative flex cursor-pointer touch-manipulation flex-col items-center gap-1 py-2.5 text-[11px] font-bold ${
                  activa ? "text-tinta" : "text-tinta-suave"
                }`}
              >
                <span className="relative">
                  <Icono className={`h-6 w-6 ${activa ? "text-ambar-oscuro" : ""}`} />
                  {badge ? (
                    <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rojo px-1 text-[10px] font-bold text-white">
                      {badge}
                    </span>
                  ) : null}
                </span>
                {nombre}
                {activa && <span className="absolute inset-x-6 top-0 h-0.5 rounded-b bg-ambar" />}
              </button>
            );
          })}
        </div>
      </nav>
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
