import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NotebookClient from "../NotebookClient";

export const metadata: Metadata = {
  title: "Cuaderno de Notas — Pixlit",
  description: "Cuaderno de notas digital con reconocimiento de figuras, stylus, múltiples páginas y exportación PNG/PDF.",
};

type Params = { params: Promise<{ id: string }> };

export default async function NotebookByIdPage({ params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect(`/auth/login?redirectTo=/tools/notebook/${id}`);

  return <NotebookClient initialNotebookId={id} />;
}
