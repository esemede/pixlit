import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ClipboardClient from "./ClipboardClient";

export const metadata: Metadata = {
  title: "Portapapeles entre dispositivos | Pixlit",
  description: "Pasa texto y archivos entre tus dispositivos de navegador a navegador, cifrado de extremo a extremo.",
};

export default async function ClipboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/tools/clipboard");
  return <ClipboardClient userId={user.id} />;
}
