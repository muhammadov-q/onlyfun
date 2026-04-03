"use client";

import { useState, useEffect } from "react";
import { PixelCanvas } from "@/components/pixel-canvas";
import { useI18n } from "@/i18n";
import { LangSwitcher } from "@/components/lang-switcher";

export default function Home() {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("onlyfun-name");
    if (stored) setName(stored);
  }, []);
  const [input, setInput] = useState("");
  const { t } = useI18n();

  if (!name) {
    return (
      <div className="h-screen flex items-center justify-center bg-white relative">
        {/* Language switcher */}
        <div className="absolute top-4 right-4">
          <LangSwitcher />
        </div>

        <div className="w-full max-w-sm px-6 text-center">
          <div className="mb-10">
            <h1 className="text-5xl font-bold text-black mb-3 tracking-tight">onlyfun</h1>
            <p className="text-zinc-400 text-sm leading-relaxed">
              {t("landing.tagline1")}<br />
              {t("landing.tagline2")}
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (input.trim().length >= 2) {
                localStorage.setItem("onlyfun-name", input.trim());
                setName(input.trim());
              }
            }}
            className="space-y-3"
          >
            <input
              placeholder={t("landing.placeholder")}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={20}
              autoFocus
              className="w-full bg-zinc-50 text-black text-center text-base px-4 py-4 rounded-2xl border border-zinc-200 focus:outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 placeholder-zinc-300 transition-all"
            />
            <button
              type="submit"
              disabled={input.trim().length < 2}
              className="w-full bg-black text-white font-semibold py-4 rounded-2xl text-base disabled:opacity-20 hover:bg-zinc-800 transition-all active:scale-[0.98] shadow-sm"
            >
              {t("landing.enter")}
            </button>
          </form>

          <p className="text-zinc-300 text-xs mt-8">
            {t("landing.noAccount")}
          </p>
        </div>
      </div>
    );
  }

  return <PixelCanvas name={name} />;
}
