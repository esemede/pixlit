export const dynamic = "force-static";

import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Licencias Open Source — Pixlit",
  description: "Aviso de licencias de software de código abierto utilizado en Pixlit. Cumplimos con los términos MIT, ISC y Apache-2.0.",
};

export default function LicensesPage() {
  return <LegalPage contentPath="licenses/content.md" title="Licencias Open Source" />;
}
