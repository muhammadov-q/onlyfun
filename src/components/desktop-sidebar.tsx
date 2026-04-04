"use client";

interface DesktopSidebarProps {
  musicPlaying: boolean;
  onMusicToggle: () => void;
  liveCamOpen: boolean;
  onLiveCamToggle: () => void;
  liveBadgeText: string;
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

export function DesktopSidebar({
  musicPlaying,
  onMusicToggle,
  liveCamOpen,
  onLiveCamToggle,
  liveBadgeText,
}: DesktopSidebarProps) {
  return (
    <div className="hidden sm:flex flex-col w-[320px] bg-black border-r border-white/10 shrink-0 overflow-y-auto">
      {/* Live cam section */}
      <div className="p-3">
        <button
          onClick={onLiveCamToggle}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl transition-all mb-2 ${
            liveCamOpen
              ? "bg-red-600/15 text-red-400"
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
          <span className="text-xs font-semibold uppercase tracking-wider">
            {liveBadgeText}
          </span>
        </button>

        {liveCamOpen && (
          <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black">
            <iframe
              src="https://www.youtube.com/embed/GQRnp3GLx1U?autoplay=1&mute=1&controls=0&modestbranding=1&playsinline=1&loop=1&disablekb=1&fs=0&rel=0&showinfo=0&iv_load_policy=3"
              allow="autoplay; encrypted-media"
              className="w-full aspect-video block pointer-events-none"
              style={{ border: 0 }}
            />
            <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-600/90 text-white text-[10px] font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              {liveBadgeText}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-white/5 mx-3" />

      {/* Controls */}
      <div className="p-3 flex flex-col gap-1.5">
        {/* Sound toggle */}
        <button
          onClick={onMusicToggle}
          className={`w-full h-10 rounded-xl flex items-center gap-3 px-3 transition-all ${
            musicPlaying
              ? "bg-white/5 text-white/50"
              : "bg-white/5 text-white/50 hover:text-white hover:bg-white/10"
          }`}
        >
          {musicPlaying ? <SpeakerIcon /> : <SpeakerOffIcon />}
          <span className="text-sm font-medium">{musicPlaying ? "Sound on" : "Sound off"}</span>
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

        {/* New tab */}
        <button
          onClick={() => window.open(window.location.href, "_blank")}
          className="w-full h-10 rounded-xl flex items-center gap-3 px-3 bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-all"
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
          >
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          <span className="text-sm font-medium">New tab</span>
        </button>
      </div>
    </div>
  );
}
