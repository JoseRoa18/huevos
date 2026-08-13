"use client";

import { useState } from "react";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import RequireRole from "@/components/RequireRole";

function ReportarMerma() {
  const [cantidad, setCantidad] = useState("");
  const [motivo, setMotivo] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const huevos = parseInt(cantidad, 10);
    if (!huevos || !motivo.trim() || !foto) {
      setMensaje("⚠️ La merma requiere cantidad, justificación y foto.");
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
          ? `⚠️ Error al sincronizar: ${error.message}`
          : `✅ Merma de ${huevos} huevos registrada. Descontada del inventario, sin sumar a ganancias.`,
      );
    } else {
      setMensaje(
        `✅ Merma de ${huevos} huevos registrada (modo demo). Descontada del inventario, sin sumar a ganancias.`,
      );
    }
    setCantidad("");
    setMotivo("");
    setFoto(null);
    setEnviando(false);
  }

  return (
    <main className="mx-auto min-h-screen max-w-md px-4 py-6">
      <header className="flex items-center justify-between">
        <Link href="/vendedor" className="text-sm text-marron-suave">← POS</Link>
        <h1 className="text-xl font-extrabold">🥚💔 Reportar Merma</h1>
        <span />
      </header>

      <form onSubmit={enviar} className="mt-6 space-y-4 rounded-2xl border-2 border-cascara bg-white p-5">
        <label className="block">
          <span className="text-sm font-bold">Huevos rotos / dañados</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            className="mt-1 w-full rounded-xl border-2 border-cascara p-4 text-2xl font-bold"
            placeholder="0"
          />
        </label>

        <label className="block">
          <span className="text-sm font-bold">Justificación (obligatoria)</span>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-xl border-2 border-cascara p-3 text-lg"
            placeholder="Ej: caja cayó al bajarla del camión"
          />
        </label>

        <label className="block">
          <span className="text-sm font-bold">Foto de evidencia (obligatoria)</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
            className="mt-1 w-full rounded-xl border-2 border-dashed border-cascara p-3"
          />
        </label>

        <button
          type="submit"
          disabled={enviando}
          className="btn-pos w-full bg-peligro py-4 text-xl text-white disabled:opacity-50"
        >
          {enviando ? "Enviando…" : "Registrar Merma"}
        </button>
      </form>

      {mensaje && (
        <p className="mt-4 rounded-xl bg-white p-3 text-center text-sm shadow">{mensaje}</p>
      )}
    </main>
  );
}

export default function Page() {
  return (
    <RequireRole roles={["vendedor"]}>
      <ReportarMerma />
    </RequireRole>
  );
}
