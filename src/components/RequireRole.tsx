"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase/client";

type Rol = "admin" | "vendedor" | "cliente";

/**
 * Protege una vista por rol. El admin siempre tiene acceso.
 * Sin Supabase configurado (modo demo) deja pasar para poder probar la UI.
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
      <main className="flex min-h-screen items-center justify-center">
        <p className="animate-pulse text-2xl">🥚 Verificando acceso…</p>
      </main>
    );
  }

  return (
    <>
      {estado === "ok" && (
        <div className="fixed right-3 top-3 z-40 flex items-center gap-2 rounded-full border-2 border-cascara bg-white px-3 py-1 text-sm shadow">
          <span className="font-bold">{nombre}</span>
          <button onClick={salir} className="text-peligro underline">
            Salir
          </button>
        </div>
      )}
      {children}
    </>
  );
}
