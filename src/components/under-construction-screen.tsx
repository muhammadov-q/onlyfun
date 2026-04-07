"use client";

import { useI18n } from "@/i18n";
import { LangSwitcher } from "@/components/lang-switcher";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

export function UnderConstructionScreen() {
  const { t } = useI18n();

  return (
    <div
      className="flex items-center justify-center bg-black relative overflow-hidden"
      style={{ height: "100dvh" }}
    >
      {/* Language switcher */}
      <div className="absolute top-4 right-4 z-10">
        <LangSwitcher />
      </div>

      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] animate-[spin_120s_linear_infinite] opacity-[0.03]">
          <div className="absolute top-1/3 left-1/4 w-96 h-96 rounded-full bg-amber-500 blur-3xl" />
          <div className="absolute bottom-1/3 right-1/4 w-96 h-96 rounded-full bg-orange-500 blur-3xl" />
        </div>
      </div>

      <div className="w-full max-w-md px-6 text-center relative z-10">
        {/* Logo */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3 tracking-tight flex items-center justify-center gap-3">
            <img src="/logo.svg" alt="" className="h-10 w-10 sm:h-12 sm:w-12 invert" />
            onlyfun
          </h1>
        </div>

        {/* Lottie animation */}
        <div className="mx-auto mb-4 sm:mb-6 w-48 h-48 sm:w-64 sm:h-64">
          <DotLottieReact src="/lottie/construction.lottie" loop autoplay />
        </div>

        {/* Title */}
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">
          {t("construction.title")}
        </h2>

        {/* Message */}
        <p className="text-white/50 text-sm sm:text-base leading-relaxed mb-8 sm:mb-10">
          {t("construction.message")}
        </p>

        {/* Status pill */}
        <div className="inline-flex items-center gap-2 bg-white/[0.06] border border-white/[0.08] rounded-2xl px-4 sm:px-5 py-2.5 sm:py-3">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-amber-400/80 text-xs sm:text-sm font-medium">
            {t("construction.status")}
          </span>
        </div>
      </div>
    </div>
  );
}
