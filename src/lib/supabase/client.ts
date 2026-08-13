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
 * Réplica mínima de fetch sobre XMLHttpRequest. Se usa cuando el fetch del
 * navegador fue envuelto por software externo (bloqueadores, antivirus) que
 * corrompe los headers; el canal XHR no pasa por esos envoltorios.
 */
export function fetchPorXhr(url: string, init?: RequestInit): Promise<Response> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open((init?.method ?? "GET").toUpperCase(), url, true);
    xhr.responseType = "arraybuffer";
    const hs = init?.headers;
    if (hs) {
      const entradas: [string, string][] =
        hs instanceof Headers
          ? Array.from(hs.entries())
          : Array.isArray(hs)
            ? (hs as [string, string][])
            : (Object.entries(hs) as [string, string][]);
      for (const [k, v] of entradas) {
        try {
          xhr.setRequestHeader(k, String(v));
        } catch {
          // Un header inválido no debe tumbar toda la petición.
        }
      }
    }
    xhr.onload = () => {
      const cabeceras = new Headers();
      for (const linea of xhr.getAllResponseHeaders().trim().split(/\r?\n/)) {
        const sep = linea.indexOf(":");
        if (sep > 0) {
          try {
            cabeceras.append(linea.slice(0, sep).trim(), linea.slice(sep + 1).trim());
          } catch {}
        }
      }
      const sinCuerpo = [101, 204, 205, 304].includes(xhr.status);
      resolve(
        new Response(sinCuerpo ? null : xhr.response, {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: cabeceras,
        }),
      );
    };
    xhr.onerror = () => reject(new TypeError("Fallo de red (XHR)"));
    xhr.ontimeout = () => reject(new TypeError("Tiempo de espera agotado (XHR)"));
    xhr.send((init?.body as XMLHttpRequestBodyInit | null | undefined) ?? null);
  });
}

function esErrorDeHeadersCorruptos(e: unknown): boolean {
  return (
    e instanceof TypeError &&
    /ISO-8859-1|Failed to read the 'headers'/i.test(e.message)
  );
}

/**
 * Cliente de Supabase para componentes del navegador.
 * Devuelve null si las variables de entorno no están configuradas todavía
 * (modo demostración): la app sigue funcionando con datos locales.
 *
 * Las peticiones HTTP (auth, datos, storage) se enrutan por el propio dominio
 * (/sb -> Supabase, ver next.config.ts) para que bloqueadores de contenido y
 * antivirus no las corten. Si aun así el fetch del navegador está saboteado
 * (envoltorios que corrompen headers), se reintenta por XMLHttpRequest.
 * El websocket de realtime va directo a Supabase: no usa fetch y el proxy
 * de Vercel no reenvía websockets.
 */
export function getSupabaseBrowser(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const fetchViaProxy: typeof fetch = async (entrada, init) => {
    const hacerFetch = obtenerFetchConfiable();
    const destino =
      typeof entrada === "string"
        ? entrada
        : entrada instanceof URL
          ? entrada.href
          : entrada.url;
    const objetivo = destino.startsWith(url) ? destino.replace(url, "/sb") : destino;
    try {
      if (typeof entrada !== "string" && !(entrada instanceof URL) && objetivo !== destino) {
        return await hacerFetch(new Request(objetivo, entrada), init);
      }
      return await hacerFetch(objetivo === destino ? entrada : objetivo, init);
    } catch (e) {
      if (esErrorDeHeadersCorruptos(e)) {
        return fetchPorXhr(objetivo, init);
      }
      throw e;
    }
  };

  return createBrowserClient(url, key, { global: { fetch: fetchViaProxy } });
}

export const supabaseConfigurado = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
