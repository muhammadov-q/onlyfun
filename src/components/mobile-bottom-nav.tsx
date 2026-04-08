"use client";

interface MobileBottomNavProps {
  onLiveTap: () => void;
  onPulseTap: () => void;
  onCreateTap: () => void;
  onEventsTap: () => void;
  onRoomsTap: () => void;
  liveCamOpen: boolean;
  pulseOpen: boolean;
  eventsOpen: boolean;
  roomsOpen: boolean;
  hidden: boolean;
  roomCount: number;
  labels: {
    live: string;
    pulse: string;
    create: string;
    events: string;
    rooms: string;
  };
}

export function MobileBottomNav({
  onLiveTap,
  onPulseTap,
  onCreateTap,
  onEventsTap,
  onRoomsTap,
  liveCamOpen,
  pulseOpen,
  eventsOpen,
  roomsOpen,
  hidden,
  roomCount,
  labels,
}: MobileBottomNavProps) {
  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-[50] sm:hidden transition-transform duration-300 ${
        hidden ? "translate-y-full" : "translate-y-0"
      }`}
    >
      {/* Floating + button — detached from bar */}
      <button
        data-tour="create-fab"
        onClick={onCreateTap}
        className="absolute left-1/2 -translate-x-1/2 -top-5 w-[60px] h-[60px] rounded-full bg-white text-black flex items-center justify-center shadow-2xl active:scale-95 transition-transform z-10 ring-4 ring-black"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      <div
        className="border-t border-white/10 bg-black backdrop-blur-xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="grid grid-cols-5 items-end">
          {/* Live */}
          <button
            data-tour="mobile-livecam"
            onClick={onLiveTap}
            className={`flex flex-col items-center justify-center pt-2 pb-1.5 gap-0.5 transition-transform ${liveCamOpen ? "text-white" : "text-white/60"}`}
          >
            <div className="relative">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />
                <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.4" />
                <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.4" />
                <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19" />
                <circle cx="12" cy="12" r="2" />
              </svg>
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            </div>
            <span className="text-[10px] font-medium">{labels.live}</span>
          </button>

          {/* Pulse */}
          <button
            data-tour="mobile-pulse"
            onClick={onPulseTap}
            className={`flex flex-col items-center justify-center pt-2 pb-1.5 gap-0.5 transition-transform ${pulseOpen ? "text-white" : "text-white/60"}`}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            <span className="text-[10px] font-medium">{labels.pulse}</span>
          </button>

          {/* Center spacer for floating + button */}
          <div />

          {/* Events */}
          <button
            data-tour="mobile-events"
            onClick={onEventsTap}
            className={`flex flex-col items-center justify-center pt-2 pb-1.5 gap-0.5 transition-transform ${eventsOpen ? "text-white" : "text-white/60"}`}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span className="text-[10px] font-medium">{labels.events}</span>
          </button>

          {/* Rooms */}
          <button
            data-tour="all-rooms-mobile"
            onClick={onRoomsTap}
            className={`flex flex-col items-center justify-center pt-2 pb-1.5 gap-0.5 transition-transform ${roomsOpen ? "text-white" : "text-white/60"}`}
          >
            <div className="relative">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              {roomCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 bg-zinc-400 text-black text-[8px] font-bold px-1 py-0.5 rounded-full min-w-[14px] text-center">
                  {roomCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium">{labels.rooms}</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
