"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Link } from "@/i18n/navigation";
import { LogOut, Settings, User, Shield } from "lucide-react";
import { TaskbarClock } from "./taskbar-clock";

interface TaskbarAddon {
  key: string;
  emoji: string;
  gradient: string;
  shadow: string;
  label: string;
}

interface TaskbarProps {
  username: string;
  role: string;
  locale: string;
  addons: TaskbarAddon[];
}

export function Taskbar({ username, role, locale, addons }: TaskbarProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <div className="absolute bottom-0 left-0 right-0 h-13 flex items-center px-2 gap-1"
      style={{ height: "52px", background: "rgba(15,15,15,0.75)", backdropFilter: "blur(24px)", borderTop: "1px solid rgba(255,255,255,0.08)" }}
    >
      {/* Start button */}
      <Link href={`/${locale}`}
        className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-white/10 transition-all duration-150 shrink-0"
        title="OnlyFun Home"
      >
        <span className="text-2xl leading-none">🦫</span>
      </Link>

      {/* User button — bottom-left, right after start */}
      <div className="relative shrink-0">
        <button
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          className="flex items-center gap-2 px-2.5 h-9 rounded-xl hover:bg-white/10 transition-all duration-150"
        >
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-orange to-brand-pink flex items-center justify-center text-[11px] font-bold text-white shrink-0">
            {username[0]?.toUpperCase()}
          </div>
          <span className="text-white/80 text-xs font-medium hidden sm:block">@{username}</span>
          {role === "ADMIN" && <Shield className="w-3 h-3 text-brand-orange" />}
        </button>

        {userMenuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
            <div className="absolute bottom-full left-0 mb-2 w-48 rounded-xl border border-white/10 bg-gray-900/95 backdrop-blur-xl shadow-2xl z-20 overflow-hidden">
              <div className="p-3 border-b border-white/10">
                <p className="text-xs text-white/40">Signed in as</p>
                <p className="text-sm font-semibold text-white">@{username}</p>
              </div>
              <div className="p-1">
                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                  <User className="w-4 h-4" /> Profile
                </button>
                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                  <Settings className="w-4 h-4" /> Settings
                </button>
                {role === "ADMIN" && (
                  <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-brand-orange hover:bg-brand-orange/10 rounded-lg transition-colors">
                    <Shield className="w-4 h-4" /> Admin Panel
                  </button>
                )}
                <div className="border-t border-white/10 mt-1 pt-1">
                  <button
                    onClick={() => signOut({ callbackUrl: `/${locale}` })}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Separator */}
      <div className="w-px h-6 bg-white/15 mx-1 shrink-0" />

      {/* Pinned app icons */}
      <div className="flex items-center gap-1">
        {addons.map((addon) => (
          <Link
            key={addon.key}
            href={`/${locale}/addons/${addon.key}`}
            title={addon.label}
            className="group relative w-10 h-10 rounded-xl flex items-center justify-center hover:bg-white/10 transition-all duration-150"
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm text-lg leading-none"
              style={{ background: addon.gradient, boxShadow: `0 2px 8px ${addon.shadow}` }}
            >
              {addon.emoji}
            </div>
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-[11px] rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
              {addon.label}
            </div>
          </Link>
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Clock — right side only */}
      <TaskbarClock />
    </div>
  );
}
