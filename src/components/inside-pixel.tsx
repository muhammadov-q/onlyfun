"use client";

import { useEffect, useRef, useState } from "react";
import type { PartyState } from "./use-party";
import { useVoice } from "./use-voice";
import { useI18n } from "@/i18n";
import { ROOM_MODES_MAP } from "@/config/roomModes";
import { MarbleRace } from "./marble-race";
import { TicTacToe } from "./tic-tac-toe";
import { EmojiMatch } from "./emoji-match";
import { PaddleBall } from "./paddle-ball";

export type VoiceHandle = {
  stop: () => void;
  toggleMute: () => void;
  muted: boolean;
  isSpeaking: boolean;
  speakingPeers: Set<string>;
};

// ─── Sound effects ────────────────────────────────────────────────────────────

function playTone(
  freq: number,
  startAt: number,
  duration: number,
  gain: number,
  ctx: AudioContext
) {
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.connect(amp);
  amp.connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.value = freq;
  amp.gain.setValueAtTime(0, ctx.currentTime + startAt);
  amp.gain.linearRampToValueAtTime(gain, ctx.currentTime + startAt + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + startAt + duration);
  osc.start(ctx.currentTime + startAt);
  osc.stop(ctx.currentTime + startAt + duration + 0.05);
}

function playJoinSound() {
  try {
    const ctx = new AudioContext();
    playTone(880, 0, 0.18, 0.22, ctx);
    playTone(1320, 0.12, 0.25, 0.16, ctx);
    setTimeout(() => ctx.close(), 1200);
  } catch {}
}

function playLeaveSound() {
  try {
    const ctx = new AudioContext();
    playTone(660, 0, 0.18, 0.2, ctx);
    playTone(440, 0.13, 0.28, 0.13, ctx);
    setTimeout(() => ctx.close(), 1200);
  } catch {}
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function MicIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
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
  );
}

function MicOffIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
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
  );
}

function PhoneDeclineIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      style={{ transform: "rotate(135deg)" }}
    >
      <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" />
    </svg>
  );
}

// ─── Sound wave bars ──────────────────────────────────────────────────────────

function SoundWave({ color }: { color: string }) {
  return (
    <div className="flex items-end gap-[3px]" style={{ height: 14 }}>
      {(
        [
          "sound-bar",
          "sound-bar sound-bar-2",
          "sound-bar sound-bar-3",
          "sound-bar sound-bar-4",
          "sound-bar sound-bar-5",
        ] as const
      ).map((cls, i) => (
        <div key={i} className={cls} style={{ backgroundColor: color, height: "100%" }} />
      ))}
    </div>
  );
}

// ─── Marble physics ───────────────────────────────────────────────────────────

const MARBLE_COLORS = [
  "#a855f7", // purple
  "#3b82f6", // blue
  "#ec4899", // pink
  "#f97316", // orange
  "#22c55e", // green
  "#06b6d4", // cyan
  "#eab308", // yellow
  "#ef4444", // red
  "#8b5cf6", // violet
  "#14b8a6", // teal
];

function marbleColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return MARBLE_COLORS[hash % MARBLE_COLORS.length];
}

const GREEN = "#22c55e";
const RED = "#ef4444";
const R = 34; // avatar radius in px

type PhysPos = { x: number; y: number; vx: number; vy: number };

