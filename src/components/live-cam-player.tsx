"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Hls from "hls.js";

export interface CameraFeed {
  id: string;
  label: string;
  type: "youtube" | "hls";
  src: string;
}

export const CAMERA_FEEDS: CameraFeed[] = [
  {
    id: "ala-too",
    label: "Ala-Too Square",
    type: "hls",
    src: "https://webcam.elcat.kg/Bishkek_Ala-Too_Square/index.m3u8",
  },
  {
    id: "youtube",
    label: "Bishkek Live",
    type: "youtube",
    src: "https://www.youtube.com/embed/GQRnp3GLx1U?autoplay=1&mute=1&controls=0&modestbranding=1&playsinline=1&loop=1&disablekb=1&fs=0&rel=0&showinfo=0&iv_load_policy=3",
  },
];

function HlsPlayer({ src, className }: { src: string; className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });
      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari native HLS
      video.src = src;
      video.addEventListener("loadedmetadata", () => {
        video.play().catch(() => {});
      });
    }
  }, [src]);

  return <video ref={videoRef} className={className} muted autoPlay playsInline controls={false} />;
}

function YoutubePlayer({ src, className }: { src: string; className?: string }) {
  return (
    <iframe
      src={src}
      allow="autoplay; encrypted-media"
      className={`block ${className ?? ""}`}
      style={{ border: 0 }}
    />
  );
}

interface LiveCamPlayerProps {
  badgeText: string;
  className?: string;
  variant: "desktop" | "mobile";
  onClose?: () => void;
}

export function LiveCamPlayer({ badgeText, className, variant, onClose }: LiveCamPlayerProps) {
  const [idx, setIdx] = useState(0);
  const feed = CAMERA_FEEDS[idx];

  const prev = useCallback(() => {
    setIdx((i) => (i - 1 + CAMERA_FEEDS.length) % CAMERA_FEEDS.length);
  }, []);

  const next = useCallback(() => {
    setIdx((i) => (i + 1) % CAMERA_FEEDS.length);
  }, []);

  const frameClass =
    variant === "desktop"
      ? "w-full aspect-video pointer-events-none"
      : "w-[260px] h-[146px] sm:w-[320px] sm:h-[180px] pointer-events-none";

  return (
    <div
      className={`relative rounded-2xl overflow-hidden border border-white/10 bg-black ${className ?? ""}`}
    >
      {feed.type === "hls" ? (
        <HlsPlayer src={feed.src} className={frameClass} />
      ) : (
        <YoutubePlayer src={feed.src} className={frameClass} />
      )}

      {/* LIVE badge */}
      <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-600/90 text-white text-[10px] font-bold uppercase tracking-wider">
        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
        {badgeText}
      </div>

      {/* Close button — mobile only */}
      {variant === "mobile" && onClose && (
        <button
          onClick={onClose}
          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white/70 flex items-center justify-center hover:text-white transition-colors"
          style={{ touchAction: "manipulation" }}
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
      )}

      {/* Bottom bar: prev/next arrows + camera label + dots */}
      {CAMERA_FEEDS.length > 1 && (
        <div className="absolute bottom-0 inset-x-0 flex items-center justify-between px-2 py-1.5 bg-gradient-to-t from-black/70 to-transparent">
          <button
            onClick={prev}
            className="w-6 h-6 rounded-full bg-black/50 text-white/70 hover:text-white flex items-center justify-center transition-colors"
            style={{ touchAction: "manipulation" }}
          >
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
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/70 font-medium">{feed.label}</span>
            <div className="flex gap-1">
              {CAMERA_FEEDS.map((_, i) => (
                <span
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${i === idx ? "bg-white" : "bg-white/30"}`}
                />
              ))}
            </div>
          </div>

          <button
            onClick={next}
            className="w-6 h-6 rounded-full bg-black/50 text-white/70 hover:text-white flex items-center justify-center transition-colors"
            style={{ touchAction: "manipulation" }}
          >
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
        </div>
      )}
    </div>
  );
}
