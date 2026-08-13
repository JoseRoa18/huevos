"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import {
  ICONO_EMPAQUE,
  IcoCarrito,
  IcoLista,
  IcoRecibo,
  IcoUsuario,
} from "@/components/Icons";

const CATALOGO: EmpaqueClave[] = ["MEDIO_CARTON", "CARTON", "CAJA", "PALETA"];

type Pestana = "pedir" | "pedidos" | "facturas" | "perfil";

type Pedido = {
  id: string;
  total_huevos: number;
  total_monto: number;
  estado: string;
  lineas: LineaVenta[];
  created_at: string;
};

type Factura = {
  numero: number;
  monto: number;
  pagada: boolean;
  created_at: string;
  pedido: {
    total_huevos: number;
    lineas: LineaVenta[];
    created_at: string;
  } | null;
};

const ESTADO_PEDIDO: Record<string, { texto: string; clase: string }> = {
  PENDIENTE: { texto: "Pendiente", clase: "bg-panal text-ambar-oscuro" },
  CONFIRMADO: { texto: "Confirmado", clase: "bg-tinta/10 text-tinta" },
  EN_DESPACHO: { texto: "En despacho", clase: "bg-tinta text-white" },
  ENTREGADO: { texto: "Entregado", clase: "bg-verde/10 text-verde" },
  CANCELADO: { texto: "Cancelado", clase: "bg-rojo/10 text-rojo" },
};

const DEMO_PEDIDOS: Pedido[] = [
  {
    id: "demo-1",
    total_huevos: 1860,
    total_monto: 390.6,
    estado: "ENTREGADO",
    lineas: [
      { empaque: "CAJA", cantidad: 5 },
      { empaque: "CARTON", cantidad: 2 },
    ],
    created_at: "2026-08-06T10:00:00Z",
  },
];

function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString("es", { day: "2-digit", month: "short" });
}

