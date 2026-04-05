"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/i18n";

// ─── Step config ────────────────────────────────────────────

type TourStep = {
  target: string;
  titleKey: string;
  descKey: string;
  /** Where to place tooltip relative to the target */
  placement: "top" | "bottom" | "left" | "right" | "auto";
};

const DESKTOP_STEPS: TourStep[] = [
  {
    target: "map",
    titleKey: "tour.desktop.map.title",
    descKey: "tour.desktop.map.desc",
    placement: "bottom",
  },
  {
    target: "room-card",
    titleKey: "tour.desktop.roomCard.title",
    descKey: "tour.desktop.roomCard.desc",
    placement: "left",
  },
  {
    target: "create-fab",
    titleKey: "tour.desktop.create.title",
    descKey: "tour.desktop.create.desc",
    placement: "left",
  },
  {
    target: "all-rooms",
    titleKey: "tour.desktop.allRooms.title",
    descKey: "tour.desktop.allRooms.desc",
    placement: "bottom",
  },
  {
    target: "music-toggle",
    titleKey: "tour.desktop.music.title",
    descKey: "tour.desktop.music.desc",
    placement: "right",
  },
  {
    target: "live-cam",
    titleKey: "tour.desktop.liveCam.title",
    descKey: "tour.desktop.liveCam.desc",
    placement: "right",
  },
  {
    target: "pulse-section",
    titleKey: "tour.desktop.pulse.title",
    descKey: "tour.desktop.pulse.desc",
    placement: "right",
  },
  {
    target: "events-section",
    titleKey: "tour.desktop.events.title",
    descKey: "tour.desktop.events.desc",
    placement: "right",
  },
  {
    target: "profile-btn",
    titleKey: "tour.desktop.profile.title",
    descKey: "tour.desktop.profile.desc",
    placement: "bottom",
  },
];

const MOBILE_STEPS: TourStep[] = [
  {
    target: "map",
    titleKey: "tour.mobile.map.title",
    descKey: "tour.mobile.map.desc",
    placement: "auto",
  },
  {
    target: "room-card",
    titleKey: "tour.mobile.roomCard.title",
    descKey: "tour.mobile.roomCard.desc",
    placement: "auto",
  },
  {
    target: "create-fab",
    titleKey: "tour.mobile.create.title",
    descKey: "tour.mobile.create.desc",
    placement: "top",
  },
  {
    target: "all-rooms",
    titleKey: "tour.mobile.allRooms.title",
    descKey: "tour.mobile.allRooms.desc",
    placement: "bottom",
  },
  {
    target: "mobile-music",
    titleKey: "tour.mobile.music.title",
    descKey: "tour.mobile.music.desc",
    placement: "bottom",
  },
  {
    target: "mobile-livecam",
    titleKey: "tour.mobile.liveCam.title",
    descKey: "tour.mobile.liveCam.desc",
    placement: "bottom",
  },
  {
    target: "mobile-pulse",
    titleKey: "tour.mobile.pulse.title",
    descKey: "tour.mobile.pulse.desc",
    placement: "bottom",
  },
  {
    target: "mobile-menu",
    titleKey: "tour.mobile.profile.title",
    descKey: "tour.mobile.profile.desc",
    placement: "bottom",
  },
];

const STORAGE_KEY = "onlyfun-tour-done";
const TOUR_RESTART_EVENT = "onlyfun-tour-restart";
const PAD = 8;
const TOOLTIP_GAP = 12;
const BORDER_RADIUS = 12;

/** Call this to restart the tour from anywhere */
export function restartTour() {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(TOUR_RESTART_EVENT));
}

// ─── Resolve "auto" placement ───────────────────────────────

