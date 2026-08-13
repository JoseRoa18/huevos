import type { NextRequest } from "next/server";

/**
 * Proxy de servidor hacia Supabase que reconstruye los headers.
 *
 * Motivo: en algunos dispositivos hay software (bloqueadores, antivirus,
 * "protectores de privacidad") que corrompe cualquier header del navegador
 * cuyo valor parezca un token, rompiendo login y datos. Este endpoint recibe
 * las credenciales por query string (?t= token en base64url, que ese software
 * no toca) y las convierte en los headers correctos del lado del servidor.
 */

const SUPABASE_URL = "https://fwxowlkgyoymyzzykbbi.supabase.co";

function decodificarB64Url(v: string): string {
  const b64 = v.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(b64, "base64").toString("utf8");
}

async function manejar(
  req: NextRequest,
  { params }: { params: Promise<{ ruta: string[] }> },
) {
  // Sanear: una variable de entorno guardada con BOM u otro carácter
  // invisible rompe los headers HTTP (ByteString solo admite ASCII/Latin-1).
  const anon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").replace(/[^\x21-\x7e]/g, "");
  if (!anon) {
    return Response.json({ error: "Supabase no configurado" }, { status: 500 });
  }

  const { ruta } = await params;
  const urlEntrante = new URL(req.url);
  const destino = new URL(`${SUPABASE_URL}/${ruta.map(encodeURIComponent).join("/")}`);

  // Parámetros de transporte propios: t (token), ct (content-type),
  // prefer y xu (x-upsert). El resto pasa tal cual a Supabase.
  urlEntrante.searchParams.forEach((v, k) => {
    if (!["t", "ct", "prefer", "xu"].includes(k)) destino.searchParams.append(k, v);
  });

  const t = urlEntrante.searchParams.get("t");
  const headers: Record<string, string> = {
    apikey: anon,
    Authorization: `Bearer ${t ? decodificarB64Url(t) : anon}`,
  };

  const ct = urlEntrante.searchParams.get("ct") ?? req.headers.get("content-type");
  if (ct) headers["Content-Type"] = ct;
  else if (!["GET", "HEAD"].includes(req.method)) headers["Content-Type"] = "application/json";

  const prefer = urlEntrante.searchParams.get("prefer") ?? req.headers.get("prefer");
  if (prefer) headers["Prefer"] = prefer;
  const xu = urlEntrante.searchParams.get("xu") ?? req.headers.get("x-upsert");
  if (xu) headers["x-upsert"] = xu;
  const rango = req.headers.get("range");
  if (rango) headers["Range"] = rango;

  const respuesta = await fetch(destino, {
    method: req.method,
    headers,
    body: ["GET", "HEAD"].includes(req.method) ? undefined : await req.arrayBuffer(),
    redirect: "manual",
  });

  const cabeceras = new Headers(respuesta.headers);
  cabeceras.delete("content-encoding");
  cabeceras.delete("content-length");
  cabeceras.delete("transfer-encoding");

  return new Response(respuesta.body, {
    status: respuesta.status,
    statusText: respuesta.statusText,
    headers: cabeceras,
  });
}

export {
  manejar as GET,
  manejar as POST,
  manejar as PUT,
  manejar as PATCH,
  manejar as DELETE,
  manejar as HEAD,
};
