import type { Metadata, Viewport } from "next";
import { Archivo, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const archivo = Archivo({ subsets: ["latin"], variable: "--font-archivo", display: "swap" });

export const metadata: Metadata = {
  title: "Huevos · Sistema de Distribución",
  description:
    "Sistema de ventas e inventario en tiempo real para distribución de huevos: administración, fuerza de ventas y clientes sobre una misma base de datos.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${inter.variable} ${archivo.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
