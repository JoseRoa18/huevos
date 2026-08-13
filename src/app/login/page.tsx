"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowser, supabaseConfigurado } from "@/lib/supabase/client";

const RUTA_POR_ROL: Record<string, string> = {
  admin: "/admin",
  vendedor: "/vendedor",
  cliente: "/cliente",
};

function FormularioLogin() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    params.get("error") === "permiso" ? "Tu usuario no tiene acceso a esa vista." : null,
  );
  const [entrando, setEntrando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setError("Supabase no está configurado (modo demo): las vistas están abiertas sin login.");
      return;
    }
    setEntrando(true);

    const { data, error: errorAuth } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (errorAuth || !data.user) {
      setError("Correo o contraseña incorrectos.");
      setEntrando(false);
      return;
    }

    const { data: perfil } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    router.replace(RUTA_POR_ROL[perfil?.role ?? "cliente"] ?? "/cliente");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
      <div className="text-center">
        <Link href="/" className="text-6xl">🥚</Link>
        <h1 className="mt-3 text-3xl font-extrabold">Iniciar sesión</h1>
        <p className="mt-1 text-marron-suave">Cada rol entra a su propia vista.</p>
      </div>

      <form onSubmit={entrar} className="mt-8 space-y-4 rounded-3xl border-2 border-cascara bg-white p-6 shadow-sm">
        <label className="block">
          <span className="text-sm font-bold">Correo</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border-2 border-cascara p-4 text-lg"
            placeholder="tu@correo.com"
          />
        </label>

        <label className="block">
          <span className="text-sm font-bold">Contraseña</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border-2 border-cascara p-4 text-lg"
            placeholder="••••••••"
          />
        </label>

        {error && (
          <p className="rounded-xl bg-peligro/10 p-3 text-sm font-bold text-peligro">{error}</p>
        )}

        <button
          type="submit"
          disabled={entrando}
          className="btn-pos w-full bg-accion py-4 text-xl text-white disabled:opacity-50"
        >
          {entrando ? "Entrando…" : "Entrar"}
        </button>
      </form>

      {!supabaseConfigurado && (
        <p className="mt-4 text-center text-sm text-marron-suave">
          Modo demo activo: puedes navegar sin iniciar sesión.
        </p>
      )}
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <FormularioLogin />
    </Suspense>
  );
}
