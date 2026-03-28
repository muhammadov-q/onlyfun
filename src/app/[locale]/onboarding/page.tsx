import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { UsernameForm } from "./_components/username-form";
import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Choose your username — OnlyFun",
};

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();

  if (!session) redirect(`/${locale}/auth/login`);

  // Already has username → go to dashboard
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { username: true },
  });

  if (user?.username) redirect(`/${locale}/dashboard`);

  const t = await getTranslations("onboarding");

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="text-3xl">🦫</span>
            <span className="text-2xl font-black">
              <span className="text-gray-900">ONLY</span>
              <span className="bg-gradient-to-r from-brand-orange to-brand-pink bg-clip-text text-transparent">FUN</span>
            </span>
          </Link>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mt-6 mb-4">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                <span className="text-white text-xs font-bold">✓</span>
              </div>
              <span className="text-xs text-gray-400">Account</span>
            </div>
            <div className="w-8 h-px bg-gray-300" />
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-gradient-to-r from-brand-orange to-brand-pink flex items-center justify-center">
                <span className="text-white text-xs font-bold">2</span>
              </div>
              <span className="text-xs font-medium text-gray-700">Username</span>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
          <p className="mt-1 text-sm text-gray-500">{t("subtitle")}</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <UsernameForm />
        </div>
      </div>
    </div>
  );
}