function resolvePlacement(
  rect: DOMRect,
  placement: TourStep["placement"],
  tooltipH: number
): "top" | "bottom" | "left" | "right" {
  if (placement !== "auto") return placement;

  const vh = window.innerHeight;
  const spaceBelow = vh - rect.bottom - PAD;
  const spaceAbove = rect.top - PAD;

  // Prefer below, fall back to above
  if (spaceBelow >= tooltipH + TOOLTIP_GAP + 20) return "bottom";
  if (spaceAbove >= tooltipH + TOOLTIP_GAP + 20) return "top";
  // If neither fits well, use whichever has more room
  return spaceBelow >= spaceAbove ? "bottom" : "top";
}

// ─── Tooltip position ───────────────────────────────────────

function getTooltipPos(
  rect: DOMRect,
  placement: "top" | "bottom" | "left" | "right",
  tw: number,
  th: number,
  mobile: boolean
) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const safeX = mobile ? 8 : 12;
  const safeY = mobile ? 8 : 12;
  let top = 0;
  let left = 0;

  switch (placement) {
    case "bottom":
      top = rect.bottom + PAD + TOOLTIP_GAP;
      left = rect.left + rect.width / 2 - tw / 2;
      break;
    case "top":
      top = rect.top - PAD - TOOLTIP_GAP - th;
      left = rect.left + rect.width / 2 - tw / 2;
      break;
    case "right":
      top = rect.top + rect.height / 2 - th / 2;
      left = rect.right + PAD + TOOLTIP_GAP;
      break;
    case "left":
      top = rect.top + rect.height / 2 - th / 2;
      left = rect.left - PAD - TOOLTIP_GAP - tw;
      break;
  }

  // Clamp to viewport with safe margins
  left = Math.max(safeX, Math.min(left, vw - safeX - tw));
  top = Math.max(safeY, Math.min(top, vh - safeY - th));
  return { top, left };
}

// ─── Connector line anchor points ───────────────────────────

function getConnectorPoints(
  rect: DOMRect,
  placement: "top" | "bottom" | "left" | "right",
  tooltipTop: number,
  tooltipLeft: number,
  tw: number,
  th: number
) {
  let tx = 0,
    ty = 0,
    sx = 0,
    sy = 0;

  switch (placement) {
    case "bottom":
      tx = rect.left + rect.width / 2;
      ty = rect.bottom + PAD;
      sx = tooltipLeft + tw / 2;
      sy = tooltipTop;
      break;
    case "top":
      tx = rect.left + rect.width / 2;
      ty = rect.top - PAD;
      sx = tooltipLeft + tw / 2;
      sy = tooltipTop + th;
      break;
    case "right":
      tx = rect.right + PAD;
      ty = rect.top + rect.height / 2;
      sx = tooltipLeft;
      sy = tooltipTop + th / 2;
      break;
    case "left":
      tx = rect.left - PAD;
      ty = rect.top + rect.height / 2;
      sx = tooltipLeft + tw;
      sy = tooltipTop + th / 2;
      break;
  }

  return { tx, ty, sx, sy };
}

// ─── Main component ─────────────────────────────────────────