function PortalCliente() {
  const router = useRouter();
  const [pestana, setPestana] = useState<Pestana>("pedir");
  const [pedidoActual, setPedidoActual] = useState<LineaVenta[]>([]);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [facturaAbierta, setFacturaAbierta] = useState<Factura | null>(null);
  const [categoria, setCategoria] = useState<CategoriaCliente>("MAYORISTA");
  const [perfil, setPerfil] = useState({
    nombre: "Cliente (demo)",
    correo: "demo@ejemplo.com",
    telefono: "",
    direccion: "",
  });
  const [formPerfil, setFormPerfil] = useState({
    nombre: "",
    correo: "",
    telefono: "",
    direccion: "",
    passwordNueva: "",
  });
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [faltaMigracion, setFaltaMigracion] = useState(false);

  const huevos = useMemo(() => totalHuevos(pedidoActual), [pedidoActual]);
  const monto = useMemo(() => precioLineas(pedidoActual, categoria), [pedidoActual, categoria]);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setPedidos(DEMO_PEDIDOS);
      return;
    }
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const [{ data: prof }, { data: cust }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", session.user.id).single(),
        supabase.from("customers").select("categoria").eq("profile_id", session.user.id).maybeSingle(),
      ]);
      const datos = {
        nombre: prof?.full_name || session.user.email || "Cliente",
        correo: session.user.email ?? "",
        telefono: prof?.telefono ?? "",
        direccion: prof?.direccion ?? "",
      };
      setPerfil(datos);
      setFormPerfil({ ...datos, passwordNueva: "" });
      if (cust?.categoria) setCategoria(cust.categoria as CategoriaCliente);

      const { data: peds, error } = await supabase
        .from("pedidos")
        .select("id, total_huevos, total_monto, estado, lineas, created_at")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) {
        if (error.code === "42P01") setFaltaMigracion(true);
        return;
      }
      setPedidos((peds ?? []) as Pedido[]);

      const { data: facts } = await supabase
        .from("facturas")
        .select("numero, monto, pagada, created_at, pedido:pedidos(total_huevos, lineas, created_at)")
        .order("created_at", { ascending: false })
        .limit(30);
      setFacturas((facts ?? []) as unknown as Factura[]);
    })();
  }, []);

  function cambiar(empaque: EmpaqueClave, delta: number) {
    setPedidoActual((prev) => {
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
    return pedidoActual.find((l) => l.empaque === empaque)?.cantidad ?? 0;
  }

  function repetir(p: Pedido) {
    setPedidoActual(p.lineas.map((l) => ({ ...l })));
    setMensaje(null);
    setPestana("pedir");
  }

  async function enviarPedido() {
    if (pedidoActual.length === 0) return;
    setEnviando(true);
    const supabase = getSupabaseBrowser();

    if (supabase) {
      const { data, error } = await supabase
        .from("pedidos")
        .insert({
          total_huevos: huevos,
          total_monto: monto,
          lineas: pedidoActual,
        })
        .select("id, total_huevos, total_monto, estado, lineas, created_at")
        .single();
      if (error) {
        setMensaje({
          tipo: "error",
          texto:
            error.code === "42P01"
              ? "El módulo de pedidos aún no está activo en el servidor (falta la migración 00003)."
              : `No se pudo enviar el pedido: ${error.message}`,
        });
        setEnviando(false);
        return;
      }
      setPedidos((prev) => [data as Pedido, ...prev]);
      setMensaje({
        tipo: "ok",
        texto: "Pedido enviado. Puedes seguir su estado en Mis pedidos.",
      });
    } else {
      setMensaje({
        tipo: "ok",
        texto: `Pedido registrado en modo demostración: ${formatoDesglose(huevos)} · $${monto.toFixed(2)}`,
      });
    }
    setPedidoActual([]);
    setEnviando(false);
  }

  async function guardarPerfil(e: React.FormEvent) {
    e.preventDefault();
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setMensaje({ tipo: "ok", texto: "Perfil actualizado (modo demostración)." });
      return;
    }
    setGuardandoPerfil(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: formPerfil.nombre.trim(),
        telefono: formPerfil.telefono.trim() || null,
        direccion: formPerfil.direccion.trim() || null,
      })
      .eq("id", session.user.id);

    if (error) {
      setMensaje({
        tipo: "error",
        texto:
          error.code === "42703" || error.code === "42501"
            ? "La edición de perfil aún no está activa en el servidor (falta la migración 00005)."
            : `No se pudo guardar: ${error.message}`,
      });
      setGuardandoPerfil(false);
      return;
    }

    const avisos: string[] = ["Datos guardados."];

    const nuevoCorreo = formPerfil.correo.trim().toLowerCase();
    if (nuevoCorreo && nuevoCorreo !== perfil.correo.toLowerCase()) {
      const { error: errCorreo } = await supabase.auth.updateUser({ email: nuevoCorreo });
      avisos.push(
        errCorreo
          ? `El correo no se pudo cambiar: ${errCorreo.message}`
          : "Te enviamos un enlace de confirmación al correo nuevo: el cambio se aplica al confirmarlo.",
      );
    }

    if (formPerfil.passwordNueva.trim()) {
      const { error: errPass } = await supabase.auth.updateUser({
        password: formPerfil.passwordNueva.trim(),
      });
      avisos.push(
        errPass
          ? `La contraseña no se pudo cambiar: ${errPass.message}`
          : "Contraseña actualizada.",
      );
    }

    setPerfil((prev) => ({
      ...prev,
      nombre: formPerfil.nombre.trim(),
      telefono: formPerfil.telefono.trim(),
      direccion: formPerfil.direccion.trim(),
    }));
    setFormPerfil((prev) => ({ ...prev, passwordNueva: "" }));
    setMensaje({ tipo: "ok", texto: avisos.join(" ") });
    setGuardandoPerfil(false);
  }

  async function cerrarSesion() {
    await getSupabaseBrowser()?.auth.signOut();
    router.replace("/login");
  }

  const pestanas: { clave: Pestana; nombre: string; Icono: (p: { className?: string }) => React.ReactNode }[] = [
    { clave: "pedir", nombre: "Pedir", Icono: IcoCarrito },
    { clave: "pedidos", nombre: "Mis pedidos", Icono: IcoLista },
    { clave: "facturas", nombre: "Facturas", Icono: IcoRecibo },
    { clave: "perfil", nombre: "Perfil", Icono: IcoUsuario },
  ];

  return (
    <AppShell seccion="Portal de pedidos">
      <main className="mx-auto max-w-2xl px-4 py-6 pb-28">
        {faltaMigracion && (
          <p className="mb-4 rounded-md border-l-2 border-ambar bg-panal p-3 text-sm">
            El módulo de pedidos aún no está activo: ejecuta{" "}
            <code>supabase/migrations/00003_pedidos.sql</code> en el SQL Editor.
          </p>
        )}

        {/* ---------- PEDIR ---------- */}
        {pestana === "pedir" && (
          <>
            <h1 className="font-display text-2xl font-bold">Nuevo pedido</h1>
            <p className="mt-1 text-sm text-tinta-suave">
              Precios de lista {categoria.toLowerCase()}. El total se confirma al despachar.
            </p>

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
                        className="btn-tactil h-11 w-11 border border-borde bg-papel text-xl hover:border-ambar"
                        aria-label={`Quitar un ${e.nombre}`}
                      >
                        −
                      </button>
                      <span className="w-8 text-center font-display text-xl font-extrabold tabular-nums">
                        {cant}
                      </span>
                      <button
                        onClick={() => cambiar(clave, 1)}
                        className="btn-tactil h-11 w-11 border border-borde bg-papel text-xl hover:border-ambar"
                        aria-label={`Agregar un ${e.nombre}`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </section>

            <section className="mt-5 rounded-lg border border-borde bg-superficie p-4">
              <div className="flex justify-between text-sm">
                <span className="text-tinta-suave">Total en unidad mínima</span>
                <span className="font-semibold tabular-nums">
                  {huevos.toLocaleString("es")} huevos
                </span>
              </div>
              <div className="mt-1 flex justify-between text-sm">
                <span className="text-tinta-suave">Equivalencia</span>
                <span className="tabular-nums">{formatoDesglose(huevos)}</span>
              </div>
              <div className="mt-3 flex items-baseline justify-between border-t border-borde pt-3">
                <span className="font-semibold">Total</span>
                <span className="font-display text-3xl font-extrabold tabular-nums text-verde">
                  ${monto.toFixed(2)}
                </span>
              </div>
            </section>

            <button
              disabled={pedidoActual.length === 0 || enviando}
              onClick={enviarPedido}
              className="btn-tactil mt-4 w-full bg-verde py-4 text-xl text-white hover:bg-verde-oscuro disabled:opacity-40"
            >
              {enviando ? "Enviando…" : "Enviar pedido"}
            </button>
          </>
        )}

        {/* ---------- MIS PEDIDOS ---------- */}
        {pestana === "pedidos" && (
          <>
            <h1 className="font-display text-2xl font-bold">Mis pedidos</h1>
            {pedidos.length === 0 ? (
              <p className="mt-6 rounded-lg border border-borde bg-superficie p-6 text-center text-sm text-tinta-suave">
                Todavía no tienes pedidos. Arma el primero en la pestaña Pedir.
              </p>
            ) : (
              <section className="mt-4 space-y-3">
                {pedidos.map((p) => {
                  const estado = ESTADO_PEDIDO[p.estado] ?? ESTADO_PEDIDO.PENDIENTE;
                  return (
                    <div key={p.id} className="rounded-lg border border-borde bg-superficie p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm text-tinta-suave">{fechaCorta(p.created_at)}</p>
                        <span className={`rounded px-2 py-0.5 text-xs font-bold uppercase ${estado.clase}`}>
                          {estado.texto}
                        </span>
                      </div>
                      <p className="mt-2 font-semibold">{formatoDesglose(p.total_huevos)}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="font-display text-xl font-extrabold tabular-nums text-verde">
                          ${Number(p.total_monto).toFixed(2)}
                        </span>
                        <button
                          onClick={() => repetir(p)}
                          className="btn-tactil border border-borde bg-papel px-4 py-2 text-sm hover:border-ambar"
                        >
                          Repetir pedido
                        </button>
                      </div>
                    </div>
                  );
                })}
              </section>
            )}
          </>
        )}

        {/* ---------- FACTURAS ---------- */}
        {pestana === "facturas" && (
          <>
            <h1 className="font-display text-2xl font-bold">Mis facturas</h1>
            <p className="mt-1 text-sm text-tinta-suave">
              Se emiten automáticamente cuando tu pedido es entregado.
            </p>
            {facturas.length === 0 ? (
              <p className="mt-6 rounded-lg border border-borde bg-superficie p-6 text-center text-sm text-tinta-suave">
                Aún no tienes facturas emitidas.
              </p>
            ) : (
              <div className="mt-4 overflow-hidden rounded-lg border border-borde bg-superficie">
                {facturas.map((f) => (
                  <button
                    key={f.numero}
                    onClick={() => setFacturaAbierta(f)}
                    className="flex w-full cursor-pointer touch-manipulation items-center justify-between border-b border-borde px-4 py-3.5 text-left last:border-0 hover:bg-papel"
                  >
                    <div>
                      <p className="font-display font-bold tabular-nums">
                        F-{String(f.numero).padStart(6, "0")}
                      </p>
                      <p className="text-xs text-tinta-suave">
                        {fechaCorta(f.created_at)} · toca para ver el detalle
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-lg font-extrabold tabular-nums">
                        ${Number(f.monto).toFixed(2)}
                      </p>
                      <span
                        className={`text-xs font-bold uppercase ${
                          f.pagada ? "text-verde" : "text-ambar-oscuro"
                        }`}
                      >
                        {f.pagada ? "Pagada" : "Por pagar"}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* ---------- DETALLE DE FACTURA (imprimible) ---------- */}
        {facturaAbierta && (
          <div className="fixed inset-0 z-40 overflow-y-auto bg-tinta/60 px-4 py-8 print:static print:overflow-visible print:bg-transparent print:p-0">
            <div className="imprimible mx-auto max-w-md rounded-lg bg-white p-6 shadow-xl print:max-w-none print:rounded-none print:p-0 print:shadow-none">
              {/* Encabezado */}
              <div className="flex items-start justify-between border-b-2 border-tinta pb-4">
                <div>
                  <p className="font-display text-2xl font-extrabold tracking-tight">
                    HUEVOS<span className="text-ambar">.</span>
                  </p>
                  <p className="text-xs text-tinta-suave">Sistema de distribución</p>
                </div>
                <div className="text-right">
                  <p className="eyebrow">Factura</p>
                  <p className="font-display text-xl font-extrabold tabular-nums">
                    F-{String(facturaAbierta.numero).padStart(6, "0")}
                  </p>
                </div>
              </div>

              {/* Datos */}
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="eyebrow">Cliente</p>
                  <p className="mt-0.5 font-semibold">{perfil.nombre}</p>
                  <p className="text-xs text-tinta-suave">{perfil.correo}</p>
                </div>
                <div className="text-right">
                  <p className="eyebrow">Emitida</p>
                  <p className="mt-0.5 font-semibold">
                    {new Date(facturaAbierta.created_at).toLocaleDateString("es", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  <span
                    className={`text-xs font-bold uppercase ${
                      facturaAbierta.pagada ? "text-verde" : "text-ambar-oscuro"
                    }`}
                  >
                    {facturaAbierta.pagada ? "Pagada" : "Por pagar"}
                  </span>
                </div>
              </div>

              {/* Líneas */}
              <table className="mt-5 w-full text-sm">
                <thead>
                  <tr className="border-b border-borde text-[11px] uppercase tracking-wider text-tinta-suave">
                    <th className="py-2 text-left font-bold">Detalle</th>
                    <th className="py-2 text-right font-bold">Cant.</th>
                    <th className="py-2 text-right font-bold">Huevos</th>
                    <th className="py-2 text-right font-bold">Importe</th>
                  </tr>
                </thead>
                <tbody>
                  {(facturaAbierta.pedido?.lineas ?? []).map((l) => {
                    const totalPedido = facturaAbierta.pedido?.total_huevos ?? 1;
                    const huevosLinea = EMPAQUES[l.empaque].huevos * l.cantidad;
                    const importe =
                      (huevosLinea / totalPedido) * Number(facturaAbierta.monto);
                    return (
                      <tr key={l.empaque} className="border-b border-borde/60">
                        <td className="py-2.5">{EMPAQUES[l.empaque].nombre}</td>
                        <td className="py-2.5 text-right tabular-nums">{l.cantidad}</td>
                        <td className="py-2.5 text-right tabular-nums">
                          {huevosLinea.toLocaleString("es")}
                        </td>
                        <td className="py-2.5 text-right font-semibold tabular-nums">
                          ${importe.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Totales */}
              <div className="mt-4 space-y-1 text-sm">
                <div className="flex justify-between text-tinta-suave">
                  <span>Total en unidad mínima</span>
                  <span className="tabular-nums">
                    {(facturaAbierta.pedido?.total_huevos ?? 0).toLocaleString("es")} huevos
                  </span>
                </div>
                <div className="flex justify-between text-tinta-suave">
                  <span>Equivalencia</span>
                  <span>{formatoDesglose(facturaAbierta.pedido?.total_huevos ?? 0)}</span>
                </div>
                <div className="mt-2 flex items-baseline justify-between border-t-2 border-tinta pt-2">
                  <span className="font-bold">Total</span>
                  <span className="font-display text-3xl font-extrabold tabular-nums">
                    ${Number(facturaAbierta.monto).toFixed(2)}
                  </span>
                </div>
              </div>

              <p className="mt-6 border-t border-borde pt-3 text-center text-xs text-tinta-suave">
                Gracias por su compra · distrihuevos.vercel.app
              </p>

              {/* Acciones: no salen en la impresión */}
              <div className="mt-5 grid grid-cols-2 gap-2 print:hidden">
                <button
                  onClick={() => setFacturaAbierta(null)}
                  className="btn-tactil border border-borde bg-superficie py-3 text-base"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => window.print()}
                  className="btn-tactil bg-tinta py-3 text-base text-white"
                >
                  Imprimir / PDF
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ---------- PERFIL ---------- */}
        {pestana === "perfil" && (
          <>
            <h1 className="font-display text-2xl font-bold">Mi perfil</h1>
            <p className="mt-1 text-sm text-tinta-suave">
              Lista de precios asignada:{" "}
              <span className="font-semibold capitalize">{categoria.toLowerCase()}</span>
            </p>

            <form
              onSubmit={guardarPerfil}
              className="mt-4 space-y-4 rounded-lg border border-borde bg-superficie p-5"
            >
              <label className="block">
                <span className="eyebrow">Nombre o negocio</span>
                <input
                  type="text"
                  required
                  value={formPerfil.nombre}
                  onChange={(e) => setFormPerfil({ ...formPerfil, nombre: e.target.value })}
                  className="mt-1.5 w-full rounded-md border border-borde p-3.5 text-lg"
                  placeholder="Panadería El Trigo"
                />
              </label>

              <label className="block">
                <span className="eyebrow">Teléfono de contacto</span>
                <input
                  type="tel"
                  inputMode="tel"
                  value={formPerfil.telefono}
                  onChange={(e) => setFormPerfil({ ...formPerfil, telefono: e.target.value })}
                  className="mt-1.5 w-full rounded-md border border-borde p-3.5 text-lg"
                  placeholder="0414-1234567"
                />
              </label>

              <label className="block">
                <span className="eyebrow">Dirección de entrega</span>
                <textarea
                  rows={2}
                  value={formPerfil.direccion}
                  onChange={(e) => setFormPerfil({ ...formPerfil, direccion: e.target.value })}
                  className="mt-1.5 w-full rounded-md border border-borde p-3 text-base"
                  placeholder="Calle, local, referencia…"
                />
              </label>

              <label className="block">
                <span className="eyebrow">Correo</span>
                <input
                  type="email"
                  required
                  autoCapitalize="none"
                  value={formPerfil.correo}
                  onChange={(e) => setFormPerfil({ ...formPerfil, correo: e.target.value })}
                  className="mt-1.5 w-full rounded-md border border-borde p-3.5 text-lg"
                />
                <span className="mt-1 block text-xs text-tinta-suave">
                  Si lo cambias, te llega un enlace de confirmación al correo nuevo.
                </span>
              </label>

              <label className="block">
                <span className="eyebrow">Nueva contraseña (opcional)</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                  value={formPerfil.passwordNueva}
                  onChange={(e) =>
                    setFormPerfil({ ...formPerfil, passwordNueva: e.target.value })
                  }
                  className="mt-1.5 w-full rounded-md border border-borde p-3.5 text-lg"
                  placeholder="Déjala vacía para no cambiarla"
                />
              </label>

              <button
                type="submit"
                disabled={guardandoPerfil}
                className="btn-tactil w-full bg-verde py-3.5 text-lg text-white hover:bg-verde-oscuro disabled:opacity-50"
              >
                {guardandoPerfil ? "Guardando…" : "Guardar cambios"}
              </button>
            </form>

            <button
              onClick={cerrarSesion}
              className="btn-tactil mt-4 w-full border border-rojo/40 bg-superficie py-3.5 text-rojo hover:border-rojo"
            >
              Cerrar sesión
            </button>

            {!supabaseConfigurado && (
              <p className="mt-4 text-center text-xs text-tinta-suave">
                Modo demostración: datos de ejemplo.
              </p>
            )}
          </>
        )}

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
      </main>

      {/* Navegación inferior tipo app */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-borde bg-superficie pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto grid max-w-2xl grid-cols-4">
          {pestanas.map(({ clave, nombre, Icono }) => {
            const activa = pestana === clave;
            const enCarrito = clave === "pedir" && pedidoActual.length > 0;
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
                  {enCarrito && (
                    <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-verde px-1 text-[10px] font-bold text-white">
                      {pedidoActual.reduce((a, l) => a + l.cantidad, 0)}
                    </span>
                  )}
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
    <RequireRole roles={["cliente"]}>
      <PortalCliente />
    </RequireRole>
  );
}
