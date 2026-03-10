import type { Metadata } from "next";
import JSONFormatterClient from "./JSONFormatterClient";

export const metadata: Metadata = {
  title: "Formateador JSON Online Gratis | Pixlit",
  description: "Formatea, valida y minifica JSON al instante. Detección de errores incluida. Gratis y sin registro.",
};

export default function JSONFormatterPage() {
  return <JSONFormatterClient />;
}
