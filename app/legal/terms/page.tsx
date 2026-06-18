export const dynamic = "force-static";

import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Términos y Condiciones — Pixlit",
  description: "Términos y Condiciones de Servicio de Pixlit. Conoce tus derechos y obligaciones al usar nuestra plataforma.",
};

export default function TermsPage() {
  return <LegalPage contentPath="terms/content.md" title="Términos y Condiciones" />;
}
