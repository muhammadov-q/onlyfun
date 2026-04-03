"use client";

import { useState, useRef, useEffect } from "react";
import { useI18n, type Locale } from "@/i18n";

const LANGS: { code: Locale; flag: string; label: string }[] = [
  { code: "ru", flag: "🇷🇺", label: "Русский" },
  { code: "en", flag: "🇬🇧", label: "English" },
];

export function LangSwitcher() {
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const current = LANGS.find((l) => l.code === locale)!;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-zinc-50 border border-zinc-100 hover:border-zinc-300 transition-all text-xs"
      >
        <span>{current.flag}</span>
        <span className="text-zinc-500 font-medium">{current.code.toUpperCase()}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-zinc-400"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white rounded-xl border border-zinc-200 shadow-lg z-50 overflow-hidden animate-in min-w-[120px]">
          {LANGS.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                setLocale(lang.code);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors ${
                locale === lang.code
                  ? "bg-zinc-50 text-black font-medium"
                  : "text-zinc-500 hover:bg-zinc-50 hover:text-black"
              }`}
            >
              <span>{lang.flag}</span>
              <span>{lang.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
