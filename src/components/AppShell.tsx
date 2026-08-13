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
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 pr-20 sm:gap-4 sm:px-5 sm:pr-48">
          <Link
            href="/"
            className="shrink-0 font-display text-lg font-extrabold tracking-tight"
          >
            HUEVOS<span className="text-ambar">.</span>
          </Link>
          <span className="h-4 w-px shrink-0 bg-white/20" aria-hidden />
          <span className="min-w-0 truncate text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
            {seccion}
          </span>
        </div>
      </header>
      {children}
    </div>
  );
}
