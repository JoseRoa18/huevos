"use client";

import { useMemo, useRef, useState } from "react";
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
import RequireRole from "@/components/RequireRole";
import AppShell from "@/components/AppShell";
import { ICONO_EMPAQUE, IcoAlerta } from "@/components/Icons";

const ORDEN_POS: EmpaqueClave[] = ["UNIDAD", "MEDIO_CARTON", "CARTON", "CAJA", "PALETA"];

const NOMBRE_CORTO: Record<EmpaqueClave, string> = {
  UNIDAD: "Unidad",
  MEDIO_CARTON: "½ Cartón",
  CARTON: "Cartón",
  CAJA: "Caja",
  PALETA: "Paleta",
};

type VentaPendiente = {
  lineas: LineaVenta[];
  categoria: CategoriaCliente;
};

function VendedorPOS() {
  const [carrito, setCarrito] = useState<LineaVenta[]>([]);
  const [categoria, setCategoria] = useState<CategoriaCliente>("DETAL");
  const [keypadPara, setKeypadPara] = useState<EmpaqueClave | null>(null);
  const [keypadValor, setKeypadValor] = useState("");
  const [confirmando, setConfirmando] = useState<VentaPendiente | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [guardando, setGuardando] = useState(false);

  const huevos = useMemo(() => totalHuevos(carrito), [carrito]);
  const monto = useMemo(() => precioLineas(carrito, categoria), [carrito, categoria]);

  // Long-press multiplataforma (iOS no dispara contextmenu): toque corto
  // agrega 1, toque sostenido (450 ms) abre el teclado de cantidad.
  const temporizador = useRef<number | null>(null);

  function iniciarPulsacion(clave: EmpaqueClave) {
    temporizador.current = window.setTimeout(() => {
      temporizador.current = null;
      setKeypadPara(clave);
    }, 450);
  }

  function soltarPulsacion(clave?: EmpaqueClave) {
    if (temporizador.current !== null) {
      clearTimeout(temporizador.current);
      temporizador.current = null;
      if (clave) agregar(clave, 1);
    }
  }

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
          ? { tipo: "error", texto: `No se pudo sincronizar la venta: ${error.message}` }
          : { tipo: "ok", texto: `Venta registrada: ${formatoDesglose(venta.total_huevos)} · $${venta.total_monto.toFixed(2)}` },
      );
    } else {
      setMensaje({
        tipo: "ok",
        texto: `Venta registrada en modo demostración: ${formatoDesglose(venta.total_huevos)} · $${venta.total_monto.toFixed(2)}`,
      });
    }

    setCarrito([]);
    setConfirmando(null);
    setGuardando(false);
  }

  return (
    <AppShell seccion="Punto de venta">
      <main className="mx-auto max-w-md px-4 py-6 pb-28">
        {!supabaseConfigurado && (
          <p className="mb-4 rounded-md border-l-2 border-ambar bg-panal px-3 py-2 text-xs font-semibold text-ambar-oscuro">
            Modo demostración: las ventas no se sincronizan.
          </p>
        )}

        {/* Categoría del cliente: define la lista de precios */}
        <p className="eyebrow">Tipo de cliente</p>
        <div className="mt-2 grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-borde bg-borde">
          {(["DETAL", "MAYORISTA", "VIP"] as CategoriaCliente[]).map((c) => (
            <button
              key={c}
              onClick={() => setCategoria(c)}
              className={`cursor-pointer py-3 text-sm font-bold tracking-wide transition-colors ${
                categoria === c
                  ? "bg-tinta text-white"
                  : "bg-superficie text-tinta-suave hover:text-tinta"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Empaques: objetivo táctil grande, venta en tres toques */}
        <p className="eyebrow mt-6">Agregar al despacho</p>
        <div className="mt-2 grid grid-cols-2 gap-2.5">
          {ORDEN_POS.map((clave) => {
            const e = EMPAQUES[clave];
            const Icono = ICONO_EMPAQUE[clave];
            return (
              <button
                key={clave}
                onPointerDown={() => iniciarPulsacion(clave)}
                onPointerUp={() => soltarPulsacion(clave)}
                onPointerLeave={() => soltarPulsacion()}
                onPointerCancel={() => soltarPulsacion()}
                onContextMenu={(ev) => ev.preventDefault()}
                className="btn-tactil border border-borde bg-superficie p-4 text-left hover:border-ambar"
              >
                <Icono className="h-7 w-7 text-ambar-oscuro" />
                <p className="mt-2.5 font-display text-base font-bold leading-tight">
                  {clave === "CAJA" ? "Caja" : clave === "PALETA" ? "Paleta" : e.nombre}
                </p>
                <p className="text-xs tabular-nums text-tinta-suave">
                  {e.huevos.toLocaleString("es")} {e.huevos === 1 ? "huevo" : "huevos"}
                </p>
              </button>
            );
          })}
          <button
            onClick={() => setKeypadPara("CARTON")}
            className="btn-tactil border border-dashed border-tinta-suave/50 bg-transparent p-4 text-left hover:border-ambar"
          >
            <p className="font-display text-2xl font-bold text-tinta-suave">123</p>
            <p className="mt-1 text-sm font-semibold">Otra cantidad</p>
            <p className="text-xs text-tinta-suave">abre el teclado y elige empaque</p>
          </button>
        </div>

        {/* Despacho actual */}
        <section className="mt-6 rounded-lg border border-borde bg-superficie">
          <p className="border-b border-borde px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-tinta-suave">
            Despacho actual
          </p>
          {carrito.length === 0 ? (
            <p className="px-4 py-5 text-sm text-tinta-suave">
              Sin líneas todavía. Toca un empaque para agregar uno; mantén el
              dedo sobre el botón para indicar la cantidad.
            </p>
          ) : (
            <ul>
              {carrito.map((l) => (
                <li
                  key={l.empaque}
                  className="flex items-center justify-between border-b border-borde px-4 py-3 last:border-0"
                >
                  <span className="text-base">
                    <span className="font-display font-bold tabular-nums">{l.cantidad} ×</span>{" "}
                    {EMPAQUES[l.empaque].nombre}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-sm tabular-nums text-tinta-suave">
                      {(EMPAQUES[l.empaque].huevos * l.cantidad).toLocaleString("es")}
                    </span>
                    <button
                      onClick={() =>
                        setCarrito((prev) => prev.filter((x) => x.empaque !== l.empaque))
                      }
                      className="cursor-pointer rounded px-1.5 text-lg leading-none text-tinta-suave hover:text-rojo"
                      aria-label={`Quitar ${EMPAQUES[l.empaque].nombre}`}
                    >
                      ×
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-borde bg-papel px-4 py-3">
            <div className="flex justify-between text-sm">
              <span className="text-tinta-suave">Total en unidad mínima</span>
              <span className="font-semibold tabular-nums">{huevos.toLocaleString("es")} huevos</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="font-semibold">Total {categoria.toLowerCase()}</span>
              <span className="font-display text-3xl font-extrabold tabular-nums text-verde">
                ${monto.toFixed(2)}
              </span>
            </div>
          </div>
        </section>

        <button
          disabled={carrito.length === 0}
          onClick={() => setConfirmando({ lineas: carrito, categoria })}
          className="btn-tactil mt-4 w-full cursor-pointer bg-verde py-4 text-xl text-white hover:bg-verde-oscuro disabled:opacity-40"
        >
          Registrar venta
        </button>

        <Link
          href="/vendedor/merma"
          className="btn-tactil mt-3 flex w-full cursor-pointer items-center justify-center gap-2 border border-rojo/40 bg-superficie py-3 text-rojo hover:border-rojo"
        >
          <IcoAlerta className="h-5 w-5" />
          Reportar merma
        </Link>

        {mensaje && (
          <p
            className={`mt-4 rounded-md border-l-2 p-3 text-sm font-medium ${
              mensaje.tipo === "ok"
                ? "border-verde bg-verde/5 text-verde-oscuro"
                : "border-rojo bg-rojo/5 text-rojo"
            }`}
          >
            {mensaje.texto}
          </p>
        )}

        {/* Teclado numérico propio: teclas grandes tipo cajero */}
        {keypadPara && (
          <div className="fixed inset-0 z-20 flex items-end justify-center bg-tinta/60">
            <div className="w-full max-w-md rounded-t-xl border-t border-borde bg-superficie p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
              <p className="eyebrow">Cantidad de</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {ORDEN_POS.map((k) => (
                  <button
                    key={k}
                    onClick={() => setKeypadPara(k)}
                    className={`btn-tactil px-3 py-2 text-sm ${
                      k === keypadPara
                        ? "bg-tinta text-white"
                        : "border border-borde bg-papel text-tinta-suave"
                    }`}
                  >
                    {NOMBRE_CORTO[k]}
                  </button>
                ))}
              </div>
              <p className="my-3 rounded-md bg-papel py-3 text-center font-display text-4xl font-extrabold tabular-nums">
                {keypadValor || "0"}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "⌫"].map((t) => (
                  <button
                    key={t}
                    onClick={() => teclaKeypad(t)}
                    className="btn-tactil cursor-pointer border border-borde bg-papel py-4 text-2xl tabular-nums hover:border-ambar"
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  onClick={() => { setKeypadPara(null); setKeypadValor(""); }}
                  className="btn-tactil cursor-pointer border border-borde bg-superficie py-3.5 text-base"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarKeypad}
                  className="btn-tactil cursor-pointer bg-tinta py-3.5 text-base text-white"
                >
                  Agregar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmación antes de cerrar: evita errores de dedo */}
        {confirmando && (
          <div className="fixed inset-0 z-30 flex items-center justify-center bg-tinta/60 px-4">
            <div className="w-full max-w-md rounded-xl border border-borde bg-superficie p-6">
              <p className="eyebrow">Confirmar venta · Cliente {confirmando.categoria.toLowerCase()}</p>
              <ul className="mt-4 space-y-1.5">
                {confirmando.lineas.map((l) => (
                  <li key={l.empaque} className="flex justify-between text-base">
                    <span>
                      <span className="font-display font-bold tabular-nums">{l.cantidad} ×</span>{" "}
                      {EMPAQUES[l.empaque].nombre}
                    </span>
                    <span className="tabular-nums text-tinta-suave">
                      {(EMPAQUES[l.empaque].huevos * l.cantidad).toLocaleString("es")}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 rounded-lg bg-papel p-4">
                <p className="text-sm text-tinta-suave">
                  {formatoDesglose(totalHuevos(confirmando.lineas))}
                </p>
                <p className="mt-1 font-display text-4xl font-extrabold tabular-nums text-verde">
                  ${precioLineas(confirmando.lineas, confirmando.categoria).toFixed(2)}
                </p>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <button
                  onClick={() => setConfirmando(null)}
                  className="btn-tactil cursor-pointer border border-borde bg-superficie py-3.5 text-base"
                >
                  Volver
                </button>
                <button
                  onClick={registrarVenta}
                  disabled={guardando}
                  className="btn-tactil cursor-pointer bg-verde py-3.5 text-base text-white hover:bg-verde-oscuro disabled:opacity-50"
                >
                  {guardando ? "Registrando…" : "Confirmar venta"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </AppShell>
  );
}

export default function Page() {
  return (
    <RequireRole roles={["vendedor"]}>
      <VendedorPOS />
    </RequireRole>
  );
}
