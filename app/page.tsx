import type { Metadata } from "next";
import NotebookClient from "./tools/notebook/NotebookClient";

export const metadata: Metadata = {
  title: "Pixlit — Cuaderno de Notas",
  description:
    "Cuaderno de notas digital: dibuja con stylus, touch o mouse, exporta a PNG/PDF, guarda automáticamente y trabaja con agentes IA.",
};

export default function Home() {
  return <NotebookClient minimal />;
}