function MarbleParticipants({
  people,
  myId,
  isSpeaking,
  speakingPeers,
  muted,
  onSelect,
  selectedId,
  youLabel,
}: {
  people: { id: string; name: string }[];
  myId: string | null;
  isSpeaking: boolean;
  speakingPeers: Set<string>;
  muted: boolean;
  onSelect?: (id: string) => void;
  selectedId?: string | null;
  youLabel: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const posRef = useRef<Map<string, PhysPos>>(new Map());
  const elemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const rafRef = useRef<number>(0);
  const dragRef = useRef<{
    id: string;
    lastX: number;
    lastY: number;
    vx: number;
    vy: number;
  } | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 });

  // Measure container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      sizeRef.current = { w: el.offsetWidth, h: el.offsetHeight };
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Sync people: add new, remove gone
  useEffect(() => {
    const { w, h } = sizeRef.current;
    const cw = w || 320;
    const ch = h || 500;
    const ids = new Set(people.map((p) => p.id));

    for (const id of [...posRef.current.keys()]) {
      if (!ids.has(id)) posRef.current.delete(id);
    }
    people.forEach((p) => {
      if (!posRef.current.has(p.id)) {
        // Start at center with a tiny random nudge so collisions can separate them
        posRef.current.set(p.id, {
          x: cw / 2 + (Math.random() - 0.5) * 4,
          y: ch / 2 + (Math.random() - 0.5) * 4,
          vx: 0,
          vy: 0,
        });
      }
    });
  }, [people]);

  // Physics RAF loop — updates DOM directly, no React re-renders
  useEffect(() => {
    const tick = () => {
      const { w, h } = sizeRef.current;
      if (w > 0 && h > 0) {
        const ids = [...posRef.current.keys()];

        // Spring toward center + damping
        const cx = w / 2;
        const cy = h / 2;
        const k = 0.07; // spring stiffness
        const damp = 0.8; // velocity damping per frame

        for (const id of ids) {
          if (dragRef.current?.id === id) continue;
          const p = posRef.current.get(id)!;
          p.vx += (cx - p.x) * k;
          p.vy += (cy - p.y) * k;
          p.vx *= damp;
          p.vy *= damp;
          p.x += p.vx;
          p.y += p.vy;
        }

        // Circle-circle collisions
        for (let i = 0; i < ids.length; i++) {
          for (let j = i + 1; j < ids.length; j++) {
            const a = posRef.current.get(ids[i])!;
            const b = posRef.current.get(ids[j])!;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minD = R * 2 + 6;
            if (dist < minD && dist > 0.001) {
              const nx = dx / dist;
              const ny = dy / dist;
              const overlap = (minD - dist) / 2;
              const aDrag = dragRef.current?.id === ids[i];
              const bDrag = dragRef.current?.id === ids[j];
              if (!aDrag) {
                a.x -= nx * overlap;
                a.y -= ny * overlap;
              }
              if (!bDrag) {
                b.x += nx * overlap;
                b.y += ny * overlap;
              }
              const dot = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
              if (dot > 0) {
                if (!aDrag) {
                  a.vx -= dot * nx * 0.7;
                  a.vy -= dot * ny * 0.7;
                }
                if (!bDrag) {
                  b.vx += dot * nx * 0.7;
                  b.vy += dot * ny * 0.7;
                }
              }
            }
          }
        }

        // Apply positions to DOM
        for (const [id, pos] of posRef.current) {
          const el = elemRefs.current.get(id);
          if (el) {
            el.style.left = `${pos.x - R}px`;
            el.style.top = `${pos.y - R}px`;
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      {people.map((p) => {
        const isMe = myId !== null && p.id === myId;
        const speaking = isMe ? isSpeaking : speakingPeers.has(p.id);
        const isMuted = isMe && muted;
        const isSelected = selectedId === p.id;
        const color = marbleColor(p.id);

        return (
          <div
            key={p.id}
            ref={(el) => {
              if (el) elemRefs.current.set(p.id, el);
              else elemRefs.current.delete(p.id);
            }}
            className="absolute select-none"
            style={{
              width: R * 2,
              height: R * 2,
              left: 0,
              top: 0,
              touchAction: "none",
              cursor: "grab",
            }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              const pos = posRef.current.get(p.id);
              if (pos) {
                pos.vx = 0;
                pos.vy = 0;
              }
              dragRef.current = { id: p.id, lastX: e.clientX, lastY: e.clientY, vx: 0, vy: 0 };
            }}
            onPointerMove={(e) => {
              if (dragRef.current?.id !== p.id) return;
              const pos = posRef.current.get(p.id);
              if (!pos) return;
              const dx = e.clientX - dragRef.current.lastX;
              const dy = e.clientY - dragRef.current.lastY;
              pos.x += dx;
              pos.y += dy;
              dragRef.current.vx = dx;
              dragRef.current.vy = dy;
              dragRef.current.lastX = e.clientX;
              dragRef.current.lastY = e.clientY;
            }}
            onPointerUp={(e) => {
              if (dragRef.current?.id !== p.id) return;
              const pos = posRef.current.get(p.id);
              const wasDrag =
                dragRef.current &&
                (Math.abs(dragRef.current.vx) > 2 || Math.abs(dragRef.current.vy) > 2);
              if (pos && dragRef.current) {
                pos.vx = dragRef.current.vx * 2.5;
                pos.vy = dragRef.current.vy * 2.5;
              }
              dragRef.current = null;
              // Tap (not drag) — select for admin actions
              if (!wasDrag && !isMe && onSelect) {
                e.stopPropagation();
                onSelect(p.id);
              }
            }}
            onPointerCancel={() => {
              if (dragRef.current?.id === p.id) dragRef.current = null;
            }}
          >
            {/* Selection ring */}
            {isSelected && (
              <div
                className="absolute rounded-full pointer-events-none"
                style={{
                  inset: -4,
                  border: "2px solid #fff",
                  opacity: 0.6,
                }}
              />
            )}

            {/* Speaking rings */}
            {speaking && (
              <>
                <div className="speak-ring" style={{ backgroundColor: color + "55" }} />
                <div
                  className="speak-ring speak-ring-2"
                  style={{ backgroundColor: color + "38" }}
                />
                <div
                  className="speak-ring speak-ring-3"
                  style={{ backgroundColor: color + "20" }}
                />
              </>
            )}

            {/* Circle — glass marble */}
            <div
              className="absolute inset-0 rounded-full flex items-center justify-center font-bold z-10 overflow-hidden"
              style={{
                fontSize: "1.15rem",
                background: `radial-gradient(circle at 35% 30%, ${color}ff 0%, ${color}bb 45%, ${color}33 100%)`,
                border: `1.5px solid ${color}99`,
                color: "#fff",
                textShadow: `0 1px 4px rgba(0,0,0,0.5)`,
                boxShadow: speaking
                  ? `0 0 20px ${color}88, 0 0 40px ${color}33, inset 0 1px 6px rgba(255,255,255,0.25)`
                  : `0 6px 20px rgba(0,0,0,0.5), inset 0 1px 6px rgba(255,255,255,0.2), inset 0 -2px 4px rgba(0,0,0,0.3)`,
              }}
            >
              {/* Highlight glint */}
              <div
                className="absolute rounded-full pointer-events-none"
                style={{
                  width: "38%",
                  height: "22%",
                  top: "14%",
                  left: "18%",
                  background:
                    "radial-gradient(ellipse, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0) 100%)",
                  transform: "rotate(-25deg)",
                }}
              />
              {/* Small bottom reflection */}
              <div
                className="absolute rounded-full pointer-events-none"
                style={{
                  width: "22%",
                  height: "10%",
                  bottom: "16%",
                  right: "20%",
                  background:
                    "radial-gradient(ellipse, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 100%)",
                }}
              />
              <span className="relative z-10">{p.name[0].toUpperCase()}</span>
            </div>

            {/* Muted badge */}
            {isMuted && (
              <div
                className="absolute -bottom-0.5 -right-0.5 z-20 rounded-full bg-white border-2 border-black flex items-center justify-center text-black"
                style={{ width: 20, height: 20 }}
              >
                <MicOffIcon size={11} />
              </div>
            )}

            {/* Name below */}
            <div
              className="absolute left-1/2 text-center text-white/55 font-medium leading-tight"
              style={{
                top: R * 2 + 5,
                transform: "translateX(-50%)",
                fontSize: 11,
                whiteSpace: "nowrap",
                pointerEvents: "none",
              }}
            >
              {p.name}
              {isMe && (
                <span className="block text-white/25" style={{ fontSize: 9 }}>
                  {youLabel}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Ice Breaker Flashcard ───────────────────────────────────────────────────

/** Parse *bold* and **bold** markdown into React elements */
function renderBold(text: string) {
  const parts = text.split(/(\*{1,2}[^*]+\*{1,2})/g);
  return parts.map((part, i) => {
    const match = part.match(/^\*{1,2}([^*]+)\*{1,2}$/);
    if (match)
      return (
        <strong key={i} className="text-white font-bold">
          {match[1]}
        </strong>
      );
    return part;
  });
}

function IceBreakerCard({
  questions,
  currentIndex,
  isHost,
  onNext,
  t,
}: {
  questions: string[];
  currentIndex: number;
  isHost: boolean;
  onNext: () => void;
  t: ReturnType<typeof useI18n>["t"];
}) {
  const [animating, setAnimating] = useState(false);
  const prevIndex = useRef(currentIndex);

  useEffect(() => {
    if (prevIndex.current !== currentIndex) {
      setAnimating(true);
      const timer = setTimeout(() => setAnimating(false), 300);
      prevIndex.current = currentIndex;
      return () => clearTimeout(timer);
    }
  }, [currentIndex]);

  if (questions.length === 0) return null;

  const question = questions[currentIndex] ?? questions[0];

  return (
    <div className="absolute top-3 left-3 right-3 z-20 pointer-events-auto">
      {/* Liquid gradient border */}
      <div
        className="rounded-2xl p-[1px] animate-in ice-breaker-glow"
        style={{
          background:
            "linear-gradient(135deg, rgba(168,85,247,0.5), rgba(59,130,246,0.3), rgba(168,85,247,0.5))",
          backgroundSize: "200% 200%",
        }}
      >
        <div
          className="rounded-2xl px-4 py-3"
          style={{
            background: "rgba(16,16,20,0.92)",
          }}
        >
          {/* Header: AI badge + counter */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <div
                className="flex items-center gap-1 px-1.5 py-0.5 rounded-md"
                style={{
                  background: "rgba(168,85,247,0.2)",
                  border: "1px solid rgba(168,85,247,0.3)",
                }}
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgb(168,85,247)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" />
                </svg>
                <span className="text-[9px] font-semibold" style={{ color: "rgb(168,85,247)" }}>
                  AI
                </span>
              </div>
              <span className="text-white/20 text-[10px] font-mono">
                {currentIndex + 1}/{questions.length}
              </span>
            </div>

            {isHost && (
              <button
                onClick={onNext}
                style={{ touchAction: "manipulation" }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-white/40 hover:text-white/70 active:text-white active:bg-white/10 transition-colors"
              >
                <span>{t("room.nextQuestion")}</span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            )}
          </div>

          {/* Question text */}
          <p
            className={`text-white/90 text-[13px] leading-relaxed font-medium transition-all duration-300 ${
              animating ? "opacity-0 translate-y-1" : "opacity-100 translate-y-0"
            }`}
          >
            {renderBold(question)}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── InsideRoom ───────────────────────────────────────────────────────────────

export function InsideRoom({
  party,
  onMinimize,
  voiceRef,
}: {
  party: PartyState;
  onMinimize?: () => void;
  voiceRef?: React.MutableRefObject<VoiceHandle | null>;
}) {
  const room = party.currentRoom!;
  const voice = useVoice(party);
  const { t, locale } = useI18n();
  const [selectedPeer, setSelectedPeer] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showGameMenu, setShowGameMenu] = useState(false);
  const [soloGame, setSoloGame] = useState<"emoji-match" | "paddle-ball" | null>(null);
  const isHost = party.myId === room.hostId;

  useEffect(() => {
    voice.start();
    return () => voice.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Expose voice state to parent via ref (for minimized pill + room switching)
  useEffect(() => {
    if (voiceRef) {
      voiceRef.current = {
        stop: voice.stop,
        toggleMute: voice.toggleMute,
        muted: voice.muted,
        isSpeaking: voice.isSpeaking,
        speakingPeers: voice.speakingPeers,
      };
    }
    // Intentionally update every render so muted/speaking stay current
  });

  // Show toast when force-muted by host
  useEffect(() => {
    if (voice.wasForceMuted) {
      setToast(t("room.youWereMuted"));
      voice.clearForceMuted();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice.wasForceMuted, voice.clearForceMuted, t]);

  // Auto-hide toast
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  const prevPeopleRef = useRef<string[]>([]);
  useEffect(() => {
    const prev = new Set(prevPeopleRef.current);
    const current = room.people.map((p) => p.id);
    // Someone new joined
    for (const id of current) {
      if (!prev.has(id) && id !== party.myId && prev.size > 0) playJoinSound();
    }
    // Someone left
    for (const id of prevPeopleRef.current) {
      if (!current.includes(id) && id !== party.myId) playLeaveSound();
    }
    prevPeopleRef.current = current;
  }, [room.people, party.myId]);

  const myPerson = room.people.find((p) => p.id === party.myId);
  const activeSpeaker: string | null = voice.isSpeaking
    ? (myPerson?.name ?? null)
    : (room.people.find((p) => voice.speakingPeers.has(p.id))?.name ?? null);

  return (
    <div className="flex flex-col bg-black" style={{ height: "100dvh" }}>
      {/* ── Header ── */}
      <div
        className="shrink-0 flex items-center gap-3 px-4 border-b border-white/10 bg-black"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 10px)", paddingBottom: "10px" }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <div
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: room.color }}
            />
            <span className="text-white/30 text-[10px] truncate">
              {t("room.by")} {room.hostName}
            </span>
            {room.mode && ROOM_MODES_MAP[room.mode] && (
              <span className="text-white/25 text-[10px]">
                {ROOM_MODES_MAP[room.mode].emoji}{" "}
                {locale === "ru"
                  ? ROOM_MODES_MAP[room.mode].labelRu
                  : ROOM_MODES_MAP[room.mode].label}
              </span>
            )}
          </div>
          <p className="text-white text-sm font-semibold truncate leading-tight">{room.topic}</p>
        </div>

        {/* Game button — visible to everyone */}
        {!party.gameState && !soloGame && (
          <div className="relative shrink-0">
            <button
              onClick={() => setShowGameMenu((v) => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-purple-500/20 bg-purple-500/10 active:bg-purple-500/20 transition-colors"
              style={{ touchAction: "manipulation" }}
              title={t("game.start")}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-purple-400"
              >
                <line x1="6" y1="11" x2="10" y2="11" />
                <line x1="8" y1="9" x2="8" y2="13" />
                <line x1="15" y1="12" x2="15.01" y2="12" />
                <line x1="18" y1="10" x2="18.01" y2="10" />
                <path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z" />
              </svg>
              <span className="text-purple-400 text-[10px] font-semibold">{t("game.play")}</span>
            </button>

            {/* Game picker dropdown */}
            {showGameMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowGameMenu(false)} />
                <div
                  className="absolute right-0 top-full mt-2 z-50 w-52 rounded-xl animate-in overflow-hidden"
                  style={{
                    background: "rgba(28,28,30,0.97)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                  }}
                >
                  {/* Group games — host only */}
                  {isHost && room.people.length >= 2 && (
                    <>
                      <div className="px-3.5 pt-2.5 pb-1">
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-white/25">
                          {t("game.groupGames")}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setShowGameMenu(false);
                          party.startGame("marble-race");
                        }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 active:bg-white/5 transition-colors"
                        style={{ touchAction: "manipulation" }}
                      >
                        <span className="text-base">🏁</span>
                        <div className="flex-1 text-left">
                          <p className="text-white/80 text-xs font-medium">
                            {t("game.marbleRace")}
                          </p>
                          <p className="text-white/30 text-[10px]">{t("game.marbleRaceDesc")}</p>
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          setShowGameMenu(false);
                          party.startGame("tic-tac-toe");
                        }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 active:bg-white/5 transition-colors"
                        style={{ touchAction: "manipulation" }}
                      >
                        <span className="text-base">#</span>
                        <div className="flex-1 text-left">
                          <p className="text-white/80 text-xs font-medium">{t("game.ticTacToe")}</p>
                          <p className="text-white/30 text-[10px]">{t("game.ticTacToeDesc")}</p>
                        </div>
                      </button>
                      <div className="mx-3 my-1 border-t border-white/5" />
                    </>
                  )}

                  {/* Solo games — everyone */}
                  <div className="px-3.5 pt-2 pb-1">
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-white/25">
                      {t("game.soloGames")}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setShowGameMenu(false);
                      setSoloGame("emoji-match");
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 active:bg-white/5 transition-colors"
                    style={{ touchAction: "manipulation" }}
                  >
                    <span className="text-base">🧠</span>
                    <div className="flex-1 text-left">
                      <p className="text-white/80 text-xs font-medium">{t("game.emojiMatch")}</p>
                      <p className="text-white/30 text-[10px]">{t("game.emojiMatchDesc")}</p>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setShowGameMenu(false);
                      setSoloGame("paddle-ball");
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 active:bg-white/5 transition-colors"
                    style={{ touchAction: "manipulation" }}
                  >
                    <span className="text-base">🏓</span>
                    <div className="flex-1 text-left">
                      <p className="text-white/80 text-xs font-medium">{t("game.paddleBall")}</p>
                      <p className="text-white/30 text-[10px]">{t("game.paddleBallDesc")}</p>
                    </div>
                  </button>
                  <div className="h-1" />
                </div>
              </>
            )}
          </div>
        )}

        <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/12 bg-white/5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-white/50 text-[11px] font-mono tabular-nums">
            {room.people.length}/{room.maxPeople}
          </span>
        </div>
      </div>

      {/* ── Marble participants ── */}
      <div className="flex-1 relative">
        <MarbleParticipants
          people={room.people}
          myId={party.myId}
          isSpeaking={voice.isSpeaking}
          speakingPeers={voice.speakingPeers}
          muted={voice.muted}
          onSelect={isHost ? (id) => setSelectedPeer(id === selectedPeer ? null : id) : undefined}
          selectedId={selectedPeer}
          youLabel={t("room.you")}
        />

        {/* Ice breaker flashcard */}
        {room.iceBreakers && room.iceBreakers.length > 0 ? (
          <IceBreakerCard
            questions={room.iceBreakers}
            currentIndex={room.currentQuestion ?? 0}
            isHost={isHost}
            onNext={() => party.nextQuestion()}
            t={t}
          />
        ) : (
          <div className="absolute top-3 left-3 right-3 z-20">
            <div
              className="rounded-2xl p-[1px] animate-in ice-breaker-glow"
              style={{
                background:
                  "linear-gradient(135deg, rgba(168,85,247,0.5), rgba(59,130,246,0.3), rgba(168,85,247,0.5))",
                backgroundSize: "200% 200%",
              }}
            >
              <div
                className="rounded-2xl px-4 py-3"
                style={{
                  background: "rgba(16,16,20,0.92)",
                }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded-md shrink-0"
                    style={{
                      background: "rgba(168,85,247,0.2)",
                      border: "1px solid rgba(168,85,247,0.3)",
                    }}
                  >
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="rgb(168,85,247)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" />
                    </svg>
                    <span className="text-[9px] font-semibold" style={{ color: "rgb(168,85,247)" }}>
                      AI
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
                    <span className="text-white/40 text-[12px]">{t("ai.iceLoading")}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mic warning */}
        {!voice.micActive && (
          <p className="absolute top-3 left-0 right-0 text-amber-400 text-xs text-center flex items-center justify-center gap-1 pointer-events-none">
            <MicOffIcon size={11} />
            {t("room.micWarning")}
          </p>
        )}

        {/* Toast */}
        {toast && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 px-4 py-2 bg-red-500/90 text-white text-xs font-medium rounded-full">
            {toast}
          </div>
        )}

        {/* Host admin actions */}
        {isHost &&
          selectedPeer &&
          (() => {
            const peer = room.people.find((p) => p.id === selectedPeer);
            if (!peer) return null;
            return (
              <div
                className="absolute left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-3 py-2 rounded-2xl animate-in"
                style={{
                  bottom: "calc(env(safe-area-inset-bottom) + 130px)",
                  background: "rgba(28,28,30,0.95)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
                }}
              >
                <span className="text-white/60 text-xs font-medium px-1">{peer.name}</span>
                <button
                  onClick={() => {
                    party.mutePeer(selectedPeer);
                    setToast(`${peer.name} ${t("room.peerMuted")}`);
                    setSelectedPeer(null);
                  }}
                  style={{ touchAction: "manipulation" }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 text-white/70 text-xs font-medium active:bg-white/20 transition-colors"
                >
                  <MicOffIcon size={12} />
                  {t("room.muteAction")}
                </button>
                <button
                  onClick={() => {
                    party.kickPeer(selectedPeer);
                    setToast(`${peer.name} ${t("room.peerKicked")}`);
                    setSelectedPeer(null);
                  }}
                  style={{ touchAction: "manipulation" }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/20 text-red-400 text-xs font-medium active:bg-red-500/30 transition-colors"
                >
                  {t("room.kickAction")}
                </button>
                <button
                  onClick={() => setSelectedPeer(null)}
                  style={{ touchAction: "manipulation" }}
                  className="px-2 py-2 text-white/30 active:text-white/60"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            );
          })()}
      </div>

      {/* ── Controls ── iOS liquid pill ── */}
      <div
        className="absolute bottom-0 left-0 right-0 flex flex-col items-center gap-3 z-30 pointer-events-none"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)", paddingTop: "12px" }}
      >
        {/* Pill container */}
        <div
          className="flex items-center gap-1.5 px-2 pointer-events-auto"
          style={{
            height: 68,
            borderRadius: 22,
            background: "rgba(28,28,30,0.85)",
            border: "1px solid rgba(255,255,255,0.10)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
          }}
        >
          {/* Mic button */}
          <button
            onClick={voice.toggleMute}
            className="relative flex items-center justify-center transition-all duration-200"
            style={{
              touchAction: "manipulation",
              width: 56,
              height: 56,
              borderRadius: 18,
              ...(voice.muted
                ? { background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)" }
                : {
                    background: "rgba(34,197,94,0.18)",
                    color: GREEN,
                    boxShadow: `0 0 16px ${GREEN}40`,
                  }),
            }}
          >
            {!voice.muted && (
              <div
                className="absolute inset-0 animate-ping opacity-15"
                style={{
                  borderRadius: 18,
                  width: 56,
                  height: 56,
                  backgroundColor: GREEN,
                  animationDuration: "2.5s",
                }}
              />
            )}
            <span className="relative z-10">
              {voice.muted ? <MicOffIcon size={22} /> : <MicIcon size={22} />}
            </span>
          </button>

          {/* Speaking indicator in the middle */}
          <div className="flex flex-col items-center justify-center" style={{ width: 72, gap: 4 }}>
            {activeSpeaker ? (
              <>
                <SoundWave
                  color={marbleColor(room.people.find((p) => p.name === activeSpeaker)?.id ?? "")}
                />
                <span
                  className="text-white font-semibold truncate"
                  style={{ fontSize: 10, maxWidth: 68 }}
                >
                  {activeSpeaker}
                </span>
              </>
            ) : (
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>
                {t("room.quiet")}
              </span>
            )}
          </div>

          {/* Minimize button */}
          {onMinimize && (
            <button
              onClick={onMinimize}
              className="flex items-center justify-center transition-all duration-200 active:scale-95"
              style={{
                touchAction: "manipulation",
                width: 56,
                height: 56,
                borderRadius: 18,
                background: "rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.5)",
              }}
              title={t("room.minimize")}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="4 14 10 14 10 20" />
                <polyline points="20 10 14 10 14 4" />
                <line x1="14" y1="10" x2="21" y2="3" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            </button>
          )}

          {/* Leave button — red rounded rect like iOS */}
          <button
            onClick={() => {
              voice.stop();
              party.leaveRoom();
            }}
            className="flex items-center justify-center transition-all duration-200"
            style={{
              touchAction: "manipulation",
              width: 56,
              height: 56,
              borderRadius: 18,
              background: "linear-gradient(160deg, #ff4b4b 0%, #d93025 100%)",
              color: "#fff",
              boxShadow: "0 4px 16px rgba(239,68,68,0.45), inset 0 1px 0 rgba(255,255,255,0.2)",
            }}
          >
            <PhoneDeclineIcon size={22} />
          </button>
        </div>
      </div>

      {/* Marble Race game overlay */}
      {party.gameState && party.gameState.game === "marble-race" && (
        <MarbleRace
          players={party.gameState.players}
          finishOrder={party.gameState.finishOrder}
          seed={party.gameState.seed}
          myId={party.myId}
          onClose={party.clearGame}
        />
      )}

      {/* Tic Tac Toe game overlay */}
      {party.gameState && party.gameState.game === "tic-tac-toe" && (
        <TicTacToe
          playerX={party.gameState.playerX}
          playerO={party.gameState.playerO}
          board={party.gameState.board}
          turn={party.gameState.turn}
          winner={party.gameState.winner}
          myId={party.myId}
          onMove={party.sendGameMove}
          onClose={party.clearGame}
        />
      )}

      {/* Solo: Emoji Match */}
      {soloGame === "emoji-match" && <EmojiMatch onClose={() => setSoloGame(null)} />}

      {/* Solo: Paddle Ball */}
      {soloGame === "paddle-ball" && <PaddleBall onClose={() => setSoloGame(null)} />}
    </div>
  );
}
