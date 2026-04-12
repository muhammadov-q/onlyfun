"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ─── Colors (same as inside-pixel.tsx) ────────────────────────────────────────
const MARBLE_COLORS = [
  "#a855f7",
  "#3b82f6",
  "#ec4899",
  "#f97316",
  "#22c55e",
  "#06b6d4",
  "#eab308",
  "#ef4444",
  "#8b5cf6",
  "#14b8a6",
];

function marbleColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return MARBLE_COLORS[hash % MARBLE_COLORS.length];
}

// ─── Seeded random ────────────────────────────────────────────────────────────
function mulberry32(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Types ────────────────────────────────────────────────────────────────────
type Player = { id: string; name: string };

type Peg = { x: number; y: number };

type MarbleState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  finished: boolean;
  finishTime: number;
};

// ─── Constants ────────────────────────────────────────────────────────────────
const TRACK_W = 300;
const TRACK_H = 500;
const MARBLE_R = 10;
const PEG_R = 6;
const GRAVITY = 0.15;
const BOUNCE = 0.55;
const FRICTION = 0.995;
const PEG_ROWS = 9;
const PEGS_PER_ROW = 6;

function generatePegs(seed: number): Peg[] {
  const rng = mulberry32(seed);
  const pegs: Peg[] = [];
  const rowSpacing = (TRACK_H - 80) / (PEG_ROWS + 1);

  for (let row = 0; row < PEG_ROWS; row++) {
    const y = 60 + rowSpacing * (row + 1);
    const offset = row % 2 === 0 ? 0 : TRACK_W / PEGS_PER_ROW / 2;
    for (let col = 0; col < PEGS_PER_ROW; col++) {
      const baseX = (TRACK_W / PEGS_PER_ROW) * (col + 0.5) + offset;
      const jitterX = (rng() - 0.5) * 14;
      const jitterY = (rng() - 0.5) * 8;
      const x = Math.max(PEG_R + 2, Math.min(TRACK_W - PEG_R - 2, baseX + jitterX));
      pegs.push({ x, y: y + jitterY });
    }
  }
  return pegs;
}

function generateStartPositions(players: Player[], seed: number): number[] {
  const rng = mulberry32(seed + 999);
  const spacing = TRACK_W / (players.length + 1);
  return players.map((_, i) => {
    const base = spacing * (i + 1);
    return base + (rng() - 0.5) * spacing * 0.4;
  });
}

