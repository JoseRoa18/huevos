import type { NextConfig } from "next";

// URL pública del proyecto Supabase (no es un secreto: va inlined en el
// bundle del cliente). Fija aquí para que el rewrite no dependa de cómo
// Vercel entrega las variables de entorno durante el build.
const SUPABASE_URL = "https://fwxowlkgyoymyzzykbbi.supabase.co";

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
  // Proxy de primera parte hacia Supabase: los antivirus y bloqueadores de
  // contenido cortan peticiones cross-origin a *.supabase.co, pero no las
  // que van al propio dominio de la app.
  async rewrites() {
    return [{ source: "/sb/:path*", destination: `${SUPABASE_URL}/:path*` }];
  },
};

export default nextConfig;
