import type { Metadata } from "next";
import { Sora, Manrope } from "next/font/google";
import "./globals.css";

const display = Sora({ variable: "--font-display", subsets: ["latin"], weight: ["500", "600", "700", "800"] });
const body = Manrope({ variable: "--font-body", subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "Amser Global Tech — Instituto Tecnológico Superior",
  description: "Cursos y carreras tecnológicas en línea con campus virtual, capacitadores expertos y certificación.",
  // Sitio provisional: no indexar hasta definir dominio y contenido definitivo.
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${display.variable} ${body.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
