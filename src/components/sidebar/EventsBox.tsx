"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useI18n } from "@/i18n";
import type { SidebarEventItem } from "@/types/events";
import type { RoomModeId } from "@/types/room";
import type { Room } from "@/components/use-party";

function ExternalLinkIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="inline-block ml-0.5 opacity-40"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function EventCard({
  item,
  isRu,
  tp,
  onTalkAbout,
  existingRoom,
  onJoinRoom,
}: {
  item: SidebarEventItem;
  isRu: boolean;
  tp: (key: string) => string;
  onTalkAbout: (topic: string, mode: RoomModeId) => void;
  existingRoom: Room | undefined;
  onJoinRoom: (roomId: string) => void;
}) {
  const topic = isRu ? item.topicSuggestionRu : item.topicSuggestion;

  return (
    <div className="snap-start shrink-0 h-full bg-white/[0.12] border border-white/[0.12] rounded-xl overflow-hidden">
      <div className="p-3">
        {/* Title */}
        <div className="mb-1.5">
          <h4 className="text-xs font-semibold text-white/90 leading-tight line-clamp-2">
            {item.title}
          </h4>
        </div>

        {/* Date */}
        {(item.dateText || item.dateTextRu) && (
          <div className="flex items-center gap-1 text-[10px] text-white/40 mb-1">
            <svg
              width="9"
              height="9"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-50 shrink-0"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {isRu ? item.dateTextRu || item.dateText : item.dateText}
          </div>
        )}

        {/* Venue */}
        {item.venue && (
          <div className="flex items-center gap-1 text-[10px] text-white/45 mb-1">
            <svg
              width="9"
              height="9"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-50 shrink-0"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span className="truncate">{item.venue}</span>
          </div>
        )}

        {/* Price */}
        {(item.price || item.priceRu) && (
          <div className="flex items-center gap-1 text-[10px] text-purple-300/70 font-medium">
            <svg
              width="9"
              height="9"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-60 shrink-0"
            >
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            {isRu ? item.priceRu || item.price : item.price}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.04]">
          <a
            href={item.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[9px] text-white/25 hover:text-white/40 transition-colors uppercase tracking-wider"
          >
            {tp("events.viewEvent")}
            <ExternalLinkIcon />
          </a>
          {existingRoom ? (
            <button
              onClick={() => onJoinRoom(existingRoom.id)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-500/15 hover:bg-green-500/25 text-green-300/80 hover:text-green-200 text-[10px] font-medium transition-all active:scale-95 ml-auto"
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              {tp("events.join")}
              <span className="text-green-400/60">({existingRoom.people.length})</span>
            </button>
          ) : (
            <button
              onClick={() => onTalkAbout(topic, item.modeSuggestion)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300/80 hover:text-purple-200 text-[10px] font-medium transition-all active:scale-95 ml-auto"
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              {tp("events.talk")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function EventsBox({
  onTalkAbout,
  rooms,
  onJoinRoom,
}: {
  onTalkAbout: (topic: string, mode: RoomModeId) => void;
  rooms: Room[];
  onJoinRoom: (roomId: string) => void;
}) {
  const { t, locale } = useI18n();
  const [items, setItems] = useState<SidebarEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(0);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      const res = await fetch("/api/events/feed");
      const data = await res.json();
      if (data.items && Array.isArray(data.items)) {
        setItems(data.items);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Auto-scroll to next card every 10s
  const count = items.length;
  useEffect(() => {
    if (count <= 1) return;
    const id = setInterval(() => {
      const el = scrollRef.current;
      if (!el) return;
      activeRef.current = (activeRef.current + 1) % count;
      const card = el.children[activeRef.current] as HTMLElement | undefined;
      if (card) {
        el.scrollTo({ top: card.offsetTop - el.offsetTop, behavior: "smooth" });
      }
    }, 10000);
    return () => clearInterval(id);
  }, [count]);

  const isRu = locale === "ru";
  const tp = (key: string) => t(key as Parameters<typeof t>[0]);

  if (loading) {
    return (
      <div className="bg-white/5 rounded-xl p-3 animate-pulse">
        <div className="h-3 bg-white/10 rounded w-3/4 mb-2" />
        <div className="h-2.5 bg-white/5 rounded w-full mb-1.5" />
        <div className="h-2.5 bg-white/5 rounded w-4/6" />
      </div>
    );
  }

  if (error || items.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-white/30 text-xs">{error ? tp("events.error") : tp("events.empty")}</p>
        {error && (
          <button
            onClick={fetchEvents}
            className="text-xs text-purple-400/70 hover:text-purple-400 mt-2 transition-colors"
          >
            {tp("events.retry")}
          </button>
        )}
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex flex-col gap-2 overflow-y-auto snap-y snap-mandatory h-[160px] hide-scrollbar">
      {items.map((item) => {
        const topic = isRu ? item.topicSuggestionRu : item.topicSuggestion;
        const existingRoom = rooms.find((r) => r.topic === topic);
        return (
          <EventCard
            key={item.id}
            item={item}
            isRu={isRu}
            tp={tp}
            onTalkAbout={onTalkAbout}
            existingRoom={existingRoom}
            onJoinRoom={onJoinRoom}
          />
        );
      })}
    </div>
  );
}