export function OnboardingTour() {
  const { t } = useI18n();
  const tp = (key: string) => t(key as Parameters<typeof t>[0]);

  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipSize, setTooltipSize] = useState({ w: 260, h: 160 });

  const steps = isMobile ? MOBILE_STEPS : DESKTOP_STEPS;
  const current = steps[step];

  // Responsive tooltip width
  const tooltipWidth = isMobile ? "w-[calc(100vw-32px)] max-w-[300px]" : "w-[280px]";

  // Show tour on first visit
  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      const timer = setTimeout(() => setActive(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  // Listen for restart event
  useEffect(() => {
    const handler = () => {
      setStep(0);
      setActive(true);
    };
    window.addEventListener(TOUR_RESTART_EVENT, handler);
    return () => window.removeEventListener(TOUR_RESTART_EVENT, handler);
  }, []);

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Auto-skip steps whose target doesn't exist (e.g. no rooms yet)
  const skipDirection = useRef<"fwd" | "bwd">("fwd");
  useEffect(() => {
    if (!active || !current) return;
    // Small delay to let DOM settle (portals, conditional renders)
    const timer = setTimeout(() => {
      const el = document.querySelector(`[data-tour="${current.target}"]`);
      if (!el) {
        if (skipDirection.current === "fwd" && step < steps.length - 1) {
          setStep((s) => s + 1);
        } else if (skipDirection.current === "bwd" && step > 0) {
          setStep((s) => s - 1);
        } else if (step < steps.length - 1) {
          setStep((s) => s + 1);
        } else {
          finish();
        }
      }
    }, 100);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, step, current, steps.length]);

  // Track target element rect
  useEffect(() => {
    if (!active || !current) return;
    const measure = () => {
      const el = document.querySelector(`[data-tour="${current.target}"]`);
      if (el) {
        const rect = el.getBoundingClientRect();
        // Clamp huge elements (like the map) to a reasonable spotlight size on mobile
        if (
          isMobile &&
          rect.width > window.innerWidth * 0.9 &&
          rect.height > window.innerHeight * 0.5
        ) {
          // Show a centered portion of the large element
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          const spotW = Math.min(rect.width, window.innerWidth - 32);
          const spotH = Math.min(280, rect.height * 0.4);
          setTargetRect(new DOMRect(cx - spotW / 2, cy - spotH / 2, spotW, spotH));
        } else {
          setTargetRect(rect);
        }
      } else {
        setTargetRect(null);
      }
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [active, step, current, isMobile]);

  // Measure tooltip size after render
  useEffect(() => {
    if (!tooltipRef.current) return;
    // Use rAF to get accurate size after layout
    const id = requestAnimationFrame(() => {
      if (tooltipRef.current) {
        setTooltipSize({ w: tooltipRef.current.offsetWidth, h: tooltipRef.current.offsetHeight });
      }
    });
    return () => cancelAnimationFrame(id);
  }, [step, active, targetRect]);

  const finish = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "1");
    setActive(false);
  }, []);

  const next = useCallback(() => {
    skipDirection.current = "fwd";
    if (step < steps.length - 1) setStep((s) => s + 1);
    else finish();
  }, [step, steps.length, finish]);

  const prev = useCallback(() => {
    skipDirection.current = "bwd";
    if (step > 0) setStep((s) => s - 1);
  }, [step]);

  // Keyboard
  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "Escape") finish();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [active, next, prev, finish]);

  if (!active || !current) return null;

  const vw = typeof window !== "undefined" ? window.innerWidth : 375;
  const vh = typeof window !== "undefined" ? window.innerHeight : 812;

  // Spotlight hole coordinates
  const hx = targetRect ? targetRect.left - PAD : 0;
  const hy = targetRect ? targetRect.top - PAD : 0;
  const hw = targetRect ? targetRect.width + PAD * 2 : 0;
  const hh = targetRect ? targetRect.height + PAD * 2 : 0;

  const resolved = targetRect
    ? resolvePlacement(targetRect, current.placement, tooltipSize.h)
    : "bottom";

  const tooltipPos = targetRect
    ? getTooltipPos(targetRect, resolved, tooltipSize.w, tooltipSize.h, isMobile)
    : { top: vh / 2 - 80, left: vw / 2 - tooltipSize.w / 2 };

  const connector = targetRect
    ? getConnectorPoints(
        targetRect,
        resolved,
        tooltipPos.top,
        tooltipPos.left,
        tooltipSize.w,
        tooltipSize.h
      )
    : null;

  // Count visible steps (for progress display, since some may be skipped)
  const visibleStepIndex = step;
  const totalSteps = steps.length;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[10000]"
        style={{ pointerEvents: "auto", touchAction: "none" }}
      >
        {/* ── SVG overlay with cutout hole ── */}
        <motion.svg
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 w-full h-full"
          style={{ pointerEvents: "auto" }}
          onClick={finish}
          onTouchEnd={(e) => {
            // Only finish if tapping the dark overlay, not the spotlight area
            if (targetRect) {
              const touch = e.changedTouches[0];
              if (
                touch.clientX >= targetRect.left - PAD &&
                touch.clientX <= targetRect.right + PAD &&
                touch.clientY >= targetRect.top - PAD &&
                touch.clientY <= targetRect.bottom + PAD
              ) {
                return;
              }
            }
          }}
        >
          <defs>
            <mask id="tour-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {targetRect && (
                <rect
                  x={hx}
                  y={hy}
                  width={hw}
                  height={hh}
                  rx={BORDER_RADIUS}
                  ry={BORDER_RADIUS}
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.75)"
            mask="url(#tour-mask)"
          />
        </motion.svg>

        {/* ── Spotlight border ── */}
        {targetRect && (
          <motion.div
            key={`ring-${step}`}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="absolute pointer-events-none"
            style={{
              top: hy,
              left: hx,
              width: hw,
              height: hh,
              borderRadius: BORDER_RADIUS,
              border: "2px solid rgba(255,255,255,0.4)",
              boxShadow:
                "0 0 24px 4px rgba(255,255,255,0.08), inset 0 0 12px 2px rgba(255,255,255,0.04)",
            }}
          >
            <div
              className="absolute inset-0 rounded-[inherit] animate-pulse"
              style={{ border: "1px solid rgba(255,255,255,0.15)" }}
            />
          </motion.div>
        )}

        {/* ── Connector line ── */}
        {connector && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
            <motion.line
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              x1={connector.tx}
              y1={connector.ty}
              x2={connector.sx}
              y2={connector.sy}
              stroke="rgba(255,255,255,0.25)"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            <motion.circle
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              cx={connector.tx}
              cy={connector.ty}
              r="3.5"
              fill="white"
              opacity="0.6"
            />
            <circle
              cx={connector.tx}
              cy={connector.ty}
              r="7"
              fill="none"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="1.5"
            >
              <animate attributeName="r" values="5;12;5" dur="2s" repeatCount="indefinite" />
              <animate
                attributeName="opacity"
                values="0.5;0;0.5"
                dur="2s"
                repeatCount="indefinite"
              />
            </circle>
          </svg>
        )}

        {/* ── Tooltip ── */}
        <motion.div
          ref={tooltipRef}
          key={`tooltip-${step}`}
          initial={{ opacity: 0, y: 10, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.97 }}
          transition={{ duration: 0.3, delay: 0.12 }}
          className={`absolute ${tooltipWidth} bg-zinc-900/95 backdrop-blur-sm rounded-2xl border border-white/15 shadow-2xl p-4`}
          style={{
            top: tooltipPos.top,
            left: tooltipPos.left,
            zIndex: 2,
            touchAction: "none",
          }}
          onClick={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          {/* Progress bar */}
          <div className="flex items-center gap-1 mb-3">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === visibleStepIndex
                    ? "w-5 bg-white"
                    : i < visibleStepIndex
                      ? "w-2 bg-white/40"
                      : "w-2 bg-white/10"
                }`}
              />
            ))}
            <span className="text-[10px] text-white/30 ml-auto tabular-nums whitespace-nowrap">
              {visibleStepIndex + 1} {tp("tour.step")} {totalSteps}
            </span>
          </div>

          {/* Content */}
          <h3 className="text-sm font-semibold text-white mb-1">{tp(current.titleKey)}</h3>
          <p className="text-[13px] text-white/55 leading-relaxed mb-4">{tp(current.descKey)}</p>

          {/* Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={finish}
              className="text-[11px] text-white/25 hover:text-white/50 active:text-white/50 transition-colors mr-auto py-1"
            >
              {tp("tour.skip")}
            </button>

            {step > 0 && (
              <button
                onClick={prev}
                className="h-9 px-3.5 rounded-xl text-xs font-medium text-white/60 bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 transition-all"
              >
                {tp("tour.prev")}
              </button>
            )}

            <button
              onClick={next}
              className="h-9 px-5 rounded-xl text-xs font-semibold text-black bg-white hover:bg-white/90 active:bg-white/80 transition-all"
            >
              {step === steps.length - 1 ? tp("tour.done") : tp("tour.next")}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
