"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useParty } from "./use-party";
import { InsideRoom, type VoiceHandle } from "./inside-pixel";
import { CreateModal } from "./create-modal";
import { useI18n } from "@/i18n";
import { LangSwitcher } from "./lang-switcher";
import { CityMapProvider as CityMap } from "./city-map-provider";
import { usePreview } from "./use-preview";
import { DesktopSidebar } from "./desktop-sidebar";
import { BishkekPulseFeed } from "./sidebar/BishkekPulseFeed";
import { EventsBox } from "./sidebar/EventsBox";
import { SponsorBox } from "./sidebar/SponsorBox";
import { LiveCamPlayer } from "./live-cam-player";
import { OnboardingTour, restartTour } from "./onboarding-tour";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { DraggableSheet } from "./draggable-sheet";
import { PodcastPanel, PodcastSheet } from "./podcast-feed";
import type { RoomModeId } from "@/types/room";

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

function SpeakerIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

function SpeakerOffIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );
}

// --- Weather hook ---
type WeatherData = {
  temp: number;
  descKey: string;
  icon: string;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windDir: string;
  uv: number;
  high: number;
  low: number;
} | null;

function windDirection(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

function useWeather() {
  const [weather, setWeather] = useState<WeatherData>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await fetch(
          "https://api.open-meteo.com/v1/forecast?latitude=42.87&longitude=74.59&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,is_day&daily=temperature_2m_max,temperature_2m_min,uv_index_max&timezone=Asia/Bishkek&forecast_days=1"
        );
        const data = await res.json();
        const c = data.current;
        const d = data.daily;
        const code = c.weather_code as number;
        const isDay = c.is_day === 1;

        let descKey = "weather.clear";
        let icon = isDay ? "☀️" : "🌙";
        if (code <= 1) {
          descKey = "weather.clear";
          icon = isDay ? "☀️" : "🌙";
        } else if (code <= 3) {
          descKey = "weather.cloudy";
          icon = isDay ? "⛅" : "☁️";
        } else if (code <= 48) {
          descKey = "weather.foggy";
          icon = "🌫️";
        } else if (code <= 57) {
          descKey = "weather.drizzle";
          icon = "🌦️";
        } else if (code <= 67) {
          descKey = "weather.rain";
          icon = "🌧️";
        } else if (code <= 77) {
          descKey = "weather.snow";
          icon = "🌨️";
        } else if (code <= 82) {
          descKey = "weather.showers";
          icon = "🌧️";
        } else if (code <= 86) {
          descKey = "weather.snow";
          icon = "🌨️";
        } else {
          descKey = "weather.storm";
          icon = "⛈️";
        }

        setWeather({
          temp: Math.round(c.temperature_2m),
          descKey,
          icon,
          feelsLike: Math.round(c.apparent_temperature),
          humidity: Math.round(c.relative_humidity_2m),
          windSpeed: Math.round(c.wind_speed_10m),
          windDir: windDirection(c.wind_direction_10m),
          uv: Math.round(d.uv_index_max[0]),
          high: Math.round(d.temperature_2m_max[0]),
          low: Math.round(d.temperature_2m_min[0]),
        });
      } catch {
        // silently fail
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return weather;
}

// --- Bishkek clock hook ---
function useBishkekTime() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const update = () =>
      setTime(
        new Date().toLocaleTimeString("en-GB", {
          timeZone: "Asia/Bishkek",
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    update();
    const id = setInterval(update, 10_000);
    return () => clearInterval(id);
  }, []);
  return time;
}

// --- Music hook ---
function useMusic() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio("/sounds/background.mp3");
      audioRef.current.loop = true;
      audioRef.current.volume = 0.3;
    }
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setPlaying(true);
    }
  }, [playing]);

  const pause = useCallback(() => {
    if (audioRef.current && playing) {
      audioRef.current.pause();
      setPlaying(false);
    }
  }, [playing]);

  const duck = useCallback(() => {
    if (audioRef.current && playing) audioRef.current.volume = 0.08;
  }, [playing]);

  const unduck = useCallback(() => {
    if (audioRef.current) audioRef.current.volume = 0.3;
  }, []);

  return { playing, toggle, pause, duck, unduck };
}

