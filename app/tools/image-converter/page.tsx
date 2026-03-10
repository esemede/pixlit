import type { Metadata } from "next";
import ImageConverterClient from "./ImageConverterClient";

export const metadata: Metadata = {
  title: "Convertidor de Imágenes PNG JPG WebP Online Gratis | Pixlit",
  description: "Convierte imágenes entre PNG, JPG y WebP directamente en el navegador. Sin límites, sin registro.",
};

export default function ImageConverterPage() {
  return <ImageConverterClient />;
}
