"use client";

import { useEffect, useRef, useState } from "react";
import type { PartyState } from "./use-party";
import { useVoice } from "./use-voice";
import { useI18n } from "@/i18n";

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

function SendIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="15 18 9 12 15 6" />
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

// ─── Person avatar with speaking rings ────────────────────────────────────────

// Returns avatar px sizes based on how many people are in the room
function avatarSize(total: number): { wrap: number; circle: number; text: number; badge: number } {
  if (total <= 2) return { wrap: 80, circle: 68, text: 12, badge: 20 };
  if (total <= 4) return { wrap: 68, circle: 56, text: 11, badge: 18 };
  if (total <= 6) return { wrap: 58, circle: 48, text: 10, badge: 16 };
  if (total <= 8) return { wrap: 50, circle: 40, text: 10, badge: 14 };
  return { wrap: 44, circle: 34, text: 9, badge: 13 };
}

function PersonAvatar({
  name,
  color,
  isSpeaking,
  isMe,
  isMuted,
  isConnected,
  total,
}: {
  name: string;
  color: string;
  isSpeaking: boolean;
  isMe: boolean;
  isMuted: boolean;
  isConnected: boolean;
  total: number;
}) {
  const sz = avatarSize(total);
  const fontSize = total <= 4 ? "1.2rem" : total <= 6 ? "1rem" : "0.8rem";

  return (
    <div className="flex flex-col items-center gap-1.5" style={{ width: sz.wrap }}>
      <div
        className="relative flex items-center justify-center"
        style={{ width: sz.circle, height: sz.circle }}
      >
        {/* Radiating speak rings */}
        {isSpeaking && (
          <>
            <div className="speak-ring" style={{ backgroundColor: color + "55" }} />
            <div className="speak-ring speak-ring-2" style={{ backgroundColor: color + "38" }} />
            <div className="speak-ring speak-ring-3" style={{ backgroundColor: color + "20" }} />
          </>
        )}

        {/* Avatar circle */}
        <div
          className="relative z-10 rounded-full flex items-center justify-center font-bold transition-all duration-300"
          style={{
            width: sz.circle,
            height: sz.circle,
            fontSize,
            backgroundColor: color + "18",
            border: `2px solid ${isSpeaking ? color : isConnected ? color + "55" : "rgba(255,255,255,0.1)"}`,
            color,
            boxShadow: isSpeaking ? `0 0 14px ${color}55, 0 0 30px ${color}20` : "none",
          }}
        >
          {name[0].toUpperCase()}
        </div>

        {/* Muted badge */}
        {isMuted && (
          <div
            className="absolute -bottom-0.5 -right-0.5 z-20 rounded-full bg-white border-2 border-black flex items-center justify-center text-black"
            style={{ width: sz.badge, height: sz.badge }}
          >
            <MicOffIcon size={sz.badge - 7} />
          </div>
        )}

        {/* Live dot */}
        {!isMe && isConnected && !isMuted && (
          <div
            className="absolute -bottom-0.5 -right-0.5 z-20 rounded-full border-2 border-black"
            style={{ width: sz.badge - 4, height: sz.badge - 4, backgroundColor: color }}
          />
        )}
      </div>

      <p
        className="font-medium text-center leading-tight w-full text-white/55 truncate"
        style={{ fontSize: sz.text }}
      >
        {name}
        {isMe && (
          <span className="block text-white/25" style={{ fontSize: sz.text - 2 }}>
            you
          </span>
        )}
      </p>
    </div>
  );
}

// ─── InsideRoom ───────────────────────────────────────────────────────────────

const GREEN = "#22c55e";
const RED = "#ef4444";

