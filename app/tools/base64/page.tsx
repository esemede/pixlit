import type { Metadata } from "next";
import Base64Client from "./Base64Client";

export const metadata: Metadata = {
  title: "Base64 Encode/Decode Online Gratis | Pixlit",
  description: "Codifica y decodifica texto en Base64 al instante. Gratis, sin registro, funciona en tu navegador.",
};

export default function Base64Page() {
  return <Base64Client />;
}
