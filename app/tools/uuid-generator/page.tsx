import type { Metadata } from "next";
import UUIDGeneratorClient from "./UUIDGeneratorClient";

export const metadata: Metadata = {
  title: "Generador UUID Online Gratis | Pixlit",
  description: "Genera UUIDs v4 únicos al instante. Genera uno o varios y cópialos con un click.",
};

export default function UUIDGeneratorPage() {
  return <UUIDGeneratorClient />;
}
