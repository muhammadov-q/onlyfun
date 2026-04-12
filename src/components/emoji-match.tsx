"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ─── Emoji pool ───────────────────────────────────────────────────────────────
const EMOJIS = [
  "🎸",
  "🚀",
  "🌮",
  "🎲",
  "🦊",
  "🍕",
  "🎯",
  "🌈",
  "🔥",
  "💎",
  "🎵",
  "🐙",
  "🍩",
  "⚡",
  "🦄",
  "🎪",
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateBoard(): string[] {
  const picked = shuffle(EMOJIS).slice(0, 8);
  return shuffle([...picked, ...picked]);
}

// ─── Component ────────────────────────────────────────────────────────────────
export function EmojiMatch({ onClose }: { onClose: () => void }) {
  const [cards, setCards] = useState<string[]>(() => generateBoard());
  const [flipped, setFlipped] = useState<Set<number>>(new Set());
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [picking, setPicking] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [startTime] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [won, setWon] = useState(false);
  const lockRef = useRef(false);

  // Timer
  useEffect(() => {
    if (won) return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 100);
    return () => clearInterval(id);
  }, [startTime, won]);

  // Check win
  useEffect(() => {
    if (matched.size === cards.length && cards.length > 0) {
      setWon(true);
    }
  }, [matched, cards.length]);

  const handleFlip = useCallback(
    (idx: number) => {
      if (lockRef.current || flipped.has(idx) || matched.has(idx)) return;
      if (picking.length >= 2) return;

      const newPicking = [...picking, idx];
      setFlipped((prev) => new Set([...prev, idx]));
      setPicking(newPicking);

      if (newPicking.length === 2) {
        setMoves((m) => m + 1);
        const [a, b] = newPicking;
        if (cards[a] === cards[b]) {
          // Match found
          setMatched((prev) => new Set([...prev, a, b]));
          setPicking([]);
        } else {
          // No match — flip back after delay
          lockRef.current = true;
          setTimeout(() => {
            setFlipped((prev) => {
              const next = new Set(prev);
              next.delete(a);
              next.delete(b);
              return next;
            });
            setPicking([]);
            lockRef.current = false;
          }, 600);
        }
      }
    },
    [picking, flipped, matched, cards]
  );

  const handleReplay = useCallback(() => {
    setCards(generateBoard());
    setFlipped(new Set());
    setMatched(new Set());
    setPicking([]);
    setMoves(0);
    setWon(false);
    lockRef.current = false;
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="relative flex flex-col items-center gap-3 sm:gap-4 p-4 sm:p-5 animate-in"
        style={{ maxWidth: 320, width: "calc(100% - 16px)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <span className="text-lg">🧠</span>
            <h2 className="text-white text-lg font-bold tracking-tight">Emoji Match</h2>
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

        {/* Stats bar */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 w-full flex-wrap">
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <span className="text-white/30 text-[10px]">Moves</span>
            <span className="text-white/70 text-xs font-bold tabular-nums">{moves}</span>
          </div>
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <span className="text-white/30 text-[10px]">Time</span>
            <span className="text-white/70 text-xs font-bold tabular-nums">
              {formatTime(elapsed)}
            </span>
          </div>
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <span className="text-white/30 text-[10px]">Pairs</span>
            <span className="text-white/70 text-xs font-bold tabular-nums">
              {matched.size / 2}/8
            </span>
          </div>
        </div>

        {/* Board */}
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2 w-full" style={{ maxWidth: 280 }}>
          {cards.map((emoji, i) => {
            const isFlipped = flipped.has(i) || matched.has(i);
            const isMatched = matched.has(i);

            return (
              <button
                key={i}
                onClick={() => handleFlip(i)}
                className="relative flex items-center justify-center transition-all duration-200 aspect-square"
                style={{
                  borderRadius: 12,
                  perspective: "600px",
                  cursor: isMatched ? "default" : "pointer",
                  touchAction: "manipulation",
                }}
              >
                <div
                  className="absolute inset-0 flex items-center justify-center rounded-[12px] transition-all duration-300"
                  style={{
                    backfaceVisibility: "hidden",
                    background: isMatched
                      ? "rgba(34,197,94,0.12)"
                      : isFlipped
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(255,255,255,0.04)",
                    border: isMatched
                      ? "2px solid rgba(34,197,94,0.3)"
                      : isFlipped
                        ? "2px solid rgba(255,255,255,0.15)"
                        : "2px solid rgba(255,255,255,0.06)",
                    opacity: isMatched ? 0.6 : 1,
                  }}
                >
                  {isFlipped ? (
                    <span className="text-xl sm:text-2xl select-none">{emoji}</span>
                  ) : (
                    <span
                      className="text-base sm:text-lg select-none"
                      style={{ color: "rgba(255,255,255,0.1)" }}
                    >
                      ?
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Win overlay */}
        {won && (
          <div className="flex flex-col items-center gap-3 animate-in">
            <div
              className="flex items-center gap-2 px-5 py-2.5 rounded-full"
              style={{
                background: "rgba(34,197,94,0.12)",
                border: "1px solid rgba(34,197,94,0.25)",
              }}
            >
              <span className="text-base">🎉</span>
              <span className="text-sm font-bold text-emerald-400">
                {moves} moves in {formatTime(elapsed)}
              </span>
            </div>
            <button
              onClick={handleReplay}
              className="px-5 py-2 rounded-xl text-xs font-medium text-white/70 bg-white/5 border border-white/10 active:bg-white/10 transition-colors"
            >
              Play again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
