"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useParty } from "./use-party";
import { InsideRoom } from "./inside-pixel";
import { CreateModal } from "./create-modal";
import { useI18n } from "@/i18n";
import { LangSwitcher } from "./lang-switcher";
import { CityMap } from "./city-map";

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

  return { playing, toggle };
}

export function PixelCanvas({ name }: { name: string }) {
  const { t } = useI18n();
  const party = useParty(name);
  const [showCreate, setShowCreate] = useState<{ lat: number; lng: number } | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showWeather, setShowWeather] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const weather = useWeather();
  const bishkekTime = useBishkekTime();
  const music = useMusic();
  const weatherRef = useRef<HTMLDivElement>(null);

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

  const onDblClick = useCallback((lat: number, lng: number) => {
    setShowCreate({ lat, lng });
  }, []);

  if (party.currentRoom) {
    return <InsideRoom party={party} />;
  }

  // Cast t for weather desc key
  const tw = (key: string) => t(key as Parameters<typeof t>[0]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-black">
      {/* Header */}
      <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3 border-b border-white/10 shrink-0 z-10 bg-black">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-white tracking-tight">onlyfun</h1>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white/40 text-xs hidden sm:inline">
              {party.onlineCount} {t("nav.online")}
            </span>
            <span className="text-white/40 text-xs sm:hidden">{party.onlineCount}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Create room */}
          <button
            onClick={() => setPlacing(true)}
            className={`flex items-center gap-1.5 h-8 px-2 sm:px-2.5 rounded-lg text-xs font-medium border transition-all ${
              placing
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
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span className="hidden sm:inline">
              {placing ? t("nav.placing") : t("nav.createRoom")}
            </span>
          </button>

          {/* All rooms */}
          <button
            onClick={() => setShowPanel((v) => !v)}
            className={`flex items-center gap-1.5 h-8 px-2 sm:px-2.5 rounded-lg text-xs font-medium border transition-all ${
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

          {/* Weather — always visible */}
          {weather && (
            <div className="relative" ref={weatherRef}>
              <button
                onClick={() => setShowWeather((v) => !v)}
                className="flex items-center gap-1 h-8 px-2 sm:px-2.5 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-all"
              >
                <span className="text-sm leading-none">{weather.icon}</span>
                <span className="text-xs text-white font-medium">{weather.temp}°</span>
                <span className="text-xs text-white/40 hidden sm:inline">
                  {tw(weather.descKey)}
                </span>
              </button>
              {showWeather && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-zinc-900 rounded-2xl border border-white/10 shadow-2xl p-4 z-50 animate-in">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs text-white/40">Bishkek, KG</p>
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
                          km/h {weather.windDir}
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

          {/* Desktop-only: lang, music, username, info */}
          <div className="hidden sm:flex items-center gap-1.5">
            <LangSwitcher />
            <button
              onClick={music.toggle}
              className={`h-8 rounded-lg flex items-center justify-center border transition-all gap-1.5 ${
                music.playing
                  ? "bg-white text-black border-white px-2"
                  : "bg-white/5 text-white/40 border-white/10 hover:text-white w-8"
              }`}
            >
              {music.playing ? (
                <>
                  <SpeakerIcon />
                  <div className="flex items-end gap-[2px] h-3">
                    {[1, 2, 3, 4].map((i) => (
                      <span
                        key={i}
                        className="w-[2px] bg-black rounded-full music-bar"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <SpeakerOffIcon />
              )}
            </button>
            <div className="flex items-center gap-1.5 px-2.5 h-8 rounded-lg bg-white/5 border border-white/10">
              <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center text-[9px] font-bold text-black uppercase shrink-0">
                {name[0]}
              </div>
              <span className="text-xs font-medium text-white/70 max-w-[80px] truncate">
                {name}
              </span>
            </div>
            <button
              onClick={() => setShowInfo(true)}
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 text-white/40 border border-white/10 hover:text-white transition-all"
            >
              <InfoIcon />
            </button>
          </div>

          {/* Mobile-only: more menu button */}
          <button
            onClick={() => setShowMore(true)}
            className="sm:hidden w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 text-white/40 border border-white/10 active:text-white transition-all"
          >
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
          </button>
        </div>
      </div>

      {/* Map */}
      <CityMap
        rooms={party.rooms}
        onJoin={party.joinRoom}
        onDblClick={onDblClick}
        t={t}
        placing={placing}
        setPlacing={setPlacing}
        showPanel={showPanel}
        setShowPanel={setShowPanel}
      />

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(null)}
          onCreate={(topic, max) => {
            party.createRoom(topic, max, showCreate.lat, showCreate.lng);
            setShowCreate(null);
          }}
        />
      )}

      {showInfo && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowInfo(false);
          }}
        >
          <div className="w-full sm:max-w-sm sm:mx-4 bg-zinc-950 rounded-t-3xl sm:rounded-2xl border-0 sm:border border-white/10 shadow-2xl slide-up sm:animate-in overflow-hidden">
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>
            <div
              className="px-5 pt-4 sm:pt-6 pb-5"
              style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
            >
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
          </div>
        </div>
      )}

      {/* Mobile more sheet */}
      {showMore && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:hidden bg-black/60"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowMore(false);
          }}
        >
          <div
            className="w-full bg-zinc-950 rounded-t-3xl border-t border-white/10 shadow-2xl slide-up"
            style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
          >
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>
            <div className="px-4 pb-2 space-y-1">
              {/* Username row */}
              <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/5">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-xs font-bold text-black uppercase shrink-0">
                  {name[0]}
                </div>
                <span className="text-sm font-medium text-white truncate">{name}</span>
              </div>
              {/* Lang */}
              <div className="flex items-center justify-between px-3 py-3 rounded-xl hover:bg-white/5">
                <span className="text-sm text-white/60">{t("nav.language")}</span>
                <LangSwitcher />
              </div>
              {/* Music */}
              <button
                onClick={() => {
                  music.toggle();
                  setShowMore(false);
                }}
                className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-white/5 transition-colors"
              >
                <span className="text-sm text-white/60">
                  {music.playing ? t("nav.musicOn") : t("nav.musicOff")}
                </span>
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs ${music.playing ? "bg-white text-black border-white" : "bg-white/5 text-white/40 border-white/10"}`}
                >
                  {music.playing ? <SpeakerIcon /> : <SpeakerOffIcon />}
                </div>
              </button>
              {/* Info */}
              <button
                onClick={() => {
                  setShowMore(false);
                  setShowInfo(true);
                }}
                className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-white/5 transition-colors"
              >
                <span className="text-sm text-white/60">{t("info.title")}</span>
                <InfoIcon className="text-white/30" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
