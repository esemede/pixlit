export const dynamic = "force-static";

import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Política de Reembolso y Cancelación — Pixlit",
  description: "Política de reembolsos, cancelación y derecho de retracto de Pixlit. Cumplimos con la Ley 19.496 de Protección al Consumidor de Chile.",
};

export default function RefundPage() {
  return <LegalPage contentPath="refund/content.md" title="Política de Reembolso y Cancelación" />;
}
