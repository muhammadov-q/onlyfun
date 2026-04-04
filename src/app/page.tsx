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
      <div
        className="flex items-center justify-center bg-black relative"
        style={{ height: "100dvh" }}
      >
        {/* Language switcher */}
        <div className="absolute top-4 right-4">
          <LangSwitcher />
        </div>

        <div className="w-full max-w-sm px-6 text-center">
          <div className="mb-10">
            <h1 className="text-5xl font-bold text-white mb-3 tracking-tight">onlyfun</h1>
            <p className="text-white/40 text-sm leading-relaxed">
              {t("landing.tagline1")}
              <br />
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
              className="w-full bg-white/5 text-white text-center text-base px-4 py-4 rounded-2xl border border-white/10 focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/5 placeholder-white/20 transition-all"
            />
            <button
              type="submit"
              disabled={input.trim().length < 2}
              className="w-full bg-white text-black font-semibold py-4 rounded-2xl text-base disabled:opacity-20 hover:bg-zinc-100 transition-all active:scale-[0.98]"
            >
              {t("landing.enter")}
            </button>
          </form>

          <p className="text-white/20 text-xs mt-8">{t("landing.noAccount")}</p>
        </div>
      </div>
    );
  }

  return <PixelCanvas name={name} />;
}
