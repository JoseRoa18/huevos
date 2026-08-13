import type { EmpaqueClave } from "@/lib/units";

/* Iconografía de trazo propia del negocio: huevo, empaques, logística. */

type P = { className?: string };

function Svg({ className, children }: P & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

export const IcoHuevo = ({ className }: P) => (
  <Svg className={className}>
    <path d="M12 3.5c3.2 3.9 5.5 7.3 5.5 10.3a5.5 5.5 0 0 1-11 0c0-3 2.3-6.4 5.5-10.3Z" />
  </Svg>
);

export const IcoMedioCarton = ({ className }: P) => (
  <Svg className={className}>
    <path d="M3.5 10h17v7h-17z" />
    <circle cx="7.5" cy="13.5" r="1.3" />
    <circle cx="12" cy="13.5" r="1.3" />
    <circle cx="16.5" cy="13.5" r="1.3" />
  </Svg>
);

export const IcoCarton = ({ className }: P) => (
  <Svg className={className}>
    <path d="M3.5 7.5h17v10h-17z" />
    <circle cx="7.5" cy="10.8" r="1.2" />
    <circle cx="12" cy="10.8" r="1.2" />
    <circle cx="16.5" cy="10.8" r="1.2" />
    <circle cx="7.5" cy="14.4" r="1.2" />
    <circle cx="12" cy="14.4" r="1.2" />
    <circle cx="16.5" cy="14.4" r="1.2" />
  </Svg>
);

export const IcoCaja = ({ className }: P) => (
  <Svg className={className}>
    <path d="M3.5 8 12 4l8.5 4v8L12 20l-8.5-4Z" />
    <path d="M3.5 8 12 12l8.5-4M12 12v8" />
  </Svg>
);

export const IcoPaleta = ({ className }: P) => (
  <Svg className={className}>
    <path d="M4 17.5h16M4 20h16" />
    <path d="M5 14.5v-3h6v3M13 14.5v-3h6v3M8 11.5v-3h8v3" />
  </Svg>
);

export const IcoCamion = ({ className }: P) => (
  <Svg className={className}>
    <path d="M2.5 6.5h11v10h-11zM13.5 10h4l3 3v3.5h-7" />
    <circle cx="6.5" cy="17.5" r="1.8" />
    <circle cx="17" cy="17.5" r="1.8" />
  </Svg>
);

export const IcoAlmacen = ({ className }: P) => (
  <Svg className={className}>
    <path d="M3.5 20v-10L12 4l8.5 6v10" />
    <path d="M7.5 20v-6h9v6M7.5 17h9" />
  </Svg>
);

export const IcoGrafica = ({ className }: P) => (
  <Svg className={className}>
    <path d="M4 20h16M6.5 20v-6M11 20V9M15.5 20v-9M20 20V5" />
  </Svg>
);

export const IcoTienda = ({ className }: P) => (
  <Svg className={className}>
    <path d="M4 9.5 5.5 4h13L20 9.5M4 9.5a2.3 2.3 0 0 0 4.6 0 2.3 2.3 0 0 0 4.7 0 2.3 2.3 0 0 0 4.7 0 2.3 2.3 0 0 0 2 2.2V20H6v-8.3a2.3 2.3 0 0 1-2-2.2Z" />
    <path d="M9.5 20v-5h5v5" />
  </Svg>
);

export const IcoAlerta = ({ className }: P) => (
  <Svg className={className}>
    <path d="M12 4 2.5 20h19L12 4ZM12 10.5V15M12 17.5v.2" />
  </Svg>
);

export const IcoFlecha = ({ className }: P) => (
  <Svg className={className}>
    <path d="M4 12h16m-6-6 6 6-6 6" />
  </Svg>
);

export const IcoCandado = ({ className }: P) => (
  <Svg className={className}>
    <rect x="5" y="10.5" width="14" height="9" rx="1.5" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
  </Svg>
);

export const IcoUsuario = ({ className }: P) => (
  <Svg className={className}>
    <circle cx="12" cy="8" r="3.6" />
    <path d="M5 20c1.4-3.9 3.9-5.8 7-5.8s5.6 1.9 7 5.8" />
  </Svg>
);

export const IcoLista = ({ className }: P) => (
  <Svg className={className}>
    <path d="M9 6h11M9 12h11M9 18h11" />
    <path d="M4 6h.01M4 12h.01M4 18h.01" strokeWidth={2.6} />
  </Svg>
);

export const IcoRecibo = ({ className }: P) => (
  <Svg className={className}>
    <path d="M6.5 3h11v18l-2.2-1.6L13 21l-2.2-1.6L8.7 21l-2.2-1.6V3Z" />
    <path d="M9.5 8h5M9.5 12h5" />
  </Svg>
);

export const IcoCarrito = ({ className }: P) => (
  <Svg className={className}>
    <path d="M3.5 4.5h2.2l2.4 11h10.4l2-8H7" />
    <circle cx="9.5" cy="19.3" r="1.5" />
    <circle cx="17" cy="19.3" r="1.5" />
  </Svg>
);

export const ICONO_EMPAQUE: Record<EmpaqueClave, (p: P) => React.ReactNode> = {
  UNIDAD: IcoHuevo,
  MEDIO_CARTON: IcoMedioCarton,
  CARTON: IcoCarton,
  CAJA: IcoCaja,
  PALETA: IcoPaleta,
};
