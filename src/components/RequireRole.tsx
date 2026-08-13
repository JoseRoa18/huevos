"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase/client";

type Rol = "admin" | "vendedor" | "cliente";

/**
 * Protege una vista por rol. El admin siempre tiene acceso.
 * Sin Supabase configurado (modo demostración) deja pasar para probar la UI.
 */
export default function RequireRole({
  roles,
  children,
}: {
  roles: Rol[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [estado, setEstado] = useState<"cargando" | "ok" | "demo">("cargando");
  const [nombre, setNombre] = useState("");
  const rolesClave = roles.join("|");

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setEstado("demo");
      return;
    }
    let activo = true;

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login");
        return;
      }
      const { data: perfil } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", session.user.id)
        .single();
      if (!activo) return;

      const rol = (perfil?.role ?? "cliente") as Rol;
      if (rol !== "admin" && !rolesClave.split("|").includes(rol)) {
        router.replace("/login?error=permiso");
        return;
      }
      setNombre(perfil?.full_name || session.user.email || "");
      setEstado("ok");
    })();

    return () => {
      activo = false;
    };
  }, [rolesClave, router]);

  async function salir() {
    await getSupabaseBrowser()?.auth.signOut();
    router.replace("/login");
  }

  if (estado === "cargando") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-papel">
        <p className="animate-pulse text-sm font-semibold uppercase tracking-[0.16em] text-tinta-suave">
          Verificando sesión…
        </p>
      </main>
    );
  }

  return (
    <div className="relative">
      {estado === "ok" && (
        <div className="absolute right-5 top-0 z-40 flex h-14 items-center gap-3 text-sm text-white/85">
          <span className="font-semibold">{nombre}</span>
          <button
            onClick={salir}
            className="cursor-pointer rounded border border-white/25 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide hover:border-white/60"
          >
            Salir
          </button>
        </div>
      )}
      {children}
    </div>
  );
}
