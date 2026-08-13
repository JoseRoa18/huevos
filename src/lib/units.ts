/**
 * Core del negocio: TODO el inventario se maneja en la unidad mínima (el huevo).
 * Los empaques son solo presentaciones de venta; nunca existen inventarios
 * separados por empaque.
 */

export const EMPAQUES = {
  UNIDAD: { clave: "UNIDAD", nombre: "Unidad", huevos: 1, emoji: "🥚" },
  MEDIO_CARTON: { clave: "MEDIO_CARTON", nombre: "Medio Cartón", huevos: 15, emoji: "🍳" },
  CARTON: { clave: "CARTON", nombre: "Cartón", huevos: 30, emoji: "📦" },
  CAJA: { clave: "CAJA", nombre: "Caja (12 cartones)", huevos: 360, emoji: "🗃️" },
  PALETA: { clave: "PALETA", nombre: "Paleta (Al Mayor)", huevos: 4320, emoji: "🚛" },
} as const;

export type EmpaqueClave = keyof typeof EMPAQUES;

export type LineaVenta = {
  empaque: EmpaqueClave;
  cantidad: number;
};

/** Convierte líneas de venta a total de huevos (unidad mínima). */
export function totalHuevos(lineas: LineaVenta[]): number {
  return lineas.reduce(
    (acc, l) => acc + EMPAQUES[l.empaque].huevos * l.cantidad,
    0,
  );
}

/**
 * Desglosa un total de huevos en la combinación de empaques más grande posible.
 * Útil para mostrar inventario: 750 huevos -> "2 Cajas + 1 Cartón".
 */
export function desglosar(huevos: number): { empaque: EmpaqueClave; cantidad: number }[] {
  const orden: EmpaqueClave[] = ["PALETA", "CAJA", "CARTON", "MEDIO_CARTON", "UNIDAD"];
  const resultado: { empaque: EmpaqueClave; cantidad: number }[] = [];
  let restante = Math.max(0, Math.floor(huevos));
  for (const clave of orden) {
    const tam = EMPAQUES[clave].huevos;
    const cantidad = Math.floor(restante / tam);
    if (cantidad > 0) {
      resultado.push({ empaque: clave, cantidad });
      restante -= cantidad * tam;
    }
  }
  return resultado;
}

/** Formatea un desglose como texto legible: "2 Cajas + 1 Cartón". */
export function formatoDesglose(huevos: number): string {
  const partes = desglosar(huevos);
  if (partes.length === 0) return "0 huevos";
  return partes
    .map((p) => `${p.cantidad} ${EMPAQUES[p.empaque].nombre}${p.cantidad > 1 && p.empaque !== "UNIDAD" ? "s" : ""}`)
    .join(" + ");
}

export type CategoriaCliente = "DETAL" | "MAYORISTA" | "VIP";

/** Precio por huevo según categoría del cliente (fallback local; la fuente real es la tabla price_tiers). */
export const PRECIOS_POR_HUEVO: Record<CategoriaCliente, number> = {
  DETAL: 0.25,
  MAYORISTA: 0.21,
  VIP: 0.19,
};

export function precioLineas(lineas: LineaVenta[], categoria: CategoriaCliente): number {
  return totalHuevos(lineas) * PRECIOS_POR_HUEVO[categoria];
}
