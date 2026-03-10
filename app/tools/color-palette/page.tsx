import type { Metadata } from "next";
import ColorPaletteClient from "./ColorPaletteClient";

export const metadata: Metadata = {
  title: "Generador de Paletas de Color Online Gratis | Pixlit",
  description: "Genera paletas de 5 tonos a partir de un color base. Obtén los valores HEX y RGB.",
};

export default function ColorPalettePage() {
  return <ColorPaletteClient />;
}
