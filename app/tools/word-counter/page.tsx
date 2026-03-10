import type { Metadata } from "next";
import WordCounterClient from "./WordCounterClient";

export const metadata: Metadata = {
  title: "Contador de Palabras Online Gratis | Pixlit",
  description: "Cuenta palabras, caracteres, líneas y estima tiempo de lectura al instante. Gratis, sin registro.",
};

export default function WordCounterPage() {
  return <WordCounterClient />;
}
