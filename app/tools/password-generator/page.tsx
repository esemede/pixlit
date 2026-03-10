import type { Metadata } from "next";
import PasswordGeneratorClient from "./PasswordGeneratorClient";

export const metadata: Metadata = {
  title: "Generador de Contraseñas Online Gratis | Pixlit",
  description: "Genera contraseñas seguras y aleatorias. Personaliza longitud y caracteres. Indicador de fortaleza incluido.",
};

export default function PasswordGeneratorPage() {
  return <PasswordGeneratorClient />;
}
