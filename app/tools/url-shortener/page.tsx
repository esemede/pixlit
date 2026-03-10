import type { Metadata } from "next";
import URLShortenerClient from "./URLShortenerClient";

export const metadata: Metadata = {
  title: "Acortador de URLs Online Gratis | Pixlit",
  description: "Acorta URLs largas en links compactos. Backend con analytics próximamente en Pixlit Pro.",
};

export default function URLShortenerPage() {
  return <URLShortenerClient />;
}
