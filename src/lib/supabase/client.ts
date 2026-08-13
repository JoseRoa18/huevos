import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

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
    const destino =
      typeof entrada === "string"
        ? entrada
        : entrada instanceof URL
          ? entrada.href
          : entrada.url;
    if (!destino.startsWith(url)) return fetch(entrada, init);
    const proxied = destino.replace(url, "/sb");
    if (typeof entrada !== "string" && !(entrada instanceof URL)) {
      return fetch(new Request(proxied, entrada), init);
    }
    return fetch(proxied, init);
  };

  return createBrowserClient(url, key, { global: { fetch: fetchViaProxy } });
}

export const supabaseConfigurado = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
