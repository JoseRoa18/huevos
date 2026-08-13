"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";

/**
 * Página de diagnóstico de conectividad. Se abre en cualquier dispositivo
 * con problemas y ejecuta las mismas llamadas que hace el login, mostrando
 * el resultado exacto de cada una. No expone ningún dato sensible.
 */

type Resultado = {
  nombre: string;
  detalle: string;
  estado: "probando" | "ok" | "fallo";
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

async function probar(
  nombre: string,
  fn: () => Promise<string>,
): Promise<Resultado> {
  try {
    const detalle = await fn();
    return { nombre, detalle, estado: "ok" };
  } catch (e) {
    const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    return { nombre, detalle: msg, estado: "fallo" };
  }
}

export default function Diagnostico() {
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [info, setInfo] = useState<string[]>([]);

  useEffect(() => {
    setInfo([
      `Dominio: ${window.location.origin}`,
      `Navegador: ${navigator.userAgent}`,
      `Conexión reportada: ${navigator.onLine ? "en línea" : "sin conexión"}`,
      `Supabase configurado: ${SUPABASE_URL ? "sí" : "no"}`,
    ]);

    (async () => {
      const pruebas: [string, () => Promise<string>][] = [
        [
          "1. Proxy del dominio (GET /sb/auth/v1/health)",
          async () => {
            const r = await fetch("/sb/auth/v1/health", {
              headers: { apikey: ANON },
            });
            return `HTTP ${r.status} — ${(await r.text()).slice(0, 80)}`;
          },
        ],
        [
          "2. Proxy del dominio (POST, como el login)",
          async () => {
            const r = await fetch("/sb/auth/v1/token?grant_type=password", {
              method: "POST",
              headers: { apikey: ANON, "Content-Type": "application/json" },
              body: JSON.stringify({ email: "diagnostico@x.com", password: "x" }),
            });
            // 400 = el POST llegó al servidor y respondió (credenciales falsas a propósito)
            return `HTTP ${r.status} — el POST llega y el servidor responde`;
          },
        ],
        [
          "3. Conexión directa a Supabase (sin proxy)",
          async () => {
            const r = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
              headers: { apikey: ANON },
            });
            return `HTTP ${r.status} — directa también funciona`;
          },
        ],
      ];

      for (const [nombre, fn] of pruebas) {
        setResultados((prev) => [...prev, { nombre, detalle: "…", estado: "probando" }]);
        const res = await probar(nombre, fn);
        setResultados((prev) => prev.map((p) => (p.nombre === nombre ? res : p)));
      }
    })();
  }, []);

  return (
    <AppShell seccion="Diagnóstico de conexión">
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="font-display text-2xl font-bold">Diagnóstico de conexión</h1>
        <p className="mt-1 text-sm text-tinta-suave">
          Ejecuta las mismas llamadas que hace el inicio de sesión. Envía una
          captura de esta pantalla a soporte.
        </p>

        <section className="mt-5 overflow-hidden rounded-lg border border-borde bg-superficie">
          {resultados.map((r) => (
            <div key={r.nombre} className="border-b border-borde px-4 py-3.5 last:border-0">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">{r.nombre}</p>
                <span
                  className={`shrink-0 rounded px-2 py-0.5 text-xs font-bold uppercase ${
                    r.estado === "ok"
                      ? "bg-verde/10 text-verde"
                      : r.estado === "fallo"
                        ? "bg-rojo/10 text-rojo"
                        : "bg-panal text-ambar-oscuro"
                  }`}
                >
                  {r.estado === "ok" ? "Pasa" : r.estado === "fallo" ? "Falla" : "…"}
                </span>
              </div>
              <p className="mt-1 break-all font-mono text-xs text-tinta-suave">{r.detalle}</p>
            </div>
          ))}
        </section>

        <section className="mt-5 rounded-lg border border-borde bg-superficie p-4">
          <p className="eyebrow">Información del dispositivo</p>
          <ul className="mt-2 space-y-1">
            {info.map((l) => (
              <li key={l} className="break-all font-mono text-xs text-tinta-suave">{l}</li>
            ))}
          </ul>
        </section>
      </main>
    </AppShell>
  );
}
