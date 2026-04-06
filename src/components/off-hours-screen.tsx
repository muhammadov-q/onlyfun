"use client";

import { useI18n } from "@/i18n";
import { LangSwitcher } from "@/components/lang-switcher";
import { useMemo } from "react";

const MESSAGES = [
  "offhours.message1" as const,
  "offhours.message2" as const,
  "offhours.message3" as const,
];

export function OffHoursScreen({
  startTime,
  endTime,
  remainingMs,
}: {
  startTime: string;
  endTime: string;
  remainingMs: number;
}) {
  const { t, locale } = useI18n();

  const randomMessage = useMemo(
    () => MESSAGES[Math.floor(Math.random() * MESSAGES.length)],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale]
  );

  const schedule = t("offhours.schedule").replace("{start}", startTime).replace("{end}", endTime);

  // Break remaining ms into h / m / s
  const totalSec = Math.max(0, Math.floor(remainingMs / 1000));
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  const hLabel = t("offhours.hours");
  const mLabel = t("offhours.minutes");
  const sLabel = t("offhours.seconds");

  return (
    <div
      className="flex items-center justify-center bg-black relative overflow-hidden"
      style={{ height: "100dvh" }}
    >
      {/* Language switcher */}
      <div className="absolute top-4 right-4 z-10">
        <LangSwitcher />
      </div>

      {/* Subtle animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] animate-[spin_120s_linear_infinite] opacity-[0.03]">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-violet-500 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-indigo-500 blur-3xl" />
        </div>
      </div>

      <div className="w-full max-w-md px-6 text-center relative z-10">
        {/* Logo */}
        <div className="mb-8 sm:mb-10">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3 tracking-tight flex items-center justify-center gap-3">
            <img src="/logo.svg" alt="" className="h-10 w-10 sm:h-12 sm:w-12 invert" />
            onlyfun
          </h1>
        </div>

        {/* Moon icon */}
        <div className="mb-6 sm:mb-8">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto">
            <span className="text-3xl sm:text-4xl">&#127769;</span>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">
          {t("offhours.title")}
        </h2>

        {/* Funny message */}
        <p className="text-white/50 text-sm sm:text-base leading-relaxed mb-6 sm:mb-8">
          {t(randomMessage)}
        </p>

        {/* Countdown timer */}
        <div className="mb-6 sm:mb-8">
          <p className="text-white/30 text-xs sm:text-sm uppercase tracking-widest mb-3">
            {t("offhours.opensIn")}
          </p>
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            <TimerBlock value={hours} label={hLabel} />
            <span className="text-white/20 text-xl sm:text-2xl font-light -mt-5">:</span>
            <TimerBlock value={minutes} label={mLabel} />
            <span className="text-white/20 text-xl sm:text-2xl font-light -mt-5">:</span>
            <TimerBlock value={seconds} label={sLabel} />
          </div>
        </div>

        {/* Schedule pill */}
        <div className="inline-flex items-center gap-2 bg-white/[0.06] border border-white/[0.08] rounded-2xl px-4 sm:px-5 py-2.5 sm:py-3">
          <span className="text-violet-400 text-xs sm:text-sm font-medium">{schedule}</span>
        </div>
      </div>
    </div>
  );
}

function TimerBlock({ value, label }: { value: number; label: string }) {
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
