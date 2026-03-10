import type { Metadata } from "next";
import CSSGradientClient from "./CSSGradientClient";

export const metadata: Metadata = {
  title: "Generador de Gradientes CSS Online Gratis | Pixlit",
  description: "Crea gradientes CSS lineales con preview en tiempo real. Copia el código CSS al instante.",
};

export default function CSSGradientPage() {
  return <CSSGradientClient />;
}
