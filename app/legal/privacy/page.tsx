export const dynamic = "force-static";

import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Política de Privacidad — Pixlit",
  description: "Política de Privacidad de Pixlit. Cómo recopilamos, usamos y protegemos tus datos personales. Cumplimos con la Ley 21.719 (Chile), GDPR (UE) y CCPA (California).",
};

export default function PrivacyPage() {
  return <LegalPage contentPath="privacy/content.md" title="Política de Privacidad" />;
}
