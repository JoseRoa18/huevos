"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowser, supabaseConfigurado } from "@/lib/supabase/client";
import { IcoCandado } from "@/components/Icons";

const RUTA_POR_ROL: Record<string, string> = {
  admin: "/admin",
  vendedor: "/vendedor",
  cliente: "/cliente",
};

/** Traduce el error real de Supabase; nunca lo esconde tras un mensaje genérico. */
function describirError(codigo: string | undefined, mensaje: string): string {
  if (codigo === "invalid_credentials") return "Correo o contraseña incorrectos.";
  if (codigo === "email_not_confirmed") return "El correo aún no está confirmado.";
  if (codigo === "over_request_rate_limit" || mensaje.toLowerCase().includes("rate limit"))
    return "Demasiados intentos desde tu conexión. Espera 5 minutos y vuelve a intentar.";
  if (mensaje.toLowerCase().includes("fetch"))
    return "Sin conexión con el servidor. Revisa tu internet e intenta de nuevo.";
  return `No se pudo iniciar sesión: ${mensaje}`;
}

function FormularioLogin() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [error, setError] = useState<string | null>(
    params.get("error") === "permiso" ? "Tu usuario no tiene acceso a esa vista." : null,
  );
  const [entrando, setEntrando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setError("Supabase no está configurado: las vistas están abiertas en modo demostración.");
      return;
    }
    setEntrando(true);

    const { data, error: errorAuth } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: password.trim(),
    });
    if (errorAuth || !data.user) {
      setError(
        errorAuth
          ? describirError(errorAuth.code, errorAuth.message)
          : "No se pudo iniciar sesión. Intenta de nuevo.",
      );
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
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-5 py-10">
      <Link href="/" className="font-display text-2xl font-extrabold tracking-tight">
        HUEVOS<span className="text-ambar">.</span>
      </Link>
      <h1 className="mt-6 font-display text-3xl font-bold">Iniciar sesión</h1>
      <p className="mt-1 text-sm text-tinta-suave">
        El sistema te llevará a la vista de tu rol.
      </p>

      <form
        onSubmit={entrar}
        className="mt-6 space-y-4 rounded-lg border border-borde bg-superficie p-6"
      >
        <label className="block">
          <span className="eyebrow">Correo</span>
          <input
            type="email"
            required
            autoComplete="email"
            autoCapitalize="none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 w-full rounded-md border border-borde bg-superficie p-3.5 text-lg"
            placeholder="nombre@empresa.com"
          />
        </label>

        <label className="block">
          <span className="eyebrow">Contraseña</span>
          <div className="relative mt-1.5">
            <input
              type={verPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              autoCapitalize="none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-borde bg-superficie p-3.5 pr-16 text-lg"
            />
            <button
              type="button"
              onClick={() => setVerPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded px-2 py-1 text-xs font-bold uppercase tracking-wide text-tinta-suave hover:text-tinta"
            >
              {verPassword ? "Ocultar" : "Ver"}
            </button>
          </div>
        </label>

        {error && (
          <p className="rounded-md border-l-2 border-rojo bg-rojo/5 p-3 text-sm font-medium text-rojo">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={entrando}
          className="btn-tactil flex w-full items-center justify-center gap-2 bg-verde py-3.5 text-lg text-white hover:bg-verde-oscuro disabled:opacity-50"
        >
          <IcoCandado className="h-5 w-5" />
          {entrando ? "Verificando…" : "Entrar"}
        </button>
      </form>

      {!supabaseConfigurado && (
        <p className="mt-4 text-center text-sm text-tinta-suave">
          Modo demostración activo: puedes navegar sin iniciar sesión.
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
