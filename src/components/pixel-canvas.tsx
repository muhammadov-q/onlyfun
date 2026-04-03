"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useParty } from "./use-party";
import { InsideRoom } from "./inside-pixel";
import { CreateModal } from "./create-modal";
import { useI18n } from "@/i18n";
import { LangSwitcher } from "./lang-switcher";
import type { Room } from "./use-party";

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

function SpeakerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

function SpeakerOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
        if (code <= 1) { descKey = "weather.clear"; icon = isDay ? "☀️" : "🌙"; }
        else if (code <= 3) { descKey = "weather.cloudy"; icon = isDay ? "⛅" : "☁️"; }
        else if (code <= 48) { descKey = "weather.foggy"; icon = "🌫️"; }
        else if (code <= 57) { descKey = "weather.drizzle"; icon = "🌦️"; }
        else if (code <= 67) { descKey = "weather.rain"; icon = "🌧️"; }
        else if (code <= 77) { descKey = "weather.snow"; icon = "🌨️"; }
        else if (code <= 82) { descKey = "weather.showers"; icon = "🌧️"; }
        else if (code <= 86) { descKey = "weather.snow"; icon = "🌨️"; }
        else { descKey = "weather.storm"; icon = "⛈️"; }

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
  const [showCreate, setShowCreate] = useState<{ x: number; y: number } | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showWeather, setShowWeather] = useState(false);
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

  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const lastPinchDist = useRef(0);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.92 : 1.08;
    setZoom((z) => Math.min(3, Math.max(0.15, z * factor)));
  }, []);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  // Touch: pinch zoom + single-finger pan
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchDist.current = Math.sqrt(dx * dx + dy * dy);
    } else if (e.touches.length === 1) {
      if ((e.target as HTMLElement).closest("[data-room]")) return;
      dragging.current = true;
      lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (lastPinchDist.current > 0) {
        const scale = dist / lastPinchDist.current;
        setZoom((z) => Math.min(3, Math.max(0.15, z * scale)));
      }
      lastPinchDist.current = dist;
      dragging.current = false;
    } else if (e.touches.length === 1 && dragging.current) {
      const touch = e.touches[0];
      setPan((p) => ({
        x: p.x + touch.clientX - lastPos.current.x,
        y: p.y + touch.clientY - lastPos.current.y,
      }));
      lastPos.current = { x: touch.clientX, y: touch.clientY };
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    dragging.current = false;
    lastPinchDist.current = 0;
  }, []);

  // Mouse pan — native listeners on document for Miro-like behavior
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      if ((e.target as HTMLElement).closest("[data-room]")) return;
      e.preventDefault();
      dragging.current = true;
      lastPos.current = { x: e.clientX, y: e.clientY };
      el.style.cursor = "grabbing";
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      if (!dragging.current) return;
      e.preventDefault();
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      lastPos.current = { x: e.clientX, y: e.clientY };
      setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
    };

    const onUp = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      if (!dragging.current) return;
      dragging.current = false;
      el.style.cursor = "grab";
    };

    el.addEventListener("pointerdown", onDown);
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };
  }, []);

  const onDoubleClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-room]")) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    setShowCreate({
      x: Math.round((e.clientX - rect.left - pan.x) / zoom),
      y: Math.round((e.clientY - rect.top - pan.y) / zoom),
    });
  }, [pan, zoom]);

  if (party.currentRoom) {
    return <InsideRoom party={party} />;
  }

  // Cast t for weather desc key
  const tw = (key: string) => t(key as Parameters<typeof t>[0]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-zinc-50">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-200/60 shrink-0 z-10 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-black tracking-tight">onlyfun</h1>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-zinc-400 text-xs">{party.onlineCount} {t("nav.online")}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <LangSwitcher />

          {/* Weather */}
          {weather && (
            <div className="relative" ref={weatherRef}>
              <button
                onClick={() => setShowWeather((v) => !v)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-50 border border-zinc-100 hover:border-zinc-300 transition-all"
              >
                <span className="text-sm">{weather.icon}</span>
                <span className="text-xs text-black font-medium">{weather.temp}°</span>
                <span className="text-xs text-zinc-400 hidden sm:inline">{tw(weather.descKey)}</span>
              </button>

              {showWeather && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl border border-zinc-200 shadow-xl p-4 z-50 animate-in">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs text-zinc-400">Bishkek, KG</p>
                        {bishkekTime && <p className="text-xs font-medium text-zinc-500">{bishkekTime}</p>}
                      </div>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="text-3xl font-bold text-black">{weather.temp}°</span>
                        <span className="text-lg">{weather.icon}</span>
                      </div>
                      <p className="text-xs text-zinc-500 capitalize">{tw(weather.descKey)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-zinc-400">{t("weather.high")}: {weather.high}° {t("weather.low")}: {weather.low}°</p>
                      <p className="text-xs text-zinc-400 mt-0.5">{t("weather.feelsLike")} {weather.feelsLike}°</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-zinc-50 rounded-xl p-2.5 text-center">
                      <p className="text-[10px] text-zinc-400 mb-0.5">{t("weather.humidity")}</p>
                      <p className="text-sm font-semibold text-black">{weather.humidity}%</p>
                    </div>
                    <div className="bg-zinc-50 rounded-xl p-2.5 text-center">
                      <p className="text-[10px] text-zinc-400 mb-0.5">{t("weather.wind")}</p>
                      <p className="text-sm font-semibold text-black">{weather.windSpeed} <span className="text-[10px] font-normal text-zinc-400">km/h {weather.windDir}</span></p>
                    </div>
                    <div className="bg-zinc-50 rounded-xl p-2.5 text-center">
                      <p className="text-[10px] text-zinc-400 mb-0.5">{t("weather.uv")}</p>
                      <p className="text-sm font-semibold text-black">{weather.uv}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Music toggle */}
          <button
            onClick={music.toggle}
            className={`h-8 rounded-lg flex items-center justify-center border transition-all gap-1.5 ${
              music.playing
                ? "bg-black text-white border-black px-2.5"
                : "bg-zinc-50 text-zinc-400 border-zinc-200 hover:text-black w-8"
            }`}
          >
            {music.playing ? (
              <>
                <SpeakerIcon />
                <div className="flex items-end gap-[2px] h-3">
                  {[1, 2, 3, 4].map((i) => (
                    <span
                      key={i}
                      className="w-[2px] bg-white rounded-full music-bar"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </>
            ) : (
              <SpeakerOffIcon />
            )}
          </button>

          {/* Username */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-50 border border-zinc-100">
            <div className="w-4 h-4 rounded-full bg-black flex items-center justify-center text-[9px] font-bold text-white uppercase">
              {name[0]}
            </div>
            <span className="text-xs font-medium text-zinc-700">{name}</span>
          </div>

          {/* Info */}
          <button
            onClick={() => setShowInfo(true)}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-zinc-50 text-zinc-400 border border-zinc-200 hover:text-black transition-all"
          >
            <InfoIcon />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="flex-1 relative select-none"
        style={{ touchAction: "none", cursor: "grab" }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={onDoubleClick}
      >
        {/* Dot grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.08) 1px, transparent 1px)",
            backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
            backgroundPosition: `${pan.x % (24 * zoom)}px ${pan.y % (24 * zoom)}px`,
          }}
        />

        {/* Rooms layer */}
        <div
          className="absolute"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
          }}
        >
          {party.rooms.map((room) => (
            <RoomCard key={room.id} room={room} onJoin={() => party.joinRoom(room.id)} t={t} />
          ))}

          {/* Welcome card — always visible on canvas */}
          <div className="absolute" style={{ left: 460, top: 30 }}>
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-md p-6 w-[280px] text-center">
              <p className="text-black text-base font-bold mb-1">{t("welcome.title")}</p>
              <p className="text-zinc-400 text-sm">{t("welcome.desc")}</p>
            </div>
          </div>
        </div>

        {/* Zoom controls */}
        <div className="absolute bottom-4 left-4 flex items-center gap-1 z-10">
          <button
            onClick={() => setZoom((z) => Math.min(3, z * 1.25))}
            className="w-8 h-8 rounded-lg bg-white border border-zinc-200 text-zinc-400 hover:text-black flex items-center justify-center shadow-sm text-sm"
          >+</button>
          <span className="text-zinc-400 text-[10px] w-10 text-center font-mono">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom((z) => Math.max(0.15, z / 1.25))}
            className="w-8 h-8 rounded-lg bg-white border border-zinc-200 text-zinc-400 hover:text-black flex items-center justify-center shadow-sm text-sm"
          >-</button>
        </div>
      </div>

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(null)}
          onCreate={(topic, max) => {
            party.createRoom(topic, max, showCreate.x, showCreate.y);
            setShowCreate(null);
          }}
        />
      )}

      {showInfo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowInfo(false); }}
        >
          <div className="w-full max-w-sm mx-4 bg-white rounded-2xl border border-zinc-200 shadow-xl animate-in p-6">
            <h3 className="text-black text-base font-bold mb-4">{t("info.title")}</h3>
            <div className="space-y-3">
              {[
                { icon: "💬", title: t("info.create.title"), desc: t("info.create.desc") },
                { icon: "👋", title: t("info.join.title"), desc: t("info.join.desc") },
                { icon: "🎙️", title: t("info.talk.title"), desc: t("info.talk.desc") },
                { icon: "✋", title: t("info.move.title"), desc: t("info.move.desc") },
              ].map((item) => (
                <div key={item.title} className="flex gap-3 items-start">
                  <span className="text-lg shrink-0 mt-0.5">{item.icon}</span>
                  <div>
                    <p className="text-black text-sm font-medium">{item.title}</p>
                    <p className="text-zinc-400 text-xs mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowInfo(false)}
              className="w-full mt-5 py-3 rounded-xl text-sm font-medium bg-zinc-50 text-zinc-500 border border-zinc-200 hover:bg-zinc-100 transition-all"
            >
              {t("info.gotIt")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RoomCard({ room, onJoin, t }: { room: Room; onJoin: () => void; t: ReturnType<typeof useI18n>["t"] }) {
  const full = room.people.length >= room.maxPeople;
  return (
    <div data-room className="absolute" style={{ left: room.x, top: room.y, width: 240 }}>
      <button
        onClick={onJoin}
        disabled={full}
        className="w-full bg-white rounded-2xl p-4 text-left border border-zinc-200/80 hover:border-zinc-300 hover:shadow-lg transition-all disabled:cursor-not-allowed shadow-sm group relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ backgroundColor: room.color }} />

        <div className="pt-1">
          <p className="text-black text-sm font-semibold leading-snug mb-1.5 line-clamp-2">
            {room.topic}
          </p>
          <p className="text-zinc-400 text-xs mb-3">{t("room.by")} {room.hostName}</p>

          <div className="flex items-center justify-between">
            <div className="flex -space-x-1.5">
              {room.people.map((p) => (
                <div
                  key={p.id}
                  className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold uppercase"
                  style={{ backgroundColor: room.color + "20", color: room.color }}
                >
                  {p.name[0]}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${full ? "bg-zinc-300" : "bg-emerald-400"}`} />
              <span className="text-zinc-400 text-xs">
                {room.people.length}/{room.maxPeople}
              </span>
            </div>
          </div>
        </div>

        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center bg-black/[0.03]">
          {full ? (
            <span className="bg-zinc-800 text-white text-xs px-4 py-1.5 rounded-full font-medium shadow-sm">
              {t("room.full")}
            </span>
          ) : (
            <span className="bg-black text-white text-xs px-4 py-1.5 rounded-full font-medium shadow-sm">
              {t("room.join")}
            </span>
          )}
        </div>
      </button>
    </div>
  );
}
