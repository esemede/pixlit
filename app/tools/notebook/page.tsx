import type { Metadata } from "next";
import NotebookClient from "./NotebookClient";

export const metadata: Metadata = {
  title: "Cuaderno de Notas — Pixlit",
  description: "Cuaderno de notas digital con reconocimiento de figuras, stylus, múltiples páginas y exportación PNG/PDF.",
};

export default function NotebookPage() {
  return <NotebookClient />;
}
