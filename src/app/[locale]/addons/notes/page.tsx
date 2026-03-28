import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { NotesBoard } from "@/addons/notes/components/notes-board";
import { notesAddon } from "@/addons/notes";
import { AddonShell } from "../_components/addon-shell";

export const metadata = { title: `${notesAddon.name} — OnlyFun` };

export default async function NotesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await auth();
  if (!session) redirect(`/${locale}/auth/login`);

  return (
    <AddonShell addon={notesAddon} locale={locale}>
      <NotesBoard />
    </AddonShell>
  );
}