export function InsideRoom({ party }: { party: PartyState }) {
  const room = party.currentRoom!;
  const voice = useVoice(party);
  const [chatInput, setChatInput] = useState("");
  const [iceBreaker, setIceBreaker] = useState<string | null>(null);
  const [iceLoading, setIceLoading] = useState(false);
  const iceFetched = useRef(false);
  const chatEnd = useRef<HTMLDivElement>(null);
  const { t, locale } = useI18n();

  useEffect(() => {
    voice.start();
    return () => voice.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (iceFetched.current) return;
    iceFetched.current = true;
    setIceLoading(true);
    fetch("/api/ai/ice-breaker", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: room.topic, lang: locale }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.question) setIceBreaker(d.question);
      })
      .catch(() => {})
      .finally(() => setIceLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [party.chatMessages]);

  const onChat = (e: React.FormEvent) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (text) {
      party.sendChat(text);
      setChatInput("");
    }
  };

  const myPerson = room.people.find((p) => p.id === party.myId);
  const activeSpeaker: string | null = voice.isSpeaking
    ? (myPerson?.name ?? null)
    : (room.people.find((p) => voice.speakingPeers.has(p.id))?.name ?? null);

  return (
    <div className="flex flex-col bg-black" style={{ height: "100dvh" }}>
      {/* ── Header ── safe-area top keeps it clear of notch / Dynamic Island */}
      <div
        className="shrink-0 flex items-center gap-3 px-4 border-b border-white/10 bg-black"
        style={{
          paddingTop: "calc(env(safe-area-inset-top) + 10px)",
          paddingBottom: "10px",
        }}
      >
        <button
          style={{ touchAction: "manipulation" }}
          onClick={() => {
            voice.stop();
            party.leaveRoom();
          }}
          className="flex items-center justify-center w-9 h-9 rounded-full bg-white/8 border border-white/12 text-white/60 active:bg-white/15 transition-colors shrink-0"
        >
          <ChevronLeftIcon />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <div
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: room.color }}
            />
            <span className="text-white/30 text-[10px] truncate">
              {t("room.by")} {room.hostName}
            </span>
          </div>
          <p className="text-white text-sm font-semibold truncate leading-tight">{room.topic}</p>
        </div>

        <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/12 bg-white/5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-white/50 text-[11px] font-mono tabular-nums">
            {room.people.length}/{room.maxPeople}
          </span>
        </div>
      </div>

      {/* ── Participants ─────────────────────────────────────────────────────── */}
      <div className="shrink-0 px-4 pt-5 pb-3">
        {(() => {
          const n = room.people.length;
          // Columns: 1→1, 2→2, 3→3, 4→4, 5→5, 6→3, 7→4, 8→4, 9→5, 10→5
          const cols = n <= 5 ? n : n <= 6 ? 3 : n <= 8 ? 4 : 5;
          return (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                gap: n >= 7 ? "10px 6px" : "12px 8px",
                justifyItems: "center",
              }}
            >
              {room.people.map((p) => {
                const isMe = p.id === party.myId;
                return (
                  <PersonAvatar
                    key={p.id}
                    name={p.name}
                    color={room.color}
                    isSpeaking={isMe ? voice.isSpeaking : voice.speakingPeers.has(p.id)}
                    isMe={isMe}
                    isMuted={isMe && voice.muted}
                    isConnected={isMe || voice.connectedPeers.has(p.id)}
                    total={n}
                  />
                );
              })}
            </div>
          );
        })()}

        {/* Speaking indicator */}
        <div className="flex justify-center mt-4" style={{ minHeight: 30 }}>
          {activeSpeaker ? (
            <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/8 border border-white/15 animate-in">
              <SoundWave color={room.color} />
              <span className="text-white text-xs font-semibold">{activeSpeaker}</span>
            </div>
          ) : (
            <span className="text-white/20 text-[11px]">— quiet —</span>
          )}
        </div>

        {!voice.micActive && (
          <p className="text-amber-400 text-xs text-center mt-2 flex items-center justify-center gap-1">
            <MicOffIcon size={11} />
            {t("room.micWarning")}
          </p>
        )}
      </div>

      {/* ── Chat messages — Telegram style ───────────────────────────────────── */}
      <div
        className="flex-1 min-h-0 overflow-y-auto py-3 px-2"
        style={{ scrollbarWidth: "none", background: "#111" }}
      >
        {party.chatMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full px-4 gap-3">
            {iceLoading ? (
              <p className="text-white/20 text-xs animate-pulse">{t("ai.iceLoading")}</p>
            ) : iceBreaker ? (
              <div
                className="rounded-2xl px-4 py-3 text-center"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                <p className="text-[10px] font-semibold mb-1.5 uppercase tracking-widest text-white/30">
                  {t("ai.iceBreaker")}
                </p>
                <p className="text-white/60 text-sm leading-snug italic">{iceBreaker}</p>
              </div>
            ) : (
              <p className="text-white/20 text-xs">{t("room.iceBreaker")}</p>
            )}
          </div>
        )}

        <div className="space-y-1">
          {party.chatMessages.map((msg, i) => {
            const isMe = msg.from === party.myId;
            // Show sender avatar/name only when sender changes
            const prevMsg = party.chatMessages[i - 1];
            const showSender = !isMe && msg.from !== prevMsg?.from;
            const initial = msg.name?.[0]?.toUpperCase() ?? "?";

            return (
              <div
                key={i}
                className={`flex items-end gap-2 px-2 ${isMe ? "justify-end" : "justify-start"}`}
                style={{ marginTop: showSender && !isMe ? 10 : undefined }}
              >
                {/* Left avatar — only for others, only when sender changes */}
                {!isMe && (
                  <div className="shrink-0 w-7 h-7 mb-0.5">
                    {showSender && (
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold"
                        style={{ backgroundColor: room.color + "30", color: room.color }}
                      >
                        {initial}
                      </div>
                    )}
                  </div>
                )}

                {/* Bubble */}
                <div className={`max-w-[72%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                  {showSender && (
                    <span
                      className="text-[11px] font-semibold px-1 mb-0.5"
                      style={{ color: room.color }}
                    >
                      {msg.name}
                    </span>
                  )}
                  <div
                    className={`px-3.5 py-2 text-sm leading-snug ${
                      isMe
                        ? "rounded-2xl rounded-br-[4px] text-white"
                        : "rounded-2xl rounded-bl-[4px] text-white/90"
                    }`}
                    style={{
                      background: isMe ? "#2a2a2a" : "#1e1e1e",
                    }}
                  >
                    {msg.text}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div ref={chatEnd} />
      </div>

      {/* ── Bottom bar: single input pill with mic/send toggle ───────────────── */}
      <div
        className="shrink-0 px-4 border-t border-white/8"
        style={{
          paddingTop: "10px",
          paddingBottom: "calc(env(safe-area-inset-bottom) + 20px)",
        }}
      >
        <form
          onSubmit={onChat}
          className="flex items-center gap-2 rounded-full border border-white/12 px-4"
          style={{ background: "rgba(255,255,255,0.06)", height: 52 }}
        >
          <input
            className="flex-1 bg-transparent text-white placeholder-white/25 focus:outline-none min-w-0"
            placeholder={t("room.inputPlaceholder")}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            maxLength={200}
            style={{ fontSize: "16px" }}
          />

          {/* Right button: send when typing, mic toggle when idle */}
          {chatInput.trim() ? (
            <button
              type="submit"
              style={{ touchAction: "manipulation" }}
              className="shrink-0 w-9 h-9 rounded-full bg-white text-black flex items-center justify-center"
            >
              <SendIcon />
            </button>
          ) : (
            <button
              type="button"
              onClick={voice.toggleMute}
              className="relative shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200"
              style={{
                touchAction: "manipulation",
                ...(voice.muted
                  ? { background: "rgba(239,68,68,0.2)", color: RED }
                  : { background: "rgba(34,197,94,0.2)", color: GREEN }),
              }}
            >
              {!voice.muted && (
                <div
                  className="absolute inset-0 rounded-full animate-ping opacity-20"
                  style={{ backgroundColor: GREEN, animationDuration: "2.5s" }}
                />
              )}
              <span className="relative z-10">
                {voice.muted ? <MicOffIcon size={18} /> : <MicIcon size={18} />}
              </span>
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
