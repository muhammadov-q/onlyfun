"use client";

import { useEffect, useState, useCallback, useRef } from "react";

type PodcastMessage = {
  id: number;
  name: string;
  message: string;
  censored: boolean;
  created_at: string;
};

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function avatarColor(name: string): string {
  const colors = [
    "#a855f7",
    "#3b82f6",
    "#ec4899",
    "#f97316",
    "#22c55e",
    "#06b6d4",
    "#eab308",
    "#ef4444",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return colors[hash % colors.length];
}

// ─── Shared message list + compose ────────────────────────────────────────────

function PodcastContent({ userName, t }: { userName: string; t: (key: string) => string }) {
  const [messages, setMessages] = useState<PodcastMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const listRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch("/api/podcast");
      const data = await res.json();
      setMessages(data.messages ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
    const id = setInterval(fetchMessages, 15000);
    return () => clearInterval(id);
  }, [fetchMessages]);

  const handlePost = useCallback(async () => {
    const msg = text.trim();
    if (!msg || posting) return;
    setPosting(true);
    setError(null);
    try {
      const res = await fetch("/api/podcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: userName, message: msg }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to post");
        return;
      }
      setText("");
      if (data.message) setMessages((prev) => [data.message, ...prev]);
      if (data.flagged) setError(t("podcast.flagged"));
      listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("Failed to post");
    } finally {
      setPosting(false);
    }
  }, [text, posting, userName]);

  return (
    <>
      {/* Compose */}
      <div className="px-3 pb-2.5 shrink-0">
        <div
          className="flex items-start gap-2 rounded-xl p-2.5"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white uppercase shrink-0 mt-0.5"
            style={{ background: avatarColor(userName) }}
          >
            {userName[0]}
          </div>
          <div className="flex-1 min-w-0">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 280))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handlePost();
                }
              }}
              placeholder={t("podcast.placeholder")}
              rows={2}
              className="w-full bg-transparent text-white text-xs resize-none outline-none placeholder-white/20"
              style={{ fontSize: 16 }}
            />
            <div className="flex items-center justify-between mt-1">
              <span className="text-white/15 text-[9px]">{text.length}/280</span>
              <button
                onClick={handlePost}
                disabled={!text.trim() || posting}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all disabled:opacity-30"
                style={{
                  background: text.trim() ? "rgba(234,179,8,0.15)" : "rgba(255,255,255,0.04)",
                  color: text.trim() ? "#eab308" : "rgba(255,255,255,0.25)",
                  border: `1px solid ${text.trim() ? "rgba(234,179,8,0.2)" : "rgba(255,255,255,0.05)"}`,
                }}
              >
                {posting ? (
                  <div className="w-3 h-3 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
                ) : (
                  <svg
                    width="10"
                    height="10"
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
                )}
                {t("podcast.send")}
              </button>
            </div>
          </div>
        </div>
        {error && <p className="text-red-400 text-[10px] mt-1 px-1">{error}</p>}
      </div>

      {/* Divider */}
      <div className="mx-3 border-t border-white/5" />

      {/* Messages */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-2.5" style={{ minHeight: 60 }}>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-1.5">
            <span className="text-xl">📝</span>
            <p className="text-white/20 text-[11px]">{t("podcast.empty")}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {messages.map((msg) => {
              const isCensored = !!msg.censored && !revealed.has(msg.id);
              return (
                <div key={msg.id} className="flex gap-2">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white uppercase shrink-0 mt-0.5"
                    style={{ background: avatarColor(msg.name) }}
                  >
                    {msg.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-white text-[11px] font-semibold">{msg.name}</span>
                      <span className="text-white/25 text-[9px]">{timeAgo(msg.created_at)}</span>
                    </div>
                    {isCensored ? (
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          setRevealed((prev) => new Set([...prev, msg.id]));
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") setRevealed((prev) => new Set([...prev, msg.id]));
                        }}
                        className="w-full mt-1 rounded-xl cursor-pointer select-none active:opacity-70 transition-opacity"
                        style={{
                          touchAction: "manipulation",
                          WebkitTapHighlightColor: "transparent",
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        <div className="flex flex-col items-center justify-center gap-0.5 py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="text-white/30"
                            >
                              <path d="M12 9v4M12 17h.01" />
                              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                            </svg>
                            <span className="text-white/40 text-[11px] font-medium">
                              {t("podcast.inappropriate")}
                            </span>
                          </div>
                          <span className="text-white/20 text-[10px]">
                            {t("podcast.showAnyway")}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-white text-xs mt-0.5 leading-relaxed break-words">
                        {msg.message}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Desktop: Side panel (like rooms panel) ───────────────────────────────────

export function PodcastPanel({
  userName,
  onClose,
  t,
}: {
  userName: string;
  onClose: () => void;
  t: (key: string) => string;
}) {
  return (
    <div
      className="absolute top-0 right-0 bottom-0 z-[420] flex flex-col animate-in"
      style={{
        width: 320,
        background: "rgba(10,10,12,0.95)",
        borderLeft: "1px solid rgba(255,255,255,0.08)",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 shrink-0 border-b border-white/5">
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
            className="text-amber-400"
          >
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          <div>
            <h3 className="text-white text-xs font-bold">{t("podcast.title")}</h3>
            <p className="text-white/25 text-[9px]">{t("podcast.subtitle")}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 rounded-full bg-white/5 text-white/30 flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          <svg
            width="10"
            height="10"
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

      <PodcastContent userName={userName} t={t} />
    </div>
  );
}

// ─── Mobile: Bottom sheet (80% height) ────────────────────────────────────────

export function PodcastSheet({
  userName,
  onClose,
  t,
}: {
  userName: string;
  onClose: () => void;
  t: (key: string) => string;
}) {
  return (
    <div
      className="fixed inset-0 z-[550]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="absolute bottom-0 left-0 right-0 flex flex-col animate-in overflow-hidden"
        style={{
          height: "80dvh",
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          background: "rgba(14,14,16,0.98)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderBottom: "none",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* Handle + header */}
        <div className="flex flex-col items-center pt-2 shrink-0">
          <div className="w-10 h-1 rounded-full bg-white/20 mb-2" />
        </div>
        <div className="flex items-center justify-between px-4 pb-2.5 shrink-0">
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
              className="text-amber-400"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            <div>
              <h3 className="text-white text-sm font-bold">{t("podcast.title")}</h3>
              <p className="text-white/25 text-[10px]">{t("podcast.subtitle")}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/5 text-white/40 flex items-center justify-center active:bg-white/10"
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

        <PodcastContent userName={userName} t={t} />
      </div>
    </div>
  );
}
