"use client";

import { useState } from "react";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import RequireRole from "@/components/RequireRole";
import AppShell from "@/components/AppShell";

function ReportarMerma() {
  const [cantidad, setCantidad] = useState("");
  const [motivo, setMotivo] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const huevos = parseInt(cantidad, 10);
    if (!huevos || !motivo.trim() || !foto) {
      setMensaje({
        tipo: "error",
        texto: "Completa cantidad, justificación y foto: los tres son obligatorios.",
      });
      return;
    }
    setEnviando(true);

    const supabase = getSupabaseBrowser();
    if (supabase) {
      const ruta = `mermas/${Date.now()}-${foto.name}`;
      const subida = await supabase.storage.from("evidencias").upload(ruta, foto);
      const { error } = await supabase.from("mermas").insert({
        huevos,
        motivo,
        foto_url: subida.data?.path ?? null,
      });
      setMensaje(
        error
          ? { tipo: "error", texto: `No se pudo registrar la merma: ${error.message}` }
          : {
              tipo: "ok",
              texto: `Merma de ${huevos} huevos registrada. Se descontó del inventario sin sumar a ventas.`,
            },
      );
    } else {
      setMensaje({
        tipo: "ok",
        texto: `Merma de ${huevos} huevos registrada en modo demostración.`,
      });
    }
    setCantidad("");
    setMotivo("");
    setFoto(null);
    setEnviando(false);
  }

  return (
    <AppShell seccion="Registro de merma">
      <main className="mx-auto max-w-md px-4 py-6">
        <Link href="/vendedor" className="text-sm font-medium text-tinta-suave hover:text-tinta">
          ← Volver al punto de venta
        </Link>

        <h1 className="mt-4 font-display text-2xl font-bold">Reportar merma</h1>
        <p className="mt-1 text-sm text-tinta-suave">
          La merma descuenta inventario y no suma a ventas. Queda auditada con
          foto, justificación, responsable y hora.
        </p>

        <form
          onSubmit={enviar}
          className="mt-5 space-y-4 rounded-lg border border-borde bg-superficie p-5"
        >
          <label className="block">
            <span className="eyebrow">Huevos dañados</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-borde p-3.5 font-display text-2xl font-bold tabular-nums"
              placeholder="0"
            />
          </label>

          <label className="block">
            <span className="eyebrow">Justificación</span>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              className="mt-1.5 w-full rounded-md border border-borde p-3 text-base"
              placeholder="Qué pasó y dónde. Ej: caja golpeada al descargar en ruta."
            />
          </label>

          <label className="block">
            <span className="eyebrow">Foto de evidencia</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
              className="mt-1.5 w-full cursor-pointer rounded-md border border-dashed border-tinta-suave/50 p-3 text-sm"
            />
          </label>

          <button
            type="submit"
            disabled={enviando}
            className="btn-tactil w-full cursor-pointer bg-rojo py-3.5 text-lg text-white disabled:opacity-50"
          >
            {enviando ? "Registrando…" : "Registrar merma"}
          </button>
        </form>

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
    </AppShell>
  );
}

export default function Page() {
  return (
    <RequireRole roles={["vendedor"]}>
      <ReportarMerma />
    </RequireRole>
  );
}
