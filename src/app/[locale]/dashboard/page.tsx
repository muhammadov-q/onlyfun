import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { Desktop } from "./_components/desktop";
import type { DesktopIconDef } from "./_components/desktop-icon";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard — OnlyFun" };

const addonConfig: Omit<DesktopIconDef, "name">[] = [
  {
    key: "quiz",
    emoji: "🧠",
    gradient: "linear-gradient(135deg, #f97316, #ef4444)",
    shadow: "rgba(249,115,22,0.55)",
    rotation: "rotate(-1deg)",
    available: true,
    isNew: true,
  },
  {
    key: "notes",
    emoji: "📝",
    gradient: "linear-gradient(135deg, #38bdf8, #6366f1)",
    shadow: "rgba(56,189,248,0.55)",
    rotation: "rotate(1.5deg)",
    available: true,
    isNew: false,
  },
  {
    key: "timer",
    emoji: "🍅",
    gradient: "linear-gradient(135deg, #fb7185, #e11d48)",
    shadow: "rgba(251,113,133,0.55)",
    rotation: "rotate(-0.5deg)",
    available: true,
    isNew: false,
  },
  {
    key: "math",
    emoji: "🧮",
    gradient: "linear-gradient(135deg, #a78bfa, #7c3aed)",
    shadow: "rgba(167,139,250,0.55)",
    rotation: "rotate(1deg)",
    available: true,
    isNew: false,
  },
  {
    key: "vocab",
    emoji: "📖",
    gradient: "linear-gradient(135deg, #34d399, #059669)",
    shadow: "rgba(52,211,153,0.45)",
    rotation: "rotate(-1deg)",
    available: false,
    isNew: false,
  },
  {
    key: "meme",
    emoji: "😂",
    gradient: "linear-gradient(135deg, #fbbf24, #f97316)",
    shadow: "rgba(251,191,36,0.45)",
    rotation: "rotate(0.5deg)",
    available: false,
    isNew: false,
  },
  {
    key: "ai",
    emoji: "🤖",
    gradient: "linear-gradient(135deg, #64748b, #1e40af)",
    shadow: "rgba(100,116,139,0.45)",
    rotation: "rotate(-1.5deg)",
    available: false,
    isNew: false,
  },
  {
    key: "games",
    emoji: "🎮",
    gradient: "linear-gradient(135deg, #f472b6, #9333ea)",
    shadow: "rgba(244,114,182,0.45)",
    rotation: "rotate(1deg)",
    available: false,
    isNew: false,
  },
];

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (!session) redirect(`/${locale}/auth/login`);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { username: true },
  });
  if (!user?.username) redirect(`/${locale}/onboarding`);

  const t = await getTranslations("features");

  const addons: DesktopIconDef[] = addonConfig.map((a) => ({
    ...a,
    name: t(`addons.${a.key as "quiz"}.name`),
  }));

  return (
    <Desktop
      username={user.username}
      role={session.user.role}
      locale={locale}
      addons={addons}
    />
  );
}
