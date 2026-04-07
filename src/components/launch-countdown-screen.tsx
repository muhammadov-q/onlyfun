"use client";

import { useI18n } from "@/i18n";
import { LangSwitcher } from "@/components/lang-switcher";
import { useState, useEffect } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

function getTimeLeft(targetDate: string) {
  const diff = Math.max(0, new Date(targetDate).getTime() - Date.now());
  const totalSec = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSec / 86400),
    hours: Math.floor((totalSec % 86400) / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
    seconds: totalSec % 60,
    done: diff <= 0,
  };
}

export function LaunchCountdownScreen({ launchDate }: { launchDate: string }) {
  const { t } = useI18n();
  const [time, setTime] = useState(() => getTimeLeft(launchDate));

  useEffect(() => {
    // If already past, just show zeros — don't reload
    const initial = getTimeLeft(launchDate);
    if (initial.done) return;

    const tick = setInterval(() => {
      const next = getTimeLeft(launchDate);
      setTime(next);
      if (next.done) {
        clearInterval(tick);
        window.location.reload();
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [launchDate]);

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
        <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] animate-[spin_90s_linear_infinite] opacity-[0.04]">
          <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] rounded-full bg-violet-600 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/3 w-[500px] h-[500px] rounded-full bg-blue-600 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-indigo-500 blur-3xl" />
        </div>
      </div>

      <div className="w-full max-w-lg px-6 text-center relative z-10">
        {/* Logo */}
        <div className="mb-8 sm:mb-10">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3 tracking-tight flex items-center justify-center gap-3">
            <img src="/logo.svg" alt="" className="h-10 w-10 sm:h-12 sm:w-12 invert" />
            onlyfun
          </h1>
        </div>

        {/* Rocket lottie animation */}
        <div className="mx-auto mb-4 sm:mb-6 w-48 h-48 sm:w-64 sm:h-64">
          <DotLottieReact src="/lottie/rocket.lottie" loop autoplay />
        </div>

        {/* Title */}
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">
          {t("countdown.title")}
        </h2>

        {/* Message */}
        <p className="text-white/50 text-sm sm:text-base leading-relaxed mb-8 sm:mb-10">
          {t("countdown.message")}
        </p>

        {/* Countdown timer */}
        <div className="mb-8 sm:mb-10">
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            <CountdownBlock value={time.days} label={t("countdown.days")} />
            <span className="text-white/20 text-xl sm:text-2xl font-light -mt-5">:</span>
            <CountdownBlock value={time.hours} label={t("countdown.hours")} />
            <span className="text-white/20 text-xl sm:text-2xl font-light -mt-5">:</span>
            <CountdownBlock value={time.minutes} label={t("countdown.minutes")} />
            <span className="text-white/20 text-xl sm:text-2xl font-light -mt-5">:</span>
            <CountdownBlock value={time.seconds} label={t("countdown.seconds")} />
          </div>
        </div>

        {/* Launch date pill */}
        <div className="inline-flex items-center gap-2 bg-white/[0.06] border border-white/[0.08] rounded-2xl px-4 sm:px-5 py-2.5 sm:py-3">
          <span className="text-violet-400 text-xs sm:text-sm font-medium">
            {t("countdown.launchDate").replace(
              "{date}",
              new Date(launchDate).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

function CountdownBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="bg-white/[0.06] border border-white/[0.08] rounded-xl sm:rounded-2xl w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
        <span className="text-2xl sm:text-3xl font-bold text-white tabular-nums">
          {String(value).padStart(2, "0")}
        </span>
      </div>
      <span className="text-white/30 text-[10px] sm:text-xs mt-1.5 uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}
