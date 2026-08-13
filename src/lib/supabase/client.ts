import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Algunas apps instaladas en teléfonos (ahorradores de datos, VPN, adware)
 * reemplazan window.fetch por una versión propia que corrompe los headers.
 * Si detectamos un fetch manipulado, rescatamos el nativo desde un iframe
 * limpio del mismo origen.
 */
let fetchConfiable: typeof fetch | null = null;

export function esFetchNativo(fn: unknown): boolean {
  try {
    return /\{\s*\[native code\]\s*\}/.test(String(fn));
  } catch {
    return false;
  }
}

export function obtenerFetchConfiable(): typeof fetch {
  if (typeof window === "undefined") return fetch;
  if (fetchConfiable) return fetchConfiable;

  if (esFetchNativo(window.fetch)) {
    fetchConfiable = window.fetch.bind(window);
    return fetchConfiable;
  }

  try {
    const marco = document.createElement("iframe");
    marco.setAttribute("aria-hidden", "true");
    marco.style.display = "none";
    document.documentElement.appendChild(marco);
    const ventana = marco.contentWindow as (Window & typeof globalThis) | null;
    if (ventana && esFetchNativo(ventana.fetch)) {
      // El iframe queda montado a propósito: su realm debe seguir vivo.
      fetchConfiable = ventana.fetch.bind(ventana);
      return fetchConfiable;
    }
    marco.remove();
  } catch {
    // Sin acceso al iframe: seguimos con el fetch disponible.
  }

  fetchConfiable = window.fetch.bind(window);
  return fetchConfiable;
}

/**
 * Cliente de Supabase para componentes del navegador.
 * Devuelve null si las variables de entorno no están configuradas todavía
 * (modo demostración): la app sigue funcionando con datos locales.
 *
 * Las peticiones HTTP (auth, datos, storage) se enrutan por el propio dominio
 * (/sb -> Supabase, ver next.config.ts) para que bloqueadores de contenido y
 * antivirus no las corten. El websocket de realtime sí va directo a Supabase:
 * no usa fetch y el proxy de Vercel no reenvía websockets.
 */
export function getSupabaseBrowser(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const fetchViaProxy: typeof fetch = (entrada, init) => {
    const hacerFetch = obtenerFetchConfiable();
    const destino =
      typeof entrada === "string"
        ? entrada
        : entrada instanceof URL
          ? entrada.href
          : entrada.url;
    if (!destino.startsWith(url)) return hacerFetch(entrada, init);
    const proxied = destino.replace(url, "/sb");
    if (typeof entrada !== "string" && !(entrada instanceof URL)) {
      return hacerFetch(new Request(proxied, entrada), init);
    }
    return hacerFetch(proxied, init);
  };

  return createBrowserClient(url, key, { global: { fetch: fetchViaProxy } });
}

export const supabaseConfigurado = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
