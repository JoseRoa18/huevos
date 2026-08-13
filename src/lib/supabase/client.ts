import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Transporte inmune a interceptores.
 *
 * En algunos dispositivos hay software (bloqueadores, antivirus, "protectores
 * de privacidad") que corrompe cualquier header del navegador cuyo valor
 * parezca un token: el fetch falla con "String contains non ISO-8859-1 code
 * point" aunque el código sea correcto. La defensa: el navegador envía las
 * peticiones a nuestro propio endpoint /api/sb SIN NINGÚN header; las
 * credenciales viajan en la query string (base64url, que ese software no
 * toca) y el servidor reconstruye los headers reales hacia Supabase.
 */

export function esFetchNativo(fn: unknown): boolean {
  try {
    return /\{\s*\[native code\]\s*\}/.test(String(fn));
  } catch {
    return false;
  }
}

function b64url(v: string): string {
  return btoa(v).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Réplica mínima de fetch sobre XMLHttpRequest, sin headers personalizados. */
export function fetchPorXhr(url: string, init?: RequestInit): Promise<Response> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open((init?.method ?? "GET").toUpperCase(), url, true);
    xhr.responseType = "arraybuffer";
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
    /ISO-8859-1|Failed to read the 'headers'|Invalid value|Invalid header/i.test(e.message)
  );
}

/**
 * Cliente de Supabase para componentes del navegador.
 * Devuelve null si las variables de entorno no están configuradas todavía
 * (modo demostración): la app sigue funcionando con datos locales.
 *
 * Todas las peticiones HTTP van por /api/sb (mismo dominio, cero headers).
 * El websocket de realtime va directo a Supabase: no usa fetch y no lleva
 * headers del navegador.
 */
/** Quita BOM y cualquier carácter invisible de un valor de configuración. */
function sanear(v: string | undefined): string {
  return (v ?? "").replace(/[^\x21-\x7e]/g, "");
}

export function getSupabaseBrowser(): SupabaseClient | null {
  const url = sanear(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = sanear(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!url || !key) return null;

  const fetchBlindado: typeof fetch = async (entrada, init) => {
    const destino =
      typeof entrada === "string"
        ? entrada
        : entrada instanceof URL
          ? entrada.href
          : entrada.url;

    // Peticiones ajenas a Supabase: sin tocar.
    if (!destino.startsWith(url)) return fetch(entrada, init);

    // Reunir los headers que supabase-js quería mandar.
    const originales = new Headers(
      init?.headers ??
        (typeof entrada !== "string" && !(entrada instanceof URL)
          ? entrada.headers
          : undefined),
    );

    const u = new URL(destino.replace(url, "/api/sb"), window.location.origin);
    const auth = originales.get("authorization");
    if (auth?.toLowerCase().startsWith("bearer ")) {
      const token = auth.slice(7).trim();
      if (token && token !== key) u.searchParams.set("t", b64url(token));
    }
    const ct = originales.get("content-type");
    if (ct) u.searchParams.set("ct", ct);
    const prefer = originales.get("prefer");
    if (prefer) u.searchParams.set("prefer", prefer);
    const xu = originales.get("x-upsert");
    if (xu) u.searchParams.set("xu", xu);
    // Accept es crítico: .single()/.maybeSingle() piden objeto en vez de lista
    const acc = originales.get("accept");
    if (acc && acc !== "*/*") u.searchParams.set("acc", acc);

    const metodo =
      init?.method ??
      (typeof entrada !== "string" && !(entrada instanceof URL) ? entrada.method : "GET");
    const cuerpo =
      init?.body ??
      (typeof entrada !== "string" && !(entrada instanceof URL)
        ? await entrada.clone().arrayBuffer().then((b) => (b.byteLength ? b : null))
        : null);

    const limpio: RequestInit = { method: metodo, body: cuerpo ?? undefined };

    try {
      return await fetch(u.href, limpio);
    } catch (e) {
      if (esErrorDeHeadersCorruptos(e) || e instanceof TypeError) {
        return fetchPorXhr(u.href, limpio);
      }
      throw e;
    }
  };

  return createBrowserClient(url, key, { global: { fetch: fetchBlindado } });
}

export const supabaseConfigurado = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
