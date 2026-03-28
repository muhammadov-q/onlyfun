"use client";

import { Link } from "@/i18n/navigation";

export interface DesktopIconDef {
  key: string;
  name: string;
  emoji: string;
  gradient: string;
  shadow: string;
  rotation: string;
  available: boolean;
  isNew: boolean;
}

interface DesktopIconProps extends DesktopIconDef {
  href: string;
}

export function DesktopIcon({ name, emoji, gradient, shadow, rotation, available, isNew, href }: DesktopIconProps) {
  const iconBox = (
    <div className="flex flex-col items-center gap-2 w-20 group">
      <div
        className="relative w-14 h-14 rounded-[18px] flex items-center justify-center overflow-hidden transition-all duration-200"
        style={{
          background: gradient,
          boxShadow: available
            ? `0 4px 14px -2px ${shadow}, 0 2px 4px rgba(0,0,0,0.2)`
            : "0 2px 8px rgba(0,0,0,0.15)",
          transform: available ? rotation : "none",
        }}
      >
        {/* Top-edge glass shine */}
        <div className="absolute inset-x-0 top-0 h-1/2 rounded-t-[18px] bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />

        {/* Bottom inner shadow */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/15 to-transparent rounded-b-[18px] pointer-events-none" />

        {/* Emoji */}
        <span
          className={`text-3xl leading-none relative z-10 transition-transform duration-200 ${available ? "group-hover:scale-110 group-hover:-translate-y-0.5" : "opacity-40 grayscale"}`}
          style={{ filter: available ? "drop-shadow(0 1px 2px rgba(0,0,0,0.25))" : undefined }}
        >
          {emoji}
        </span>

        {/* Hover scale on whole box */}
        {available && (
          <div className="absolute inset-0 rounded-[18px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/10" />
        )}

        {/* Lock stripe for unavailable */}
        {!available && (
          <div
            className="absolute inset-0 rounded-[18px]"
            style={{
              background: "repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(0,0,0,0.08) 4px, rgba(0,0,0,0.08) 8px)",
            }}
          />
        )}

        {/* NEW dot */}
        {isNew && available && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white/20 flex items-center justify-center z-20">
            <span className="text-[8px] text-white font-black leading-none">N</span>
          </div>
        )}
      </div>

      {/* Label */}
      <span
        className="text-[11px] font-semibold text-white text-center leading-tight line-clamp-2 w-full"
        style={{ textShadow: "0 1px 4px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.6)" }}
      >
        {name}
      </span>
    </div>
  );

  if (!available) return <div className="cursor-not-allowed">{iconBox}</div>;

  return (
    <Link
      href={href}
      className="focus:outline-none"
      style={{ display: "block" }}
    >
      <div className="group-hover:-translate-y-1 transition-transform duration-200">
        {iconBox}
      </div>
    </Link>
  );
}
