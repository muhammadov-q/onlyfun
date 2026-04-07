"use client";

import { useState, useEffect } from "react";
import { PixelCanvas } from "@/components/pixel-canvas";
import { useI18n } from "@/i18n";
import { LangSwitcher } from "@/components/lang-switcher";
import { getDeviceId } from "@/lib/device-id";
import { useOperatingHours } from "@/hooks/useOperatingHours";
import { OffHoursScreen } from "@/components/off-hours-screen";
import { useSiteStatus } from "@/hooks/useSiteStatus";
import { UnderConstructionScreen } from "@/components/under-construction-screen";
import { LaunchCountdownScreen } from "@/components/launch-countdown-screen";

export default function Home() {
  const [name, setName] = useState<string | null>(null);
  const [lockedName, setLockedName] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [loggedOut, setLoggedOut] = useState(false);
  const { status: siteStatus, loading: siteLoading } = useSiteStatus();
  const siteBlocked =
    siteStatus?.underConstruction || (siteStatus?.launchCountdown && siteStatus.launchDate);
  const { status: opHours, loading: opLoading, remainingMs } = useOperatingHours(!siteBlocked);

  useEffect(() => {
    // Ensure device token exists (creates cookie + localStorage entry)
    getDeviceId();

    const stored = localStorage.getItem("onlyfun-name");
    const wasLogout = sessionStorage.getItem("onlyfun-logout");
    if (stored && !wasLogout) {
      setName(stored);
      setChecking(false);
      return;
    }
    // User logged out but we still have their name in localStorage
    if (stored && wasLogout) {
      setLockedName(stored);
      setLoggedOut(true);
      setChecking(false);
      return;
    }
    // No localStorage name — check by device token (cookie sent automatically)
    fetch("/api/name-check")
      .then((r) => r.json())
      .then((data) => {
        if (data.name) {
          setLockedName(data.name);
          // Show welcome back screen so user can confirm (don't auto-assign)
          setLoggedOut(true);
        }
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);
  const [input, setInput] = useState("");
  const { t } = useI18n();

  if (siteLoading || (!siteBlocked && (checking || opLoading))) {
    return (
      <div className="flex items-center justify-center bg-black" style={{ height: "100dvh" }}>
        <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse" />
      </div>
    );
  }

  // Show under construction screen
  if (siteStatus?.underConstruction) {
    return <UnderConstructionScreen />;
  }

  // Show launch countdown screen
  if (siteStatus?.launchCountdown && siteStatus.launchDate) {
    return <LaunchCountdownScreen launchDate={siteStatus.launchDate} />;
  }

  // Show off-hours screen when night mode is active and app is closed
  if (opHours?.isRestricted && !opHours.isOpenNow) {
    return (
      <OffHoursScreen
        startTime={opHours.startTime}
        endTime={opHours.endTime}
        remainingMs={remainingMs}
      />
    );
  }

  // Welcome back screen after logout or device-token match
  if (loggedOut && lockedName) {
    return (
      <div
        className="flex items-center justify-center bg-black relative"
        style={{ height: "100dvh" }}
      >
        <div className="absolute top-4 right-4">
          <LangSwitcher />
        </div>
        <div className="w-full max-w-sm px-6 text-center">
          <div className="mb-8">
            <h1 className="text-5xl font-bold text-white mb-3 tracking-tight flex items-center justify-center gap-3">
              <img src="/logo.svg" alt="" className="h-12 w-12 invert" />
              onlyfun
            </h1>
            <p className="text-white/40 text-sm leading-relaxed">
              {t("landing.tagline1")}
              <br />
              {t("landing.tagline2")}
            </p>
          </div>

          <div className="mb-6">
            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-2xl font-bold text-black uppercase mx-auto mb-3">
              {lockedName[0]}
            </div>
            <p className="text-white/50 text-sm">{t("profile.welcomeBack")}</p>
            <p className="text-white text-lg font-semibold mt-0.5">{lockedName}</p>
          </div>

          <button
            onClick={() => {
              sessionStorage.removeItem("onlyfun-logout");
              localStorage.setItem("onlyfun-name", lockedName);
              setName(lockedName);
              setLoggedOut(false);
            }}
            className="w-full bg-white text-black font-semibold py-4 rounded-2xl text-base hover:bg-zinc-100 transition-all active:scale-[0.98]"
          >
            {t("landing.enter")}
          </button>

          <p className="text-white/20 text-xs mt-8">{t("profile.renameHint")}</p>
        </div>
      </div>
    );
  }

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
            <h1 className="text-5xl font-bold text-white mb-3 tracking-tight flex items-center justify-center gap-3">
              <img src="/logo.svg" alt="" className="h-12 w-12 invert" />
              onlyfun
            </h1>
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
                sessionStorage.removeItem("onlyfun-logout");
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
