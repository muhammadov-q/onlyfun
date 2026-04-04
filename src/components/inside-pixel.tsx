"use client";

import { useEffect, useRef, useState } from "react";
import type { PartyState } from "./use-party";
import { useVoice } from "./use-voice";
import { useI18n } from "@/i18n";

function MicIcon({ size = 16, className }: { size?: number; className?: string }) {
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
      className={className}
    >
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function MicOffIcon({ size = 16, className }: { size?: number; className?: string }) {
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
      className={className}
    >
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .41-.04.81-.1 1.2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function ArrowLeftIcon() {
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
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function SendIcon() {
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
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

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

  // Fetch AI ice breaker once when entering room
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

  return (
    <div className="h-screen flex flex-col bg-black">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0 bg-black">
        <button
          onClick={() => {
            voice.stop();
            party.leaveRoom();
          }}
          className="text-white/40 hover:text-white flex items-center gap-1.5 transition-colors text-sm"
        >
          <ArrowLeftIcon /> {t("room.leave")}
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={voice.toggleMute}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              voice.muted
                ? "bg-red-500/10 text-red-400 border border-red-500/20"
                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            }`}
          >
            {voice.muted ? (
              <>
                <MicOffIcon size={12} /> {t("room.muted")}
              </>
            ) : (
              <>
                <MicIcon size={12} /> {t("room.live")}
              </>
            )}
          </button>
          <span className="text-white/20 text-xs font-mono">
            {room.people.length}/{room.maxPeople}
          </span>
        </div>
      </div>

      {/* Topic section */}
      <div className="px-5 py-4 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: room.color }} />
          <span className="text-white/40 text-xs">
            {t("room.by")} {room.hostName}
          </span>
        </div>
        <h2 className="text-lg font-bold text-white leading-snug">{room.topic}</h2>
      </div>

      {/* People grid */}
      <div className="px-5 py-3 border-b border-white/10 shrink-0">
        <div className="flex flex-wrap gap-2">
          {room.people.map((p) => {
            const isMe = p.id === party.myId;
            const connected = voice.connectedPeers.has(p.id);
            const isMuted = isMe && voice.muted;
            const isLive = isMe ? !voice.muted : connected;

            return (
              <div
                key={p.id}
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-all ${
                  isLive
                    ? "bg-emerald-500/10 border border-emerald-500/20"
                    : "bg-white/5 border border-white/10"
                }`}
              >
                {isMuted ? (
                  <MicOffIcon size={12} className="text-red-400" />
                ) : isLive ? (
                  <MicIcon size={12} className="text-emerald-400" />
                ) : (
                  <MicOffIcon size={12} className="text-white/20" />
                )}
                <span
                  className={`text-sm ${
                    isMe ? "font-medium text-white" : isLive ? "text-emerald-400" : "text-white/40"
                  }`}
                >
                  {p.name}
                  {isMe ? ` ${t("room.you")}` : ""}
                </span>
              </div>
            );
          })}
        </div>
        {!voice.micActive && (
          <p className="text-amber-400 text-xs mt-2 flex items-center gap-1">
            <MicOffIcon size={10} className="text-amber-400" />
            {t("room.micWarning")}
          </p>
        )}
      </div>

      {/* Chat messages */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-0.5">
          {party.chatMessages.length === 0 && (
            <div className="text-center py-12">
              <p className="text-white/20 text-sm">{t("room.noMessages")}</p>
              {iceLoading ? (
                <p className="text-white/20 text-xs mt-2 animate-pulse">{t("ai.iceLoading")}</p>
              ) : iceBreaker ? (
                <div className="mt-3 mx-auto max-w-[280px] bg-violet-500/10 border border-violet-500/20 rounded-xl px-4 py-3">
                  <p className="text-[10px] text-violet-400 font-medium mb-1">
                    {t("ai.iceBreaker")}
                  </p>
                  <p className="text-violet-300 text-sm">{iceBreaker}</p>
                </div>
              ) : (
                <p className="text-white/20 text-xs mt-1">{t("room.iceBreaker")}</p>
              )}
            </div>
          )}
          {party.chatMessages.map((msg, i) => (
            <div key={i} className="text-sm py-0.5">
              <span
                className={`font-medium ${msg.from === party.myId ? "text-white" : "text-white/50"}`}
              >
                {msg.name}
              </span>
              <span className="text-white/40 ml-2">{msg.text}</span>
            </div>
          ))}
          <div ref={chatEnd} />
        </div>

        {/* Chat input */}
        <form
          onSubmit={onChat}
          className="px-4 py-3 border-t border-white/10 shrink-0"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <div className="flex gap-2">
            <input
              className="flex-1 bg-white/5 text-white text-sm px-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:border-white/25 focus:ring-2 focus:ring-white/5 placeholder-white/20 transition-all"
              placeholder={t("room.inputPlaceholder")}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              maxLength={200}
            />
            <button
              type="submit"
              disabled={!chatInput.trim()}
              className="px-3 py-3 rounded-xl bg-white text-black disabled:opacity-20 hover:bg-zinc-100 transition-all shrink-0"
            >
              <SendIcon />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