function MinimizedRoomPill({
  room,
  onExpand,
  onLeave,
  voiceHandle,
}: {
  room: { topic: string; color: string; people: { id: string; name: string }[]; maxPeople: number };
  onExpand: () => void;
  onLeave: () => void;
  voiceHandle: VoiceHandle | null;
}) {
  const muted = voiceHandle?.muted ?? true;
  const isSpeaking = voiceHandle?.isSpeaking ?? false;
  const hasSpeakers = (voiceHandle?.speakingPeers?.size ?? 0) > 0;

  return (
    <div
      className="fixed z-[600] animate-in"
      style={{
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)",
        left: "50%",
        transform: "translateX(-50%)",
      }}
    >
      <div
        className="flex items-center gap-1.5 px-1.5"
        style={{
          height: 52,
          borderRadius: 18,
          background: "rgba(28,28,30,0.92)",
          border: "1px solid rgba(255,255,255,0.10)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        {/* Mic toggle */}
        <button
          onClick={() => voiceHandle?.toggleMute()}
          className="relative flex items-center justify-center transition-all duration-200"
          style={{
            touchAction: "manipulation",
            width: 40,
            height: 40,
            borderRadius: 13,
            ...(muted
              ? { background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }
              : {
                  background: "rgba(34,197,94,0.18)",
                  color: "#22c55e",
                  boxShadow: "0 0 10px rgba(34,197,94,0.25)",
                }),
          }}
        >
          {muted ? (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
              <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .41-.04.81-.1 1.2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          ) : (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          )}
        </button>

        {/* Room info — tap to expand */}
        <button
          onClick={onExpand}
          className="flex items-center gap-2 px-2.5 py-1 active:opacity-70 transition-opacity"
          style={{ touchAction: "manipulation" }}
        >
          {/* Activity indicator */}
          <div
            className="relative flex items-center justify-center"
            style={{ width: 8, height: 8 }}
          >
            {(isSpeaking || hasSpeakers) && (
              <div
                className="absolute inset-0 rounded-full animate-ping"
                style={{ backgroundColor: "#22c55e", opacity: 0.5, animationDuration: "1.5s" }}
              />
            )}
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: isSpeaking || hasSpeakers ? "#22c55e" : room.color }}
            />
          </div>
          <span className="text-white text-[11px] font-medium truncate" style={{ maxWidth: 120 }}>
            {room.topic}
          </span>
          <span className="text-white/30 text-[10px] font-mono tabular-nums">
            {room.people.length}
          </span>
          {/* Expand chevron */}
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-white/30"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {/* Leave button */}
        <button
          onClick={onLeave}
          className="flex items-center justify-center active:scale-95 transition-all duration-200"
          style={{
            touchAction: "manipulation",
            width: 40,
            height: 40,
            borderRadius: 13,
            background: "linear-gradient(160deg, #ff4b4b 0%, #d93025 100%)",
            color: "#fff",
            boxShadow: "0 4px 12px rgba(239,68,68,0.3)",
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="currentColor"
            style={{ transform: "rotate(135deg)" }}
          >
            <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export function PixelCanvas({ name: initialName }: { name: string }) {
  const { t, locale } = useI18n();
  const party = useParty(initialName);
  const name = party.effectiveName;
  const [showCreate, setShowCreate] = useState<{ lat: number; lng: number } | null>(null);
  const [placing, setPlacing] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showWeather, setShowWeather] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [showPanel, setShowPanel] = useState(false);
  const [banToast, setBanToast] = useState<string | null>(null);
  const [warnOverlay, setWarnOverlay] = useState<string | null>(null);
  const [blockOverlay, setBlockOverlay] = useState<{ minutes: number; message: string } | null>(
    null
  );
  const [minimized, setMinimized] = useState(false);
  const pendingJoinRef = useRef<string | null>(null);
  const insideRoomVoiceRef = useRef<VoiceHandle | null>(null);
  // Force re-render for pill voice state (muted/speaking changes)
  const [, forceUpdate] = useState(0);
  const [liveCamOpen, setLiveCamOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    // Default to closed on mobile so onboarding tour is not blocked
    if (window.innerWidth < 640) return false;
    return localStorage.getItem("onlyfun-livecam") !== "closed";
  });
  const [pulseDraft, setPulseDraft] = useState<{ topic: string; mode: RoomModeId } | null>(null);
  const [showMobilePulse, setShowMobilePulse] = useState(false);
  const [showMobileEvents, setShowMobileEvents] = useState(false);
  const [showMobileSponsor, setShowMobileSponsor] = useState(false);
  const [showPodcast, setShowPodcast] = useState(false);
  const weather = useWeather();
  const bishkekTime = useBishkekTime();
  const music = useMusic();
  const preview = usePreview(party);
  const weatherRef = useRef<HTMLDivElement>(null);

  const profileRef = useRef<HTMLDivElement>(null);

  // Show banned toast
  useEffect(() => {
    party.onBanned.current = (mins: number) => {
      setBanToast(`${t("room.banned")} (${mins}m)`);
    };
    return () => {
      party.onBanned.current = undefined;
    };
  }, [party.onBanned, t]);

  useEffect(() => {
    if (!banToast) return;
    const id = setTimeout(() => setBanToast(null), 4000);
    return () => clearTimeout(id);
  }, [banToast]);

  // Admin warning overlay
  useEffect(() => {
    party.onAdminWarn.current = (message: string) => {
      setWarnOverlay(message);
    };
    return () => {
      party.onAdminWarn.current = undefined;
    };
  }, [party.onAdminWarn]);

  // Admin rename overlay
  useEffect(() => {
    party.onAdminRename.current = (newName: string) => {
      setWarnOverlay(`${t("profile.nameChanged")} "${newName}"`);
    };
    return () => {
      party.onAdminRename.current = undefined;
    };
  }, [party.onAdminRename, t]);

  // Admin block overlay
  useEffect(() => {
    party.onAdminBlock.current = (minutes: number, message: string) => {
      setBlockOverlay({ minutes, message });
    };
    return () => {
      party.onAdminBlock.current = undefined;
    };
  }, [party.onAdminBlock]);

  // Pause music when entering a room
  useEffect(() => {
    if (party.currentRoom) music.pause();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [party.currentRoom, music.pause]);

  // Duck music volume during preview, restore after
  useEffect(() => {
    if (preview.previewingRoomId) {
      music.duck();
    } else {
      music.unduck();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview.previewingRoomId, music.duck, music.unduck]);

  // Close weather dropdown on outside click
  useEffect(() => {
    if (!showWeather) return;
    const handler = (e: MouseEvent) => {
      if (weatherRef.current && !weatherRef.current.contains(e.target as Node)) {
        setShowWeather(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showWeather]);

  // Close profile dropdown on outside click
  useEffect(() => {
    if (!showProfile) return;
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfile(false);
        setEditingName(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showProfile]);

  // Reset minimized when room is left (e.g. kicked, host closed)
  useEffect(() => {
    if (!party.currentRoom) {
      setMinimized(false);
    }
  }, [party.currentRoom]);

  // Refresh pill UI when minimized (voice state changes: muted, speaking)
  useEffect(() => {
    if (!minimized) return;
    const id = setInterval(() => forceUpdate((n) => n + 1), 250);
    return () => clearInterval(id);
  }, [minimized]);

  // Auto-join pending room after leaving the current one
  useEffect(() => {
    if (!party.currentRoomId && pendingJoinRef.current) {
      const roomId = pendingJoinRef.current;
      pendingJoinRef.current = null;
      // Small delay to let cleanup finish
      setTimeout(() => party.joinRoom(roomId), 100);
    }
  }, [party.currentRoomId, party.joinRoom]);

  const handleJoinRoom = useCallback(
    (roomId: string) => {
      if (party.currentRoomId) {
        // Currently in a room — leave first, then join the new one
        pendingJoinRef.current = roomId;
        insideRoomVoiceRef.current?.stop();
        party.leaveRoom();
        setMinimized(false);
      } else {
        party.joinRoom(roomId);
      }
    },
    [party]
  );

  const handleMinimize = useCallback(() => {
    setMinimized(true);
  }, []);

  const handleExpand = useCallback(() => {
    setMinimized(false);
  }, []);

  const handleLogout = () => {
    sessionStorage.setItem("onlyfun-logout", "1");
    window.location.reload();
  };

  // When in room and NOT minimized, render InsideRoom as the full screen
  // (the map JSX below still renders but InsideRoom is on top)
  // When minimized, InsideRoom is pushed off-screen but stays mounted

  // Cast t for dynamic keys
  const tw = (key: string) => t(key as Parameters<typeof t>[0]);
  const tp = (key: string) => t(key as Parameters<typeof t>[0]);

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-black">
      {/* InsideRoom — always mounted when in a room, visibility toggled */}
      {party.currentRoom && (
        <div
          className="fixed inset-0 z-[500]"
          style={
            minimized
              ? {
                  position: "fixed",
                  left: -9999,
                  top: -9999,
                  width: 1,
                  height: 1,
                  overflow: "hidden",
                }
              : undefined
          }
          aria-hidden={minimized}
        >
          <InsideRoom party={party} onMinimize={handleMinimize} voiceRef={insideRoomVoiceRef} />
        </div>
      )}
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 sm:px-5 border-b border-white/10 shrink-0 z-[450] bg-black"
        style={{ paddingTop: "max(0.625rem, env(safe-area-inset-top))", paddingBottom: "0.625rem" }}
      >
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
            <img src="/logo.svg" alt="" className="h-6 w-6 invert" />
            onlyfun
          </h1>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white/40 text-xs hidden sm:inline">
              {party.onlineCount} {t("nav.online")}
            </span>
            <span className="text-white/40 text-xs sm:hidden">{party.onlineCount}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* All rooms */}
          <button
            data-tour="all-rooms"
            onClick={() => setShowPanel((v) => !v)}
            className={`hidden sm:flex items-center gap-1.5 h-8 px-2 sm:px-2.5 rounded-lg text-xs font-medium border transition-all ${
              showPanel
                ? "bg-white/10 text-white border-white/20"
                : "bg-white/5 text-white/70 border-white/10 hover:border-white/20 hover:text-white"
            }`}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
            <span className="hidden sm:inline">{t("nav.allRooms")}</span>
            <span className="bg-white/15 text-white/80 text-[9px] font-bold px-1 py-0.5 rounded-full">
              {party.rooms.length}
            </span>
          </button>

          {/* Podcast */}
          <button
            data-tour="podcast"
            onClick={() => setShowPodcast((v) => !v)}
            className={`flex items-center gap-1 h-8 px-2 sm:px-2.5 rounded-lg text-xs font-medium border transition-all ${
              showPodcast
                ? "bg-amber-500/20 text-amber-300 border-amber-400/30"
                : "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/15"
            }`}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            <span className="hidden sm:inline">{t("podcast.button")}</span>
          </button>

          {/* Weather — always visible */}
          {weather && (
            <div className="relative" ref={weatherRef}>
              <button
                onClick={() => setShowWeather((v) => !v)}
                className="flex items-center gap-1 h-8 px-2 sm:px-2.5 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-all"
              >
                <span className="text-sm leading-none">{weather.icon}</span>
                <span className="text-xs text-white font-medium">{weather.temp}°</span>
              </button>
              {showWeather && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-zinc-900 rounded-2xl border border-white/10 shadow-2xl p-4 z-[460] animate-in">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs text-white/40">{t("weather.location")}</p>
                        {bishkekTime && (
                          <p className="text-xs font-medium text-white/50">{bishkekTime}</p>
                        )}
                      </div>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="text-3xl font-bold text-white">{weather.temp}°</span>
                        <span className="text-lg">{weather.icon}</span>
                      </div>
                      <p className="text-xs text-white/50 capitalize">{tw(weather.descKey)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-white/40">
                        {t("weather.high")}: {weather.high}° {t("weather.low")}: {weather.low}°
                      </p>
                      <p className="text-xs text-white/40 mt-0.5">
                        {t("weather.feelsLike")} {weather.feelsLike}°
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white/5 rounded-xl p-2.5 text-center">
                      <p className="text-[10px] text-white/40 mb-0.5">{t("weather.humidity")}</p>
                      <p className="text-sm font-semibold text-white">{weather.humidity}%</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-2.5 text-center">
                      <p className="text-[10px] text-white/40 mb-0.5">{t("weather.wind")}</p>
                      <p className="text-sm font-semibold text-white">
                        {weather.windSpeed}{" "}
                        <span className="text-[10px] font-normal text-white/40">
                          {t("weather.kmh")} {weather.windDir}
                        </span>
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-2.5 text-center">
                      <p className="text-[10px] text-white/40 mb-0.5">{t("weather.uv")}</p>
                      <p className="text-sm font-semibold text-white">{weather.uv}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Desktop-only: profile */}
          <div className="hidden sm:flex items-center gap-1.5">
            <div className="relative" ref={profileRef}>
              <button
                data-tour="profile-btn"
                onClick={() => setShowProfile((v) => !v)}
                className={`flex items-center gap-1.5 px-2.5 h-8 rounded-lg border transition-all ${
                  showProfile
                    ? "bg-white/10 border-white/20"
                    : "bg-white/5 border-white/10 hover:border-white/20"
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center text-[9px] font-bold text-black uppercase shrink-0">
                  {name[0]}
                </div>
                <span className="text-xs font-medium text-white/70 max-w-[80px] truncate">
                  {name}
                </span>
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-white/30"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {showProfile && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-zinc-900 rounded-2xl border border-white/10 shadow-2xl z-[460] animate-in overflow-hidden">
                  {/* User info / edit name */}
                  {editingName ? (
                    <form
                      className="px-4 py-3 border-b border-white/5"
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (nameInput.trim().length >= 2) {
                          party.changeName(nameInput.trim());
                          setEditingName(false);
                        }
                      }}
                    >
                      <p className="text-[11px] text-white/40 mb-2">{t("profile.editNameHint")}</p>
                      <input
                        autoFocus
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        maxLength={20}
                        className="w-full bg-white/10 text-white text-sm px-3 py-2 rounded-xl border border-white/20 focus:outline-none focus:border-white/40 placeholder-white/20"
                        placeholder={t("profile.namePlaceholder")}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") setEditingName(false);
                        }}
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => setEditingName(false)}
                          className="flex-1 text-xs text-white/50 hover:text-white py-1.5 rounded-lg hover:bg-white/5 transition-colors"
                        >
                          {t("profile.cancel")}
                        </button>
                        <button
                          type="submit"
                          disabled={nameInput.trim().length < 2 || nameInput.trim() === name}
                          className="flex-1 text-xs text-white font-medium py-1.5 rounded-lg bg-white/10 hover:bg-white/15 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          {t("profile.save")}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-xs font-bold text-black uppercase shrink-0">
                        {name[0]}
                      </div>
                      <span className="text-sm font-medium text-white truncate">{name}</span>
                    </div>
                  )}
                  <div className="py-1">
                    {/* Edit name */}
                    {!editingName && (
                      <button
                        onClick={() => {
                          setNameInput(name);
                          setEditingName(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-white/5 transition-colors"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-white/40"
                        >
                          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                        </svg>
                        <span className="text-sm text-white/60">{t("profile.editName")}</span>
                      </button>
                    )}
                    {/* Language */}
                    <div className="flex items-center justify-between px-4 py-2.5 hover:bg-white/5 transition-colors">
                      <span className="text-sm text-white/60">{t("nav.language")}</span>
                      <LangSwitcher />
                    </div>
                    {/* Info */}
                    <button
                      onClick={() => {
                        setShowProfile(false);
                        setShowInfo(true);
                      }}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/5 transition-colors"
                    >
                      <span className="text-sm text-white/60">{t("info.title")}</span>
                      <InfoIcon className="text-white/30 w-4 h-4" />
                    </button>
                    {/* Retake tour */}
                    <button
                      onClick={() => {
                        setShowProfile(false);
                        restartTour();
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-white/5 transition-colors"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-white/40"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <polygon points="10 8 16 12 10 16 10 8" />
                      </svg>
                      <span className="text-sm text-white/60">{t("tour.retake")}</span>
                    </button>
                    {/* Logout */}
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-white/5 transition-colors text-red-400"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      <span className="text-sm">{t("nav.logout")}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile-only: sound toggle + more menu */}
          <div className="sm:hidden flex items-center gap-1.5">
            <button
              data-tour="mobile-music"
              onClick={() => music.toggle()}
              className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${music.playing ? "bg-white/15 border-white/20 text-white" : "bg-white/5 border-white/10 text-white/40 active:text-white"}`}
            >
              {music.playing ? <SpeakerIcon /> : <SpeakerOffIcon />}
            </button>
            <button
              data-tour="mobile-menu"
              onClick={() => {
                if (showMore) {
                  setShowMore(false);
                  setEditingName(false);
                } else {
                  setShowMore(true);
                }
              }}
              className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${
                showMore
                  ? "bg-white/15 border-white/20 text-white"
                  : "bg-white/5 border-white/10 text-white/40 active:text-white"
              }`}
            >
              {showMore ? (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main content: sidebar + map */}
      <div className="flex flex-1 overflow-hidden">
        <DesktopSidebar
          musicPlaying={music.playing}
          onMusicToggle={music.toggle}
          liveCamOpen={liveCamOpen}
          onLiveCamToggle={() => {
            if (liveCamOpen) {
              localStorage.setItem("onlyfun-livecam", "closed");
              setLiveCamOpen(false);
            } else {
              localStorage.removeItem("onlyfun-livecam");
              setLiveCamOpen(true);
            }
          }}
          liveBadgeText={t("live.badge")}
          onTalkAbout={(topic, mode) => {
            setPulseDraft({ topic, mode });
            setPlacing(true);
          }}
          rooms={party.rooms}
          onJoinRoom={handleJoinRoom}
        />

        {/* Map */}
        <div data-tour="map" className="relative flex-1 overflow-hidden flex flex-col">
          <CityMap
            rooms={party.rooms}
            onJoin={handleJoinRoom}
            t={t}
            placing={placing}
            setPlacing={setPlacing}
            onPlace={(lat, lng) => setShowCreate({ lat, lng })}
            showPanel={showPanel}
            setShowPanel={setShowPanel}
            onPreview={preview.startPreview}
            previewingRoomId={preview.previewingRoomId}
          />

          {/* Desktop podcast side panel */}
          {showPodcast && (
            <div className="hidden sm:block">
              <PodcastPanel userName={name} onClose={() => setShowPodcast(false)} t={tw} />
            </div>
          )}

          {/* Preview listening indicator */}
          {preview.previewingRoomId && (
            <div
              className="flex items-center gap-2 px-4 py-2.5 rounded-full animate-in"
              style={{
                position: "absolute",
                bottom: "max(140px, env(safe-area-inset-bottom, 0px) + 130px)",
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 500,
                pointerEvents: "none",
                background: "rgba(0,0,0,0.9)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              <div className="flex items-end gap-[2px]" style={{ height: 12 }}>
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className="music-bar"
                    style={{ width: 2, backgroundColor: "#22c55e", animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
              <span className="text-white/80 text-xs font-medium">
                {t("room.previewListening")} {preview.previewCountdown}s
              </span>
            </div>
          )}

          {/* Cooldown toast */}
          {preview.cooldownMsg && (
            <div
              className="animate-in"
              style={{
                position: "absolute",
                top: 16,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 500,
                pointerEvents: "none",
                background: "rgba(0,0,0,0.92)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 20,
                padding: "8px 16px",
                whiteSpace: "nowrap",
              }}
            >
              <span className="text-white/60 text-xs font-medium">
                {t("room.previewCooldown")} {preview.cooldownMsg}
              </span>
            </div>
          )}

          {/* Ban toast */}
          {banToast && (
            <div
              className="animate-in"
              style={{
                position: "absolute",
                top: 16,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 500,
                pointerEvents: "none",
                background: "rgba(239,68,68,0.95)",
                borderRadius: 20,
                padding: "8px 16px",
                whiteSpace: "nowrap",
              }}
            >
              <span className="text-white text-xs font-medium">{banToast}</span>
            </div>
          )}

          {/* Admin warning overlay */}
          {warnOverlay && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 9999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)" }}
                onClick={() => setWarnOverlay(null)}
              />
              <div
                className="animate-in"
                style={{
                  position: "relative",
                  background: "#000",
                  border: "1px solid rgba(234,179,8,0.3)",
                  borderRadius: 20,
                  padding: "32px 28px",
                  maxWidth: 360,
                  width: "90%",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 12 }}>{"\u26A0\uFE0F"}</div>
                <p style={{ color: "#eab308", fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
                  Warning
                </p>
                <p
                  style={{
                    color: "rgba(255,255,255,0.7)",
                    fontSize: 14,
                    lineHeight: 1.5,
                    marginBottom: 20,
                  }}
                >
                  {warnOverlay}
                </p>
                <button
                  onClick={() => setWarnOverlay(null)}
                  style={{
                    background: "#eab308",
                    color: "#000",
                    fontWeight: 600,
                    fontSize: 14,
                    padding: "10px 32px",
                    borderRadius: 12,
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  I understand
                </button>
              </div>
            </div>
          )}

          {/* Admin block overlay */}
          {blockOverlay && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 99999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(0,0,0,0.95)",
              }}
            >
              <div
                className="animate-in"
                style={{
                  background: "#000",
                  border: "1px solid rgba(239,68,68,0.3)",
                  borderRadius: 20,
                  padding: "32px 28px",
                  maxWidth: 360,
                  width: "90%",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 12 }}>{"\u{1F6AB}"}</div>
                <p style={{ color: "#ef4444", fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
                  You are blocked
                </p>
                <p
                  style={{
                    color: "rgba(255,255,255,0.7)",
                    fontSize: 14,
                    lineHeight: 1.5,
                    marginBottom: 4,
                  }}
                >
                  {blockOverlay.message}
                </p>
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
                  Come back after {blockOverlay.minutes} minutes
                </p>
              </div>
            </div>
          )}

          {/* Live Bishkek cam — embed overlay (mobile only, desktop uses side panel) */}
          {!placing && liveCamOpen && !party.currentRoom && (
            <div
              className="absolute z-[400] transition-all duration-300 sm:hidden"
              style={{ top: 12, left: 12 }}
            >
              <LiveCamPlayer
                badgeText={t("live.badge")}
                variant="mobile"
                onClose={() => {
                  localStorage.setItem("onlyfun-livecam", "closed");
                  setLiveCamOpen(false);
                }}
              />
            </div>
          )}

          {/* + FAB — desktop only, hidden while placing or in room */}
          {!placing && !party.currentRoom && (
            <button
              data-tour="create-fab-desktop"
              onClick={() => setPlacing(true)}
              style={{
                touchAction: "manipulation",
                position: "absolute",
                bottom: "max(24px, env(safe-area-inset-bottom, 0px) + 16px)",
                right: 20,
                zIndex: 500,
              }}
              className="hidden sm:flex w-14 h-14 rounded-full bg-white text-black items-center justify-center shadow-2xl active:scale-95 transition-transform"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          )}
        </div>
      </div>
      {/* end sidebar + map wrapper */}

      {/* Mobile bottom navigation */}
      <MobileBottomNav
        onLiveTap={() => {
          setShowMobilePulse(false);
          setShowMobileEvents(false);
          setShowPanel(false);
          if (liveCamOpen) {
            localStorage.setItem("onlyfun-livecam", "closed");
            setLiveCamOpen(false);
          } else {
            localStorage.removeItem("onlyfun-livecam");
            setLiveCamOpen(true);
          }
        }}
        onPulseTap={() => {
          setLiveCamOpen(false);
          localStorage.setItem("onlyfun-livecam", "closed");
          setShowMobileEvents(false);
          setShowPanel(false);
          setShowMobilePulse((v) => !v);
        }}
        onCreateTap={() => setPlacing(true)}
        onEventsTap={() => {
          setLiveCamOpen(false);
          localStorage.setItem("onlyfun-livecam", "closed");
          setShowMobilePulse(false);
          setShowPanel(false);
          setShowMobileEvents((v) => !v);
        }}
        onRoomsTap={() => {
          setLiveCamOpen(false);
          localStorage.setItem("onlyfun-livecam", "closed");
          setShowMobilePulse(false);
          setShowMobileEvents(false);
          setShowPanel((v) => !v);
        }}
        liveCamOpen={liveCamOpen}
        pulseOpen={showMobilePulse}
        eventsOpen={showMobileEvents}
        roomsOpen={showPanel}
        hidden={placing || (!!party.currentRoom && !minimized)}
        roomCount={party.rooms.length}
        labels={{
          live: t("live.button"),
          pulse: tp("pulse.button"),
          create: t("nav.create"),
          events: tp("events.button"),
          rooms: t("nav.allRooms"),
        }}
      />

      <OnboardingTour />

      {showCreate && (
        <CreateModal
          onClose={() => {
            setShowCreate(null);
            setPulseDraft(null);
          }}
          onCreate={(topic, max, mode) => {
            party.createRoom(topic, max, showCreate.lat, showCreate.lng, mode, locale);
            setShowCreate(null);
            setPulseDraft(null);
          }}
          initialTopic={pulseDraft?.topic}
          initialMode={pulseDraft?.mode}
        />
      )}

      {/* Mobile Pulse drawer */}
      {showMobilePulse && (
        <DraggableSheet onClose={() => setShowMobilePulse(false)}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-2 pb-3 shrink-0">
            <div className="flex items-center gap-2">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-purple-400"
              >
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              <span className="text-sm font-semibold text-white/80">{tp("pulse.title")}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400/60 animate-pulse" />
            </div>
            <button
              onClick={() => setShowMobilePulse(false)}
              className="w-7 h-7 rounded-full bg-white/5 text-white/40 flex items-center justify-center"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          {/* Feed */}
          <div className="flex-1 overflow-y-auto px-4 pb-6">
            <BishkekPulseFeed
              onTalkAbout={(topic, mode) => {
                setShowMobilePulse(false);
                setPulseDraft({ topic, mode });
                setPlacing(true);
              }}
              rooms={party.rooms}
              onJoinRoom={(roomId) => {
                setShowMobilePulse(false);
                handleJoinRoom(roomId);
              }}
            />
          </div>
        </DraggableSheet>
      )}

      {/* Mobile Events drawer */}
      {showMobileEvents && (
        <DraggableSheet onClose={() => setShowMobileEvents(false)}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-2 pb-3 shrink-0">
            <div className="flex items-center gap-2">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-purple-400"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span className="text-sm font-semibold text-white/80">{tp("events.title")}</span>
            </div>
            <button
              onClick={() => setShowMobileEvents(false)}
              className="w-7 h-7 rounded-full bg-white/5 text-white/40 flex items-center justify-center"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          {/* Events Feed */}
          <div className="flex-1 overflow-y-auto px-4 pb-6">
            <EventsBox
              onTalkAbout={(topic, mode) => {
                setShowMobileEvents(false);
                setPulseDraft({ topic, mode });
                setPlacing(true);
              }}
              rooms={party.rooms}
              onJoinRoom={(roomId) => {
                setShowMobileEvents(false);
                handleJoinRoom(roomId);
              }}
            />
          </div>
        </DraggableSheet>
      )}

      {/* Mobile Sponsor drawer */}
      {showMobileSponsor && (
        <DraggableSheet onClose={() => setShowMobileSponsor(false)}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-2 pb-3 shrink-0">
            <div className="flex items-center gap-2">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-yellow-400"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <span className="text-sm font-semibold text-white/80">{tp("sponsor.title")}</span>
            </div>
            <button
              onClick={() => setShowMobileSponsor(false)}
              className="w-7 h-7 rounded-full bg-white/5 text-white/40 flex items-center justify-center"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          {/* Sponsor content */}
          <div className="flex-1 overflow-y-auto px-4 pb-6">
            <SponsorBox />
          </div>
        </DraggableSheet>
      )}

      {/* Podcast — mobile bottom sheet */}
      {showPodcast && (
        <div className="sm:hidden">
          <PodcastSheet userName={name} onClose={() => setShowPodcast(false)} t={tw} />
        </div>
      )}

      {showInfo && (
        <div
          className="fixed inset-0 z-[500] flex items-start sm:items-center justify-center bg-black/60"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowInfo(false);
          }}
        >
          <div
            className="w-full sm:max-w-sm sm:mx-4 bg-zinc-950 rounded-b-3xl sm:rounded-2xl border-0 sm:border border-white/10 shadow-2xl slide-down sm:animate-in overflow-hidden"
            style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
          >
            <div className="px-5 pt-4 sm:pt-6 pb-5">
              <h3 className="text-white text-base font-bold mb-4">{t("info.title")}</h3>
              <div className="space-y-3.5">
                {[
                  { icon: "💬", title: t("info.create.title"), desc: t("info.create.desc") },
                  { icon: "👋", title: t("info.join.title"), desc: t("info.join.desc") },
                  { icon: "🎙️", title: t("info.talk.title"), desc: t("info.talk.desc") },
                  { icon: "✋", title: t("info.move.title"), desc: t("info.move.desc") },
                ].map((item) => (
                  <div key={item.title} className="flex gap-3 items-start">
                    <span className="text-lg shrink-0 mt-0.5">{item.icon}</span>
                    <div>
                      <p className="text-white text-sm font-medium">{item.title}</p>
                      <p className="text-white/40 text-xs mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setShowInfo(false)}
                className="w-full mt-5 py-3 rounded-xl text-sm font-medium bg-white/5 text-white/50 border border-white/10 hover:bg-white/10 active:bg-white/15 transition-all"
              >
                {t("info.gotIt")}
              </button>
            </div>
            <div className="flex justify-center pt-1 pb-3 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>
          </div>
        </div>
      )}

      {/* Minimized room floating pill */}
      {party.currentRoom && minimized && (
        <MinimizedRoomPill
          room={party.currentRoom}
          onExpand={handleExpand}
          onLeave={() => {
            insideRoomVoiceRef.current?.stop();
            party.leaveRoom();
          }}
          voiceHandle={insideRoomVoiceRef.current}
        />
      )}

      {/* Mobile dropdown menu */}

      {showMore && (
        <div
          className="fixed inset-0 z-[500] sm:hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowMore(false);
              setEditingName(false);
            }
          }}
        >
          <div
            className="absolute right-3 w-64 bg-zinc-900 rounded-2xl border border-white/10 shadow-2xl animate-in overflow-hidden"
            style={{ top: "max(52px, env(safe-area-inset-top, 0px) + 44px)" }}
          >
            {/* User card */}
            {editingName ? (
              <form
                className="px-3 py-3 border-b border-white/5"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (nameInput.trim().length >= 2) {
                    party.changeName(nameInput.trim());
                    setEditingName(false);
                  }
                }}
              >
                <p className="text-[11px] text-white/40 mb-2">{t("profile.editNameHint")}</p>
                <input
                  autoFocus
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  maxLength={20}
                  style={{ fontSize: "16px" }}
                  className="w-full bg-white/10 text-white px-3 py-2 rounded-xl border border-white/20 focus:outline-none focus:border-white/40 placeholder-white/20 text-sm"
                  placeholder={t("profile.namePlaceholder")}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setEditingName(false);
                  }}
                />
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setEditingName(false)}
                    className="flex-1 text-xs text-white/50 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    {t("profile.cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={nameInput.trim().length < 2 || nameInput.trim() === name}
                    className="flex-1 text-xs text-white font-medium py-1.5 rounded-lg bg-white/10 hover:bg-white/15 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {t("profile.save")}
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => {
                  setNameInput(name);
                  setEditingName(true);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 border-b border-white/5 active:bg-white/5 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-xs font-bold text-black uppercase shrink-0">
                  {name[0]}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-white truncate">{name}</p>
                  <p className="text-[11px] text-white/30">{t("profile.editName")}</p>
                </div>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-white/20"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            )}

            <div className="py-1">
              {/* Lang */}
              <div className="flex items-center justify-between px-4 py-2.5 active:bg-white/5">
                <div className="flex items-center gap-2.5">
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-white/40"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                  <span className="text-sm text-white/60">{t("nav.language")}</span>
                </div>
                <LangSwitcher />
              </div>
              {/* Info */}
              <button
                onClick={() => {
                  setShowMore(false);
                  setShowInfo(true);
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 active:bg-white/5 transition-colors"
              >
                <InfoIcon className="text-white/40 w-[15px] h-[15px]" />
                <span className="text-sm text-white/60">{t("info.title")}</span>
              </button>
              {/* Retake tour */}
              <button
                onClick={() => {
                  setShowMore(false);
                  restartTour();
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 active:bg-white/5 transition-colors"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-white/40"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polygon points="10 8 16 12 10 16 10 8" />
                </svg>
                <span className="text-sm text-white/60">{t("tour.retake")}</span>
              </button>
              {/* Sponsor */}
              <button
                onClick={() => {
                  setShowMore(false);
                  setShowMobileSponsor(true);
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 active:bg-white/5 transition-colors"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-yellow-400"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <span className="text-sm text-white/60">{tp("sponsor.title")}</span>
              </button>
            </div>

            {/* Logout */}
            <div className="border-t border-white/5">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 active:bg-white/5 transition-colors text-red-400"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span className="text-sm">{t("nav.logout")}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
