import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { NavbarProvider } from "@/components/NavbarContext";
import MainContent from "@/components/MainContent";

export const metadata: Metadata = {
  title: "Pixlit - Herramientas Online Gratis",
  description: "Suite de herramientas online gratuitas: generador QR, compresor de imágenes, formateador JSON, generador de contraseñas y más.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico",  type: "image/x-icon" },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <NavbarProvider>
          <Navbar />
          <MainContent>{children}</MainContent>
          <Footer />
        </NavbarProvider>
      </body>
    </html>
  );
}
