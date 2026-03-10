import type { Metadata } from "next";
import QRGeneratorClient from "./QRGeneratorClient";

export const metadata: Metadata = {
  title: "Generador QR Online Gratis | Pixlit",
  description: "Genera códigos QR a partir de texto o URLs. Preview en tiempo real y descarga en PNG. Gratis, sin registro.",
};

export default function QRGeneratorPage() {
  return <QRGeneratorClient />;
}
