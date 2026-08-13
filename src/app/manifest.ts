import type { MetadataRoute } from "next";

/* Manifest PWA: permite instalar la app en la pantalla de inicio del
   teléfono (clave para vendedores en calle). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Huevos · Sistema de Distribución",
    short_name: "Huevos",
    description:
      "Ventas e inventario de huevos en tiempo real: administración, vendedores y clientes.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f6f2",
    theme_color: "#1d231d",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
