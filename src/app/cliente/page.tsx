"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  EMPAQUES,
  type EmpaqueClave,
  type LineaVenta,
  totalHuevos,
  precioLineas,
  formatoDesglose,
} from "@/lib/units";
import { supabaseConfigurado } from "@/lib/supabase/client";

const CATALOGO: EmpaqueClave[] = ["MEDIO_CARTON", "CARTON", "CAJA", "PALETA"];

const PEDIDO_ANTERIOR: LineaVenta[] = [
  { empaque: "CAJA", cantidad: 5 },
  { empaque: "CARTON", cantidad: 2 },
];

export default function PortalCliente() {
  const [pedido, setPedido] = useState<LineaVenta[]>([]);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const huevos = useMemo(() => totalHuevos(pedido), [pedido]);
  const monto = useMemo(() => precioLineas(pedido, "MAYORISTA"), [pedido]);

  function cambiar(empaque: EmpaqueClave, delta: number) {
    setPedido((prev) => {
      const linea = prev.find((l) => l.empaque === empaque);
      const nueva = (linea?.cantidad ?? 0) + delta;
      if (nueva <= 0) return prev.filter((l) => l.empaque !== empaque);
      if (linea) {
        return prev.map((l) => (l.empaque === empaque ? { ...l, cantidad: nueva } : l));
      }
      return [...prev, { empaque, cantidad: nueva }];
    });
  }

  function cantidadDe(empaque: EmpaqueClave) {
    return pedido.find((l) => l.empaque === empaque)?.cantidad ?? 0;
  }

  function enviarPedido() {
    if (pedido.length === 0) return;
    setMensaje(
      supabaseConfigurado
        ? "✅ Pedido enviado. Te avisaremos cuando esté en despacho."
        : `✅ Pedido registrado (modo demo): ${formatoDesglose(huevos)} · $${monto.toFixed(2)}`,
    );
    setPedido([]);
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-6">
      <header className="flex items-center justify-between">
        <Link href="/" className="text-sm text-marron-suave">← Inicio</Link>
        <h1 className="text-xl font-extrabold">🏪 Portal del Cliente</h1>
        <span />
      </header>

      {/* Repetir compra anterior */}
      <button
        onClick={() => { setPedido(PEDIDO_ANTERIOR); setMensaje(null); }}
        className="btn-pos mt-5 w-full border-2 border-yema bg-yema-suave/40 py-4 text-lg"
      >
        🔁 Repetir mi pedido anterior (5 Cajas + 2 Cartones)
      </button>

      {/* Catálogo */}
      <section className="mt-5 space-y-3">
        {CATALOGO.map((clave) => {
          const e = EMPAQUES[clave];
          const cant = cantidadDe(clave);
          return (
            <div
              key={clave}
              className="flex items-center justify-between rounded-2xl border-2 border-cascara bg-white p-4"
            >
              <div>
                <p className="text-lg font-bold">{e.emoji} {e.nombre}</p>
                <p className="text-sm text-marron-suave">{e.huevos.toLocaleString("es")} huevos</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => cambiar(clave, -1)}
                  className="btn-pos h-12 w-12 bg-cascara text-2xl"
                  aria-label={`Quitar ${e.nombre}`}
                >
                  −
                </button>
                <span className="w-8 text-center text-2xl font-extrabold">{cant}</span>
                <button
                  onClick={() => cambiar(clave, 1)}
                  className="btn-pos h-12 w-12 bg-yema text-2xl"
                  aria-label={`Agregar ${e.nombre}`}
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </section>

      {/* Resumen y confirmación */}
      <section className="mt-5 rounded-2xl border-2 border-cascara bg-white p-4">
        <div className="flex justify-between text-lg">
          <span>Total huevos</span>
          <span className="font-bold">{huevos.toLocaleString("es")}</span>
        </div>
        <div className="flex justify-between text-sm text-marron-suave">
          <span>Equivalencia</span>
          <span>{formatoDesglose(huevos)}</span>
        </div>
        <div className="mt-2 flex justify-between border-t border-cascara pt-2 text-2xl font-extrabold text-accion">
          <span>Total (precio mayorista)</span>
          <span>${monto.toFixed(2)}</span>
        </div>
      </section>

      <button
        disabled={pedido.length === 0}
        onClick={enviarPedido}
        className="btn-pos mt-4 w-full bg-accion py-5 text-2xl text-white disabled:opacity-40"
      >
        📦 Enviar Pedido
      </button>

      {mensaje && (
        <p className="mt-4 rounded-xl bg-white p-3 text-center text-sm shadow">{mensaje}</p>
      )}
    </main>
  );
}
