import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { TimerBoard } from "@/addons/timer/components/timer-board";
import { timerAddon } from "@/addons/timer";
import { AddonShell } from "../_components/addon-shell";

export const metadata = { title: `${timerAddon.name} — OnlyFun` };

export default async function TimerPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await auth();
  if (!session) redirect(`/${locale}/auth/login`);

  return (
    <AddonShell addon={timerAddon} locale={locale}>
      <TimerBoard />
    </AddonShell>
  );
}