// ─── Component ────────────────────────────────────────────────────────────────
export function MarbleRace({
  players,
  finishOrder,
  seed,
  myId,
  onClose,
}: {
  players: Player[];
  finishOrder: string[];
  seed: number;
  myId: string | null;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<"countdown" | "racing" | "results">("countdown");
  const [countdown, setCountdown] = useState(3);
  const [results, setResults] = useState<Player[]>([]);
  const rafRef = useRef(0);
  const stateRef = useRef<MarbleState[]>([]);
  const pegsRef = useRef<Peg[]>([]);
  const startXRef = useRef<number[]>([]);
  const finishedRef = useRef(0);

  // Countdown
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) {
      setPhase("racing");
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  // Init pegs & marbles
  useEffect(() => {
    pegsRef.current = generatePegs(seed);
    startXRef.current = generateStartPositions(players, seed);
    stateRef.current = players.map((_, i) => ({
      x: startXRef.current[i],
      y: 20,
      vx: 0,
      vy: 0,
      finished: false,
      finishTime: 0,
    }));
    finishedRef.current = 0;
  }, [players, seed]);

  // Race simulation
  useEffect(() => {
    if (phase !== "racing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = TRACK_W * dpr;
    canvas.height = TRACK_H * dpr;
    ctx.scale(dpr, dpr);

    const pegs = pegsRef.current;
    const marbles = stateRef.current;
    const rng = mulberry32(seed + 42);

    // Assign target speeds based on finish order — winner gets slightly higher avg speed
    const speedFactors = players.map((p) => {
      const rank = finishOrder.indexOf(p.id);
      // rank 0 = fastest, higher rank = slower
      return 1.0 + (players.length - 1 - rank) * 0.08;
    });

    let frame = 0;
    const finishLine = TRACK_H - 30;

    function tick() {
      frame++;
      ctx!.clearRect(0, 0, TRACK_W, TRACK_H);

      // Draw track background
      ctx!.fillStyle = "rgba(255,255,255,0.03)";
      ctx!.fillRect(0, 0, TRACK_W, TRACK_H);

      // Draw walls
      ctx!.strokeStyle = "rgba(255,255,255,0.1)";
      ctx!.lineWidth = 2;
      ctx!.strokeRect(1, 1, TRACK_W - 2, TRACK_H - 2);

      // Draw finish line
      ctx!.save();
      ctx!.setLineDash([6, 4]);
      ctx!.strokeStyle = "rgba(255,255,255,0.25)";
      ctx!.lineWidth = 2;
      ctx!.beginPath();
      ctx!.moveTo(0, finishLine);
      ctx!.lineTo(TRACK_W, finishLine);
      ctx!.stroke();
      ctx!.restore();

      // Draw "FINISH" text
      ctx!.fillStyle = "rgba(255,255,255,0.15)";
      ctx!.font = "bold 10px system-ui, sans-serif";
      ctx!.textAlign = "center";
      ctx!.fillText("FINISH", TRACK_W / 2, finishLine + 14);

      // Draw pegs
      for (const peg of pegs) {
        ctx!.beginPath();
        ctx!.arc(peg.x, peg.y, PEG_R, 0, Math.PI * 2);
        ctx!.fillStyle = "rgba(255,255,255,0.12)";
        ctx!.fill();
        ctx!.strokeStyle = "rgba(255,255,255,0.06)";
        ctx!.lineWidth = 1;
        ctx!.stroke();
      }

      // Update & draw marbles
      let allDone = true;
      for (let i = 0; i < marbles.length; i++) {
        const m = marbles[i];
        if (m.finished) continue;
        allDone = false;

        // Apply gravity with speed factor
        m.vy += GRAVITY * speedFactors[i];
        // Random lateral nudge for variety
        m.vx += (rng() - 0.5) * 0.3;
        m.vx *= FRICTION;
        m.vy *= FRICTION;

        m.x += m.vx;
        m.y += m.vy;

        // Wall bounce
        if (m.x < MARBLE_R) {
          m.x = MARBLE_R;
          m.vx = Math.abs(m.vx) * BOUNCE;
        }
        if (m.x > TRACK_W - MARBLE_R) {
          m.x = TRACK_W - MARBLE_R;
          m.vx = -Math.abs(m.vx) * BOUNCE;
        }

        // Peg collision
        for (const peg of pegs) {
          const dx = m.x - peg.x;
          const dy = m.y - peg.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = MARBLE_R + PEG_R;
          if (dist < minDist && dist > 0) {
            const nx = dx / dist;
            const ny = dy / dist;
            m.x = peg.x + nx * minDist;
            m.y = peg.y + ny * minDist;
            const dot = m.vx * nx + m.vy * ny;
            m.vx -= 2 * dot * nx * BOUNCE;
            m.vy -= 2 * dot * ny * BOUNCE;
            // Extra lateral push for fun
            m.vx += (rng() - 0.5) * 1.5;
          }
        }

        // Marble-marble collision
        for (let j = i + 1; j < marbles.length; j++) {
          const o = marbles[j];
          if (o.finished) continue;
          const dx = m.x - o.x;
          const dy = m.y - o.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = MARBLE_R * 2;
          if (dist < minDist && dist > 0) {
            const nx = dx / dist;
            const ny = dy / dist;
            const overlap = (minDist - dist) / 2;
            m.x += nx * overlap;
            m.y += ny * overlap;
            o.x -= nx * overlap;
            o.y -= ny * overlap;
            const dvx = m.vx - o.vx;
            const dvy = m.vy - o.vy;
            const dot = dvx * nx + dvy * ny;
            m.vx -= dot * nx * 0.5;
            m.vy -= dot * ny * 0.5;
            o.vx += dot * nx * 0.5;
            o.vy += dot * ny * 0.5;
          }
        }

        // Check finish
        if (m.y >= finishLine) {
          m.finished = true;
          m.finishTime = frame;
          finishedRef.current++;
        }
      }

      // Draw marbles (back to front by y position for layering)
      const sortedIndices = marbles.map((_, i) => i).sort((a, b) => marbles[a].y - marbles[b].y);

      for (const i of sortedIndices) {
        const m = marbles[i];
        const color = marbleColor(players[i].id);

        // Glow for own marble
        if (players[i].id === myId) {
          ctx!.beginPath();
          ctx!.arc(m.x, m.y, MARBLE_R + 4, 0, Math.PI * 2);
          ctx!.fillStyle = color + "30";
          ctx!.fill();
        }

        // Marble body
        ctx!.beginPath();
        ctx!.arc(m.x, m.y, MARBLE_R, 0, Math.PI * 2);
        const grad = ctx!.createRadialGradient(m.x - 3, m.y - 3, 1, m.x, m.y, MARBLE_R);
        grad.addColorStop(0, color + "ff");
        grad.addColorStop(0.7, color + "cc");
        grad.addColorStop(1, color + "88");
        ctx!.fillStyle = grad;
        ctx!.fill();

        // Shine
        ctx!.beginPath();
        ctx!.arc(m.x - 3, m.y - 3, 3, 0, Math.PI * 2);
        ctx!.fillStyle = "rgba(255,255,255,0.35)";
        ctx!.fill();

        // Name label (small)
        ctx!.fillStyle = "rgba(255,255,255,0.7)";
        ctx!.font = "bold 8px system-ui, sans-serif";
        ctx!.textAlign = "center";
        const label = players[i].id === myId ? players[i].name + " (you)" : players[i].name;
        ctx!.fillText(label, m.x, m.y - MARBLE_R - 4);
      }

      if (allDone || finishedRef.current >= marbles.length) {
        // Build results from finish order (server-determined)
        const ordered = finishOrder.map((id) => players.find((p) => p.id === id)!).filter(Boolean);
        setResults(ordered);
        setPhase("results");
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase, players, finishOrder, seed, myId]);

  // Auto-close results after 8 seconds
  useEffect(() => {
    if (phase !== "results") return;
    const t = setTimeout(onClose, 8000);
    return () => clearTimeout(t);
  }, [phase, onClose]);

  const medals = ["1st", "2nd", "3rd"];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="relative flex flex-col items-center gap-3 sm:gap-4 p-3 sm:p-4 animate-in"
        style={{ maxWidth: 320, width: "calc(100% - 16px)" }}
      >
        {/* Title */}
        <div className="flex items-center gap-2">
          <span className="text-lg">🏁</span>
          <h2 className="text-white text-lg font-bold tracking-tight">Marble Race</h2>
        </div>

        {/* Countdown overlay */}
        {phase === "countdown" && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <span
              className="text-white font-black animate-bounce"
              style={{
                fontSize: countdown === 0 ? 48 : 72,
                textShadow: "0 4px 24px rgba(0,0,0,0.5)",
              }}
            >
              {countdown === 0 ? "GO!" : countdown}
            </span>
          </div>
        )}

        {/* Canvas */}
        <div
          className="relative overflow-hidden w-full"
          style={{
            maxWidth: TRACK_W,
            aspectRatio: `${TRACK_W} / ${TRACK_H}`,
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(16,16,20,0.95)",
          }}
        >
          <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />

          {/* Starting positions labels during countdown */}
          {phase === "countdown" && startXRef.current.length > 0 && (
            <>
              {players.map((p, i) => (
                <div
                  key={p.id}
                  className="absolute flex flex-col items-center"
                  style={{
                    left: `${(startXRef.current[i] / TRACK_W) * 100}%`,
                    top: "3%",
                    transform: "translateX(-50%)",
                  }}
                >
                  <div
                    className="w-5 h-5 rounded-full"
                    style={{
                      background: marbleColor(p.id),
                      boxShadow: `0 0 8px ${marbleColor(p.id)}60`,
                    }}
                  />
                  <span className="text-white/60 text-[8px] font-medium mt-0.5 whitespace-nowrap">
                    {p.name}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Results */}
        {phase === "results" && results.length > 0 && (
          <div
            className="w-full rounded-2xl p-3 animate-in"
            style={{
              background: "rgba(28,28,30,0.95)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-sm">🏆</span>
              <span className="text-white/80 text-xs font-semibold">Results</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {results.map((p, i) => {
                const isMe = p.id === myId;
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl"
                    style={{
                      background:
                        i === 0
                          ? "rgba(234,179,8,0.12)"
                          : isMe
                            ? "rgba(255,255,255,0.06)"
                            : "transparent",
                      border: i === 0 ? "1px solid rgba(234,179,8,0.2)" : "1px solid transparent",
                    }}
                  >
                    <span
                      className="text-xs font-bold tabular-nums"
                      style={{
                        width: 24,
                        color:
                          i === 0
                            ? "#eab308"
                            : i === 1
                              ? "#94a3b8"
                              : i === 2
                                ? "#b45309"
                                : "rgba(255,255,255,0.3)",
                      }}
                    >
                      {medals[i] ?? `${i + 1}th`}
                    </span>
                    <div
                      className="w-4 h-4 rounded-full shrink-0"
                      style={{ background: marbleColor(p.id) }}
                    />
                    <span
                      className={`text-xs font-medium flex-1 truncate ${isMe ? "text-white" : "text-white/60"}`}
                    >
                      {p.name} {isMe ? "(you)" : ""}
                    </span>
                    {i === 0 && <span className="text-sm">👑</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Close button */}
        {phase === "results" && (
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-xs font-medium text-white/60 bg-white/5 border border-white/10 active:bg-white/10 transition-colors"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
}
