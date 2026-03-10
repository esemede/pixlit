import type { Metadata } from "next";
import ImageCompressorClient from "./ImageCompressorClient";

export const metadata: Metadata = {
  title: "Compresor de Imágenes Online Gratis | Pixlit",
  description: "Comprime imágenes JPG y PNG en el navegador. Sin subir archivos a servidores. Descarga al instante.",
};

export default function ImageCompressorPage() {
  return <ImageCompressorClient />;
}
