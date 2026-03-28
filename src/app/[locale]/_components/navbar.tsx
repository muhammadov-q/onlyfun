"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Menu, X, Globe } from "lucide-react";

export function Navbar() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const switchLocale = () => {
    router.replace(pathname, { locale: locale === "en" ? "ru" : "en" });
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-xl">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🦫</span>
            <span className="text-xl font-black tracking-tight">
              <span className="text-gray-900">ONLY</span>
              <span className="bg-gradient-to-r from-brand-orange via-brand-pink to-brand-blue bg-clip-text text-transparent">FUN</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            <Link href="/" className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100">
              {t("home")}
            </Link>
            <a href="#features" className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100">
              {t("features")}
            </a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={switchLocale}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100 border border-gray-200"
            >
              <Globe className="w-3.5 h-3.5" />
              {locale.toUpperCase()}
            </button>
            <Link href="/auth/login">
              <Button variant="ghost" size="sm" className="text-gray-700">{t("login")}</Button>
            </Link>
            <Link href="/auth/register">
              <Button size="sm">{t("register")}</Button>
            </Link>
          </div>

          <button className="md:hidden text-gray-600 hover:text-gray-900 p-2" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden py-4 border-t border-gray-100 flex flex-col gap-2">
            <Link href="/" className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">{t("home")}</Link>
            <a href="#features" className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">{t("features")}</a>
            <div className="flex gap-2 px-4 pt-2">
              <Link href="/auth/login" className="flex-1">
                <Button variant="outline" size="sm" className="w-full">{t("login")}</Button>
              </Link>
              <Link href="/auth/register" className="flex-1">
                <Button size="sm" className="w-full">{t("register")}</Button>
              </Link>
            </div>
            <button onClick={switchLocale} className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-500 hover:text-gray-900">
              <Globe className="w-4 h-4" />
              {locale === "en" ? "Русский" : "English"}
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
