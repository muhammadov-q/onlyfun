import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { MathBoard } from "@/addons/math/components/math-board";
import { mathAddon } from "@/addons/math";
import { AddonShell } from "../_components/addon-shell";

export const metadata = { title: `${mathAddon.name} — OnlyFun` };

export default async function MathPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await auth();
  if (!session) redirect(`/${locale}/auth/login`);

  return (
    <AddonShell addon={mathAddon} locale={locale}>
      <MathBoard />
    </AddonShell>
  );
}
