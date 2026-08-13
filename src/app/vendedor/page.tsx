"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  EMPAQUES,
  type EmpaqueClave,
  type LineaVenta,
  type CategoriaCliente,
  totalHuevos,
  precioLineas,
  formatoDesglose,
} from "@/lib/units";
import { getSupabaseBrowser, supabaseConfigurado } from "@/lib/supabase/client";

const ORDEN_POS: EmpaqueClave[] = ["UNIDAD", "MEDIO_CARTON", "CARTON", "CAJA", "PALETA"];

type VentaPendiente = {
  lineas: LineaVenta[];
  categoria: CategoriaCliente;
};

export default function VendedorPOS() {
  const [carrito, setCarrito] = useState<LineaVenta[]>([]);
  const [categoria, setCategoria] = useState<CategoriaCliente>("DETAL");
  const [keypadPara, setKeypadPara] = useState<EmpaqueClave | null>(null);
  const [keypadValor, setKeypadValor] = useState("");
  const [confirmando, setConfirmando] = useState<VentaPendiente | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const huevos = useMemo(() => totalHuevos(carrito), [carrito]);
  const monto = useMemo(() => precioLineas(carrito, categoria), [carrito, categoria]);

  function agregar(empaque: EmpaqueClave, cantidad: number) {
    if (cantidad <= 0) return;
    setCarrito((prev) => {
      const existente = prev.find((l) => l.empaque === empaque);
      if (existente) {
        return prev.map((l) =>
          l.empaque === empaque ? { ...l, cantidad: l.cantidad + cantidad } : l,
        );
      }
      return [...prev, { empaque, cantidad }];
    });
  }

  function teclaKeypad(t: string) {
    if (t === "C") return setKeypadValor("");
    if (t === "⌫") return setKeypadValor((v) => v.slice(0, -1));
    setKeypadValor((v) => (v + t).slice(0, 4));
  }

  function confirmarKeypad() {
    if (keypadPara && keypadValor) agregar(keypadPara, parseInt(keypadValor, 10));
    setKeypadPara(null);
    setKeypadValor("");
  }

  async function registrarVenta() {
    if (!confirmando) return;
    setGuardando(true);

    // Geolocalización: registrar dónde se cierra la venta
    const posicion = await new Promise<GeolocationPosition | null>((resolve) => {
      if (!("geolocation" in navigator)) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (p) => resolve(p),
        () => resolve(null),
        { timeout: 4000 },
      );
    });

    const venta = {
      total_huevos: totalHuevos(confirmando.lineas),
      total_monto: precioLineas(confirmando.lineas, confirmando.categoria),
      categoria_cliente: confirmando.categoria,
      lat: posicion?.coords.latitude ?? null,
      lng: posicion?.coords.longitude ?? null,
      lineas: confirmando.lineas.map((l) => ({
        empaque: l.empaque,
        cantidad: l.cantidad,
        huevos: EMPAQUES[l.empaque].huevos * l.cantidad,
      })),
    };

    const supabase = getSupabaseBrowser();
    if (supabase) {
      const { error } = await supabase.rpc("registrar_venta", { venta });
      setMensaje(
        error
          ? `⚠️ Error al sincronizar: ${error.message}. La venta quedó pendiente.`
          : `✅ Venta registrada y sincronizada: ${formatoDesglose(venta.total_huevos)}`,
      );
    } else {
      setMensaje(
        `✅ Venta registrada (modo demo, sin Supabase): ${formatoDesglose(venta.total_huevos)} · $${venta.total_monto.toFixed(2)}`,
      );
    }

    setCarrito([]);
    setConfirmando(null);
    setGuardando(false);
  }

  return (
    <main className="mx-auto min-h-screen max-w-md px-4 py-6">
      <header className="flex items-center justify-between">
        <Link href="/" className="text-sm text-marron-suave">← Inicio</Link>
        <h1 className="text-xl font-extrabold">🛵 POS Vendedor</h1>
        {!supabaseConfigurado && (
          <span className="rounded-full bg-yema-suave px-2 py-1 text-xs font-bold">DEMO</span>
        )}
      </header>

      {/* Categoría del cliente: asigna precios automáticamente */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        {(["DETAL", "MAYORISTA", "VIP"] as CategoriaCliente[]).map((c) => (
          <button
            key={c}
            onClick={() => setCategoria(c)}
            className={`btn-pos py-3 text-sm ${
              categoria === c
                ? "bg-marron text-white"
                : "border-2 border-cascara bg-white"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Botones grandes: venta en menos de 3 clics */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        {ORDEN_POS.map((clave) => {
          const e = EMPAQUES[clave];
          return (
            <button
              key={clave}
              onClick={() => agregar(clave, 1)}
              onContextMenu={(ev) => {
                ev.preventDefault();
                setKeypadPara(clave);
              }}
              className="btn-pos flex flex-col items-center gap-1 bg-yema py-6 text-marron"
            >
              <span className="text-3xl">{e.emoji}</span>
              <span className="text-lg">{e.nombre}</span>
              <span className="text-xs opacity-70">{e.huevos} huevos</span>
            </button>
          );
        })}
        <button
          onClick={() => setKeypadPara("CARTON")}
          className="btn-pos border-4 border-dashed border-yema bg-white py-6 text-lg"
        >
          🔢 Cantidad…
        </button>
      </div>

      {/* Carrito */}
      <section className="mt-5 rounded-2xl border-2 border-cascara bg-white p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-marron-suave">Carrito</h2>
        {carrito.length === 0 ? (
          <p className="mt-2 text-marron-suave">Toca un empaque para agregar.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {carrito.map((l) => (
              <li key={l.empaque} className="flex items-center justify-between text-lg">
                <span>
                  {EMPAQUES[l.empaque].emoji} {l.cantidad} × {EMPAQUES[l.empaque].nombre}
                </span>
                <button
                  onClick={() =>
                    setCarrito((prev) => prev.filter((x) => x.empaque !== l.empaque))
                  }
                  className="text-peligro"
                  aria-label={`Quitar ${EMPAQUES[l.empaque].nombre}`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 border-t border-cascara pt-3 text-lg font-bold">
          <div className="flex justify-between">
            <span>Total huevos</span>
            <span>{huevos.toLocaleString("es")}</span>
          </div>
          <div className="flex justify-between text-2xl text-accion">
            <span>Total</span>
            <span>${monto.toFixed(2)}</span>
          </div>
        </div>
      </section>

      <button
        disabled={carrito.length === 0}
        onClick={() => setConfirmando({ lineas: carrito, categoria })}
        className="btn-pos mt-4 w-full bg-accion py-5 text-2xl text-white disabled:opacity-40"
      >
        💰 VENDER
      </button>

      <Link
        href="/vendedor/merma"
        className="btn-pos mt-3 block w-full border-2 border-peligro bg-white py-3 text-center text-peligro"
      >
        🥚💔 Reportar Merma
      </Link>

      {mensaje && (
        <p className="mt-4 rounded-xl bg-white p-3 text-center text-sm shadow">{mensaje}</p>
      )}

      {/* Teclado numérico propio, grande, tipo cajero */}
      {keypadPara && (
        <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/50">
          <div className="w-full max-w-md rounded-t-3xl bg-white p-5">
            <p className="text-center text-lg font-bold">
              ¿Cuántos {EMPAQUES[keypadPara].nombre}?
            </p>
            <p className="my-3 rounded-xl bg-crema py-3 text-center text-4xl font-extrabold">
              {keypadValor || "0"}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "⌫"].map((t) => (
                <button
                  key={t}
                  onClick={() => teclaKeypad(t)}
                  className="btn-pos bg-cascara py-5 text-2xl"
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={() => { setKeypadPara(null); setKeypadValor(""); }}
                className="btn-pos border-2 border-cascara bg-white py-4 text-lg"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarKeypad}
                className="btn-pos bg-accion py-4 text-lg text-white"
              >
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmación visual antes de cerrar: evita errores de dedo */}
      {confirmando && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6">
            <h3 className="text-center text-xl font-extrabold">Confirmar venta</h3>
            <ul className="mt-4 space-y-1 text-lg">
              {confirmando.lineas.map((l) => (
                <li key={l.empaque} className="flex justify-between">
                  <span>{l.cantidad} × {EMPAQUES[l.empaque].nombre}</span>
                  <span className="text-marron-suave">
                    {(EMPAQUES[l.empaque].huevos * l.cantidad).toLocaleString("es")} huevos
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4 rounded-2xl bg-crema p-4 text-center">
              <p className="text-sm text-marron-suave">
                {formatoDesglose(totalHuevos(confirmando.lineas))} · Cliente {confirmando.categoria}
              </p>
              <p className="text-4xl font-extrabold text-accion">
                ${precioLineas(confirmando.lineas, confirmando.categoria).toFixed(2)}
              </p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => setConfirmando(null)}
                className="btn-pos border-2 border-cascara bg-white py-4 text-lg"
              >
                Volver
              </button>
              <button
                onClick={registrarVenta}
                disabled={guardando}
                className="btn-pos bg-accion py-4 text-lg text-white disabled:opacity-50"
              >
                {guardando ? "Guardando…" : "✅ Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
