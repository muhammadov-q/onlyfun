import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { RegisterForm } from "./_components/register-form";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.register");
  return { title: `${t("title")} — OnlyFun` };
}

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (session) redirect(`/${locale}/dashboard`);

  const t = await getTranslations("auth.register");

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
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
          <h1 className="mt-6 text-2xl font-bold text-gray-900">{t("title")}</h1>
          <p className="mt-1 text-sm text-gray-500">{t("subtitle")}</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <RegisterForm />
        </div>
      </div>
    </div>
  );
}
