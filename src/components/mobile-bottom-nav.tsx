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
      className={`fixed bottom-0 left-0 right-0 z-[450] sm:hidden transition-transform duration-300 bg-black/95 backdrop-blur-xl ${
        hidden ? "translate-y-full" : "translate-y-0"
      }`}
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="border-t border-white/10">
        <div className="grid grid-cols-5 items-end">
          {/* Live */}
          <button
            data-tour="mobile-livecam"
            onClick={onLiveTap}
            className="flex flex-col items-center justify-center pt-2 pb-1.5 gap-0.5"
            style={{ touchAction: "manipulation" }}
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
                className={liveCamOpen ? "text-white" : "text-white/40"}
              >
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            </div>
            <span
              className={`text-[10px] font-medium ${liveCamOpen ? "text-white" : "text-white/40"}`}
            >
              {labels.live}
            </span>
          </button>

          {/* Pulse */}
          <button
            data-tour="mobile-pulse"
            onClick={onPulseTap}
            className="flex flex-col items-center justify-center pt-2 pb-1.5 gap-0.5"
            style={{ touchAction: "manipulation" }}
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
              className={pulseOpen ? "text-white" : "text-white/40"}
            >
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            <span
              className={`text-[10px] font-medium ${pulseOpen ? "text-white" : "text-white/40"}`}
            >
              {labels.pulse}
            </span>
          </button>

          {/* Create (center, raised) */}
          <div className="flex flex-col items-center justify-end pb-1.5">
            <button
              data-tour="create-fab"
              onClick={onCreateTap}
              className="w-14 h-14 -mt-5 rounded-full bg-white text-black flex items-center justify-center shadow-2xl active:scale-95 transition-transform ring-4 ring-black/95"
              style={{ touchAction: "manipulation" }}
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
            <span className="text-[10px] font-medium text-white/40 mt-0.5">{labels.create}</span>
          </div>

          {/* Events */}
          <button
            onClick={onEventsTap}
            className="flex flex-col items-center justify-center pt-2 pb-1.5 gap-0.5"
            style={{ touchAction: "manipulation" }}
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
              className={eventsOpen ? "text-white" : "text-white/40"}
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span
              className={`text-[10px] font-medium ${eventsOpen ? "text-white" : "text-white/40"}`}
            >
              {labels.events}
            </span>
          </button>

          {/* Rooms */}
          <button
            data-tour="all-rooms-mobile"
            onClick={onRoomsTap}
            className="flex flex-col items-center justify-center pt-2 pb-1.5 gap-0.5"
            style={{ touchAction: "manipulation" }}
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
                className={roomsOpen ? "text-white" : "text-white/40"}
              >
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
              </svg>
              {roomCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-white/15 text-white/80 text-[8px] font-bold px-1 py-0.5 rounded-full min-w-[14px] text-center">
                  {roomCount}
                </span>
              )}
            </div>
            <span
              className={`text-[10px] font-medium ${roomsOpen ? "text-white" : "text-white/40"}`}
            >
              {labels.rooms}
            </span>
          </button>
        </div>
      </div>
    </nav>
  );
}
