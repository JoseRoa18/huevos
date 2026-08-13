"use client";

import { useMemo, useState } from "react";
import {
  EMPAQUES,
  type EmpaqueClave,
  type LineaVenta,
  totalHuevos,
  precioLineas,
  formatoDesglose,
} from "@/lib/units";
import { supabaseConfigurado } from "@/lib/supabase/client";
import AppShell from "@/components/AppShell";
import { ICONO_EMPAQUE } from "@/components/Icons";

const CATALOGO: EmpaqueClave[] = ["MEDIO_CARTON", "CARTON", "CAJA", "PALETA"];

const PEDIDO_ANTERIOR: LineaVenta[] = [
  { empaque: "CAJA", cantidad: 5 },
  { empaque: "CARTON", cantidad: 2 },
];

function PortalCliente() {
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
        ? "Pedido enviado. Te avisaremos cuando entre en despacho."
        : `Pedido registrado en modo demostración: ${formatoDesglose(huevos)} · $${monto.toFixed(2)}`,
    );
    setPedido([]);
  }

  return (
    <AppShell seccion="Portal de pedidos">
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="font-display text-2xl font-bold">Nuevo pedido</h1>
        <p className="mt-1 text-sm text-tinta-suave">
          Precios de lista mayorista. El total se confirma al despachar.
        </p>

        <button
          onClick={() => { setPedido(PEDIDO_ANTERIOR); setMensaje(null); }}
          className="btn-tactil mt-5 w-full cursor-pointer border border-ambar/50 bg-panal px-4 py-3.5 text-left hover:border-ambar"
        >
          <span className="eyebrow">Tu pedido anterior</span>
          <span className="mt-0.5 block font-semibold">
            5 cajas + 2 cartones — repetir con un toque
          </span>
        </button>

        {/* Catálogo */}
        <section className="mt-5 overflow-hidden rounded-lg border border-borde bg-superficie">
          {CATALOGO.map((clave) => {
            const e = EMPAQUES[clave];
            const Icono = ICONO_EMPAQUE[clave];
            const cant = cantidadDe(clave);
            return (
              <div
                key={clave}
                className="flex items-center justify-between border-b border-borde px-4 py-3.5 last:border-0"
              >
                <div className="flex items-center gap-3.5">
                  <Icono className="h-7 w-7 text-ambar-oscuro" />
                  <div>
                    <p className="font-display text-base font-bold">{e.nombre}</p>
                    <p className="text-xs tabular-nums text-tinta-suave">
                      {e.huevos.toLocaleString("es")} huevos
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => cambiar(clave, -1)}
                    className="btn-tactil h-11 w-11 cursor-pointer border border-borde bg-papel text-xl hover:border-ambar"
                    aria-label={`Quitar un ${e.nombre}`}
                  >
                    −
                  </button>
                  <span className="w-8 text-center font-display text-xl font-extrabold tabular-nums">
                    {cant}
                  </span>
                  <button
                    onClick={() => cambiar(clave, 1)}
                    className="btn-tactil h-11 w-11 cursor-pointer border border-borde bg-papel text-xl hover:border-ambar"
                    aria-label={`Agregar un ${e.nombre}`}
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </section>

        {/* Resumen */}
        <section className="mt-5 rounded-lg border border-borde bg-superficie p-4">
          <div className="flex justify-between text-sm">
            <span className="text-tinta-suave">Total en unidad mínima</span>
            <span className="font-semibold tabular-nums">{huevos.toLocaleString("es")} huevos</span>
          </div>
          <div className="mt-1 flex justify-between text-sm">
            <span className="text-tinta-suave">Equivalencia</span>
            <span className="tabular-nums">{formatoDesglose(huevos)}</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between border-t border-borde pt-3">
            <span className="font-semibold">Total mayorista</span>
            <span className="font-display text-3xl font-extrabold tabular-nums text-verde">
              ${monto.toFixed(2)}
            </span>
          </div>
        </section>

        <button
          disabled={pedido.length === 0}
          onClick={enviarPedido}
          className="btn-tactil mt-4 w-full cursor-pointer bg-verde py-4 text-xl text-white hover:bg-verde-oscuro disabled:opacity-40"
        >
          Enviar pedido
        </button>

        {mensaje && (
          <p className="mt-4 rounded-md border-l-2 border-verde bg-verde/5 p-3 text-sm font-medium text-verde-oscuro">
            {mensaje}
          </p>
        )}
      </main>
    </AppShell>
  );
}

export default function Page() {
  return <PortalCliente />;
}
