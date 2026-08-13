import { desglosar, formatoDesglose, EMPAQUES, type EmpaqueClave } from "@/lib/units";

/* Firma visual del sistema: todo inventario se lee como composición
   de empaques sobre la unidad mínima. Escala de ámbar = tamaño de empaque. */

const COLOR_EMPAQUE: Record<EmpaqueClave, string> = {
  PALETA: "#92400e",
  CAJA: "#b45309",
  CARTON: "#d97706",
  MEDIO_CARTON: "#f59e0b",
  UNIDAD: "#fbbf24",
};

export default function DesgloseBar({
  huevos,
  conTexto = true,
}: {
  huevos: number;
  conTexto?: boolean;
}) {
  const partes = desglosar(huevos);
  return (
    <div>
      <div className="flex h-2 gap-[2px] overflow-hidden rounded-sm" role="img" aria-label={formatoDesglose(huevos)}>
        {huevos <= 0 ? (
          <div className="h-full w-full bg-borde" />
        ) : (
          partes.map((p) => (
            <div
              key={p.empaque}
              className="h-full min-w-[3px]"
              style={{
                backgroundColor: COLOR_EMPAQUE[p.empaque],
                width: `${((p.cantidad * EMPAQUES[p.empaque].huevos) / huevos) * 100}%`,
              }}
            />
          ))
        )}
      </div>
      {conTexto && (
        <p className="mt-1 text-xs text-tinta-suave">{formatoDesglose(huevos)}</p>
      )}
    </div>
  );
}
