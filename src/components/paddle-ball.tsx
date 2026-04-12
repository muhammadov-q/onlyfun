"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const PADDLE_H = 14;
const BALL_R = 10;
const INITIAL_SPEED = 3.5;
const SPEED_INCREMENT = 0.35;
const MAX_ANGLE_SPREAD = 0.35;

export function PaddleBall({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<"ready" | "playing" | "over">("ready");
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(() => {
    if (typeof window === "undefined") return 0;
    return parseInt(localStorage.getItem("onlyfun-paddle-best") || "0", 10);
  });

  // Responsive dimensions
  const sizeRef = useRef({ W: 300, H: 460, paddleW: 70, paddleY: 424 });
  const stateRef = useRef({
    ballX: 150,
    ballY: 150,
    ballVx: 0,
    ballVy: 0,
    paddleX: 115,
    speed: INITIAL_SPEED,
    score: 0,
    phase: "ready" as "ready" | "playing" | "over",
  });
  const rafRef = useRef(0);
  const pointerXRef = useRef(150);

  // Measure container and set game dimensions
  useEffect(() => {
    const measure = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const W = Math.min(300, vw - 40);
      const H = Math.min(460, vh - 180);
      const paddleW = Math.max(56, W * 0.23);
      const paddleY = H - 36;
      sizeRef.current = { W, H, paddleW, paddleY };
      pointerXRef.current = W / 2;
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const startGame = useCallback(() => {
    const { W, H } = sizeRef.current;
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
    stateRef.current = {
      ballX: W / 2,
      ballY: H / 3,
      ballVx: Math.cos(angle) * INITIAL_SPEED,
      ballVy: Math.sin(angle) * INITIAL_SPEED,
      paddleX: W / 2 - sizeRef.current.paddleW / 2,
      speed: INITIAL_SPEED,
      score: 0,
      phase: "playing",
    };
    setScore(0);
    setPhase("playing");
  }, []);

  // Pointer tracking on the ENTIRE overlay so finger doesn't lose contact
  useEffect(() => {
    const handleMove = (clientX: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const { W, paddleW } = sizeRef.current;
      const x = ((clientX - rect.left) / rect.width) * W;
      pointerXRef.current = Math.max(paddleW / 2, Math.min(W - paddleW / 2, x));
    };

    const onPointerMove = (e: PointerEvent) => handleMove(e.clientX);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        e.preventDefault();
        handleMove(e.touches[0].clientX);
      }
    };

    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function tick() {
      const { W, H, paddleW, paddleY } = sizeRef.current;
      const s = stateRef.current;

      // Resize canvas if needed
      const dpr = window.devicePixelRatio || 1;
      if (canvas!.width !== W * dpr || canvas!.height !== H * dpr) {
        canvas!.width = W * dpr;
        canvas!.height = H * dpr;
        canvas!.style.width = W + "px";
        canvas!.style.height = H + "px";
        ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      // Smooth paddle follow
      const targetX = pointerXRef.current - paddleW / 2;
      s.paddleX += (targetX - s.paddleX) * 0.25;
      s.paddleX = Math.max(0, Math.min(W - paddleW, s.paddleX));

      if (s.phase === "playing") {
        s.ballX += s.ballVx;
        s.ballY += s.ballVy;

        // Wall bounces
        if (s.ballX - BALL_R <= 0) {
          s.ballX = BALL_R;
          s.ballVx = Math.abs(s.ballVx);
        }
        if (s.ballX + BALL_R >= W) {
          s.ballX = W - BALL_R;
          s.ballVx = -Math.abs(s.ballVx);
        }
        if (s.ballY - BALL_R <= 0) {
          s.ballY = BALL_R;
          s.ballVy = Math.abs(s.ballVy);
        }

        // Paddle collision
        if (
          s.ballVy > 0 &&
          s.ballY + BALL_R >= paddleY &&
          s.ballY + BALL_R <= paddleY + PADDLE_H + s.speed &&
          s.ballX >= s.paddleX - BALL_R &&
          s.ballX <= s.paddleX + paddleW + BALL_R
        ) {
          s.ballY = paddleY - BALL_R;
          s.score++;
          s.speed += SPEED_INCREMENT;

          const hitPos = (s.ballX - s.paddleX) / paddleW;
          const baseAngle = -Math.PI / 2 + (hitPos - 0.5) * 1.2;
          const jitter = (Math.random() - 0.5) * MAX_ANGLE_SPREAD;
          const angle = baseAngle + jitter;

          s.ballVx = Math.cos(angle) * s.speed;
          s.ballVy = Math.sin(angle) * s.speed;
          if (s.ballVy > 0) s.ballVy = -s.ballVy;

          setScore(s.score);
        }

        // Miss
        if (s.ballY - BALL_R > H) {
          s.phase = "over";
          setPhase("over");
          setScore(s.score);
          const prev = parseInt(localStorage.getItem("onlyfun-paddle-best") || "0", 10);
          if (s.score > prev) {
            localStorage.setItem("onlyfun-paddle-best", String(s.score));
            setBestScore(s.score);
          }
        }
      }

      // ── Draw ──
      ctx!.clearRect(0, 0, W, H);
      ctx!.fillStyle = "rgba(16,16,20,1)";
      ctx!.fillRect(0, 0, W, H);

      // Border
      ctx!.strokeStyle = "rgba(255,255,255,0.06)";
      ctx!.lineWidth = 2;
      ctx!.strokeRect(1, 1, W - 2, H - 2);

      // Speed lines when fast
      if (s.phase === "playing" && s.speed > 5) {
        const intensity = Math.min((s.speed - 5) * 0.02, 0.1);
        ctx!.strokeStyle = `rgba(255,255,255,${intensity})`;
        ctx!.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
          const x = (Date.now() * 0.1 + i * 67) % W;
          ctx!.beginPath();
          ctx!.moveTo(x, 0);
          ctx!.lineTo(x, H);
          ctx!.stroke();
        }
      }

      // Paddle
      ctx!.beginPath();
      ctx!.roundRect(s.paddleX, paddleY, paddleW, PADDLE_H, 7);
      const pGrad = ctx!.createLinearGradient(s.paddleX, paddleY, s.paddleX, paddleY + PADDLE_H);
      pGrad.addColorStop(0, "#ffffff");
      pGrad.addColorStop(1, "#a0a0a0");
      ctx!.fillStyle = pGrad;
      ctx!.fill();
      ctx!.shadowColor = "rgba(255,255,255,0.15)";
      ctx!.shadowBlur = 12;
      ctx!.fill();
      ctx!.shadowBlur = 0;

      // Ball
      if (s.phase !== "over" || Date.now() % 400 < 300) {
        // Trail
        if (s.phase === "playing") {
          const trailAlpha = Math.min(s.speed * 0.025, 0.2);
          ctx!.beginPath();
          ctx!.arc(s.ballX - s.ballVx * 2, s.ballY - s.ballVy * 2, BALL_R * 0.8, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(168,85,247,${trailAlpha})`;
          ctx!.fill();

          // Second trail for high speed
          if (s.speed > 6) {
            ctx!.beginPath();
            ctx!.arc(s.ballX - s.ballVx * 4, s.ballY - s.ballVy * 4, BALL_R * 0.5, 0, Math.PI * 2);
            ctx!.fillStyle = `rgba(168,85,247,${trailAlpha * 0.5})`;
            ctx!.fill();
          }
        }

        // Ball body
        ctx!.beginPath();
        ctx!.arc(s.ballX, s.ballY, BALL_R, 0, Math.PI * 2);
        const bGrad = ctx!.createRadialGradient(
          s.ballX - 2,
          s.ballY - 2,
          1,
          s.ballX,
          s.ballY,
          BALL_R
        );
        bGrad.addColorStop(0, "#c084fc");
        bGrad.addColorStop(0.6, "#a855f7");
        bGrad.addColorStop(1, "#7c3aed");
        ctx!.fillStyle = bGrad;
        ctx!.fill();

        // Ball shine
        ctx!.beginPath();
        ctx!.arc(s.ballX - 2.5, s.ballY - 2.5, 3, 0, Math.PI * 2);
        ctx!.fillStyle = "rgba(255,255,255,0.35)";
        ctx!.fill();

        // Ball glow (bigger at high speed)
        const glowR = BALL_R + 4 + Math.min(s.speed * 0.5, 6);
        ctx!.beginPath();
        ctx!.arc(s.ballX, s.ballY, glowR, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(168,85,247,${Math.min(0.08 + s.speed * 0.01, 0.2)})`;
        ctx!.fill();
      }

      // Score watermark
      ctx!.fillStyle = "rgba(255,255,255,0.12)";
      ctx!.font = "bold 48px system-ui, sans-serif";
      ctx!.textAlign = "center";
      ctx!.fillText(String(s.score), W / 2, 70);

      // Speed indicator
      if (s.phase === "playing" && s.score > 0) {
        ctx!.fillStyle = `rgba(168,85,247,${Math.min(0.15 + s.speed * 0.02, 0.5)})`;
        ctx!.font = "bold 10px system-ui, sans-serif";
        ctx!.fillText(`${s.speed.toFixed(1)}x`, W / 2, 90);
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const { W, H } = sizeRef.current;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)", touchAction: "none" }}
    >
      <div
        className="relative flex flex-col items-center gap-3 p-3 sm:p-4 animate-in"
        style={{ maxWidth: W + 32, width: "100%" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between w-full px-1">
          <div className="flex items-center gap-2">
            <span className="text-lg">🏓</span>
            <h2 className="text-white text-base sm:text-lg font-bold tracking-tight">
              Paddle Ball
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {bestScore > 0 && (
              <span className="text-white/25 text-[10px] font-medium">Best: {bestScore}</span>
            )}
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
        </div>

        {/* Canvas */}
        <div
          className="relative overflow-hidden"
          style={{
            width: W,
            height: H,
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.08)",
            touchAction: "none",
          }}
        >
          <canvas ref={canvasRef} style={{ width: W, height: H, touchAction: "none" }} />

          {phase === "ready" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <button
                onClick={startGame}
                className="px-8 py-3 rounded-2xl text-sm font-bold text-white active:scale-95 transition-transform"
                style={{
                  background: "linear-gradient(135deg, #a855f7, #7c3aed)",
                  boxShadow: "0 4px 20px rgba(168,85,247,0.4)",
                }}
              >
                Tap to Start
              </button>
              <p className="text-white/25 text-[10px]">Move finger to control paddle</p>
            </div>
          )}

          {phase === "over" && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-3"
              style={{ background: "rgba(0,0,0,0.5)" }}
            >
              <div
                className="flex flex-col items-center gap-1 px-6 py-4 rounded-2xl animate-in"
                style={{
                  background: "rgba(28,28,30,0.95)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <span className="text-white/30 text-[10px] uppercase tracking-wider font-semibold">
                  Score
                </span>
                <span className="text-white text-3xl font-black">{score}</span>
                {score === bestScore && score > 0 && (
                  <span className="text-yellow-400 text-[10px] font-semibold">New best!</span>
                )}
              </div>
              <button
                onClick={startGame}
                className="px-6 py-2.5 rounded-xl text-xs font-bold text-white active:scale-95 transition-transform"
                style={{
                  background: "linear-gradient(135deg, #a855f7, #7c3aed)",
                  boxShadow: "0 4px 16px rgba(168,85,247,0.3)",
                }}
              >
                Play Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
