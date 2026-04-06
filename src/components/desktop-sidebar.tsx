"use client";

import { useState } from "react";
import { useI18n } from "@/i18n";
import { BishkekPulseFeed } from "./sidebar/BishkekPulseFeed";
import { EventsBox } from "./sidebar/EventsBox";
import { SponsorBox } from "./sidebar/SponsorBox";
import { LiveCamPlayer } from "./live-cam-player";
import type { RoomModeId } from "@/types/room";
import type { Room } from "./use-party";

interface DesktopSidebarProps {
  musicPlaying: boolean;
  onMusicToggle: () => void;
  liveCamOpen: boolean;
  onLiveCamToggle: () => void;
  liveBadgeText: string;
  onTalkAbout: (topic: string, mode: RoomModeId) => void;
  rooms: Room[];
  onJoinRoom: (roomId: string) => void;
}

function SpeakerIcon() {
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
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

function SpeakerOffIcon() {
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
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );
}

function PulseSection({
  tp,
  onTalkAbout,
  rooms,
  onJoinRoom,
}: {
  tp: (key: string) => string;
  onTalkAbout: (topic: string, mode: RoomModeId) => void;
  rooms: Room[];
  onJoinRoom: (roomId: string) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="shrink-0">
      <div className="px-3 pt-2 pb-1.5">
        <button
          onClick={() => setOpen((v) => !v)}
          className={`w-full h-9 rounded-xl flex items-center gap-3 px-3 hover:text-white hover:bg-white/10 transition-all group ${open ? "bg-white/10 text-white" : "bg-white/5 text-white/50"}`}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0"
            style={{ animation: "heartbeat 1.4s ease-in-out infinite" }}
          >
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <span className="text-xs font-medium">{tp("pulse.title")}</span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`ml-auto text-white/25 group-hover:text-white/40 transition-transform ${open ? "" : "-rotate-90"}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>
      {open && (
        <div className="px-3 pb-2">
          <BishkekPulseFeed onTalkAbout={onTalkAbout} rooms={rooms} onJoinRoom={onJoinRoom} />
        </div>
      )}
    </div>
  );
}

function EventsSection({
  tp,
  onTalkAbout,
  rooms,
  onJoinRoom,
}: {
  tp: (key: string) => string;
  onTalkAbout: (topic: string, mode: RoomModeId) => void;
  rooms: Room[];
  onJoinRoom: (roomId: string) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="shrink-0">
      <div className="px-3 pt-2 pb-1.5">
        <button
          onClick={() => setOpen((v) => !v)}
          className={`w-full h-9 rounded-xl flex items-center gap-3 px-3 hover:text-white hover:bg-white/10 transition-all group ${open ? "bg-white/10 text-white" : "bg-white/5 text-white/50"}`}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span className="text-xs font-medium">{tp("events.title")}</span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`ml-auto text-white/25 group-hover:text-white/40 transition-transform ${open ? "" : "-rotate-90"}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>
      {open && (
        <div className="px-3 pb-2">
          <EventsBox onTalkAbout={onTalkAbout} rooms={rooms} onJoinRoom={onJoinRoom} />
        </div>
      )}
    </div>
  );
}

export function DesktopSidebar({
  musicPlaying,
  onMusicToggle,
  liveCamOpen,
  onLiveCamToggle,
  liveBadgeText,
  onTalkAbout,
  rooms,
  onJoinRoom,
}: DesktopSidebarProps) {
  const { t } = useI18n();

  const tp = (key: string) => t(key as Parameters<typeof t>[0]);

  return (
    <div className="hidden sm:flex flex-col w-[320px] bg-black border-r border-white/10 shrink-0 overflow-y-auto hide-scrollbar">
      {/* === Top: Sound + Live cam (compact) === */}
      <div className="shrink-0">
        {/* Sound toggle */}
        <div className="p-3 pb-2" data-tour="music-toggle">
          <button
            onClick={onMusicToggle}
            className={`w-full h-9 rounded-xl flex items-center gap-3 px-3 transition-all ${
              musicPlaying
                ? "bg-white/10 text-white"
                : "bg-white/5 text-white/50 hover:text-white hover:bg-white/10"
            }`}
          >
            {musicPlaying ? <SpeakerIcon /> : <SpeakerOffIcon />}
            <span className="text-xs font-medium">
              {musicPlaying ? t("nav.musicOn") : t("nav.musicOff")}
            </span>
            {musicPlaying && (
              <div className="flex items-end gap-[3px] h-4 ml-auto">
                {[
                  { delay: 0, color: "#a78bfa" },
                  { delay: 0.4, color: "#818cf8" },
                  { delay: 0.8, color: "#6366f1" },
                  { delay: 1.2, color: "#818cf8" },
                  { delay: 0.3, color: "#a78bfa" },
                  { delay: 0.7, color: "#c4b5fd" },
                  { delay: 1.0, color: "#6366f1" },
                ].map((bar, i) => (
                  <span
                    key={i}
                    className="w-[2.5px] rounded-full vibe-bar"
                    style={{
                      animationDelay: `${bar.delay}s`,
                      backgroundColor: bar.color,
                    }}
                  />
                ))}
              </div>
            )}
          </button>
        </div>

        {/* Live cam */}
        <div className="px-3 pb-2" data-tour="live-cam">
          <button
            onClick={onLiveCamToggle}
            className={`w-full h-9 rounded-xl flex items-center gap-3 px-3 transition-all group ${
              liveCamOpen
                ? "bg-white/10 text-white"
                : "bg-white/5 text-white/50 hover:text-white hover:bg-white/10"
            }`}
          >
            <span className="relative shrink-0">
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
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            </span>
            <span className="text-xs font-medium">{liveBadgeText}</span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`ml-auto text-white/25 group-hover:text-white/40 transition-transform ${liveCamOpen ? "" : "-rotate-90"}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {liveCamOpen && (
            <LiveCamPlayer badgeText={liveBadgeText} variant="desktop" className="mt-2" />
          )}
        </div>
      </div>

      <div className="border-t border-white/5 mx-3" />

      {/* === Middle: Bishkek Pulse (collapsible, open by default) === */}
      <div data-tour="pulse-section">
        <PulseSection tp={tp} onTalkAbout={onTalkAbout} rooms={rooms} onJoinRoom={onJoinRoom} />
      </div>

      <div className="border-t border-white/5 mx-3" />

      {/* === Events section === */}
      <div data-tour="events-section">
        <EventsSection tp={tp} onTalkAbout={onTalkAbout} rooms={rooms} onJoinRoom={onJoinRoom} />
      </div>

      <div className="border-t border-white/5 mx-3" />

      {/* === Sponsor section === */}
      <div className="shrink-0 px-3 py-2">
        <div className="flex items-center gap-3 px-3 h-9 mb-1.5">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-yellow-400 shrink-0"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <span className="text-xs font-medium text-white/50">{tp("sponsor.title")}</span>
        </div>
        <SponsorBox />
      </div>
    </div>
  );
}
