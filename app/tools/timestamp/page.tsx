import type { Metadata } from "next";
import TimestampClient from "./TimestampClient";

export const metadata: Metadata = {
  title: "Conversor Timestamp Unix Online Gratis | Pixlit",
  description: "Convierte timestamps Unix a fechas legibles y viceversa. Muestra el timestamp actual en tiempo real.",
};

export default function TimestampPage() {
  return <TimestampClient />;
}
