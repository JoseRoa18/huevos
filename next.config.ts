import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
  // Proxy de primera parte hacia Supabase: los antivirus y bloqueadores de
  // contenido cortan peticiones cross-origin a *.supabase.co, pero no las
  // que van al propio dominio de la app.
  async rewrites() {
    if (!supabaseUrl) return [];
    return [{ source: "/sb/:path*", destination: `${supabaseUrl}/:path*` }];
  },
};

export default nextConfig;
