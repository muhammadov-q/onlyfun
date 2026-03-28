import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { QuizBoard } from "@/addons/quiz/components/quiz-board";
import { quizAddon } from "@/addons/quiz";
import { AddonShell } from "../_components/addon-shell";

export const metadata = { title: `${quizAddon.name} — OnlyFun` };

export default async function QuizPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await auth();
  if (!session) redirect(`/${locale}/auth/login`);

  return (
    <AddonShell addon={quizAddon} locale={locale}>
      <QuizBoard />
    </AddonShell>
  );
}
