"use client";

import { useTranslations, useLocale } from "next-intl";
import { signOut } from "next-auth/react";
import { Link } from "@/i18n/navigation";
import { LogOut, Settings, User, Shield, ChevronDown } from "lucide-react";
import { useState } from "react";

interface DesktopHeaderProps {
  username: string;
  role: string;
}

export function DesktopHeader({ username, role }: DesktopHeaderProps) {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur-xl">
      <div className="max-w-screen-xl mx-auto px-6">
        <div className="flex h-14 items-center justify-between">
          {/* Logo */}
          <Link href={`/${locale}`} className="flex items-center gap-2 shrink-0">
            <span className="text-xl">🦫</span>
            <span className="text-base font-black">
              <span className="text-gray-900">ONLY</span>
              <span className="bg-gradient-to-r from-brand-orange to-brand-pink bg-clip-text text-transparent">FUN</span>
            </span>
          </Link>

          {/* Center: greeting */}
          <p className="hidden md:block text-sm text-gray-500 font-medium">
            {t("welcome")}, <span className="text-gray-900 font-semibold">@{username}</span> 👋
          </p>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-all shadow-sm"
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-orange to-brand-pink flex items-center justify-center text-[11px] font-bold text-white shrink-0">
                {username[0]?.toUpperCase()}
              </div>
              <span className="text-sm text-gray-700 font-medium hidden sm:block">@{username}</span>
              {role === "ADMIN" && <Shield className="w-3.5 h-3.5 text-brand-orange" />}
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-48 rounded-xl border border-gray-200 bg-white shadow-lg z-20 overflow-hidden">
                  <div className="p-3 border-b border-gray-100">
                    <p className="text-xs text-gray-400">Signed in as</p>
                    <p className="text-sm font-semibold text-gray-900">@{username}</p>
                  </div>
                  <div className="p-1">
                    <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">
                      <User className="w-4 h-4" />{t("profile")}
                    </button>
                    <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">
                      <Settings className="w-4 h-4" />{t("settings")}
                    </button>
                    {role === "ADMIN" && (
                      <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-brand-orange hover:bg-orange-50 rounded-lg transition-colors">
                        <Shield className="w-4 h-4" />{t("admin")}
                      </button>
                    )}
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <button
                        onClick={() => signOut({ callbackUrl: `/${locale}` })}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <LogOut className="w-4 h-4" />{t("signOut")}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
