import Link from "next/link";

/* Barra institucional compartida por todas las vistas. */
export default function AppShell({
  seccion,
  children,
}: {
  seccion: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="bg-barra text-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-5">
          <Link
            href="/"
            className="font-display text-lg font-extrabold tracking-tight"
          >
            HUEVOS<span className="text-ambar">.</span>
          </Link>
          <span className="h-4 w-px bg-white/20" aria-hidden />
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
            {seccion}
          </span>
        </div>
      </header>
      {children}
    </div>
  );
}
