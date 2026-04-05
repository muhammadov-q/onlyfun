"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useI18n } from "@/i18n";
import type { FeedItem } from "@/types/news";
import type { RoomModeId } from "@/types/room";
import type { Room } from "@/components/use-party";
import { ROOM_MODES_MAP } from "@/config/roomModes";

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

function NewsCard({
  item,
  isRu,
  tp,
  onTalkAbout,
  existingRoom,
  onJoinRoom,
}: {
  item: FeedItem;
  isRu: boolean;
  tp: (key: string) => string;
  onTalkAbout: (topic: string, mode: RoomModeId) => void;
  existingRoom: Room | undefined;
  onJoinRoom: (roomId: string) => void;
}) {
  const headline = isRu ? item.headlineRu : item.headline;
  const line1 = isRu ? item.line1Ru : item.line1;
  const line2 = isRu ? item.line2Ru : item.line2;
  const topic = isRu ? item.topicSuggestionRu : item.topicSuggestion;
  const mode = ROOM_MODES_MAP[item.modeSuggestion];

  return (
    <div className="snap-start shrink-0 h-full bg-white/[0.12] border border-white/[0.12] rounded-xl p-3">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h4 className="text-xs font-semibold text-white/90 leading-tight">{headline}</h4>
        {mode && (
          <span className="shrink-0 text-sm leading-none" title={isRu ? mode.labelRu : mode.label}>
            {mode.emoji}
          </span>
        )}
      </div>
      <p className="text-[11px] text-white/50 leading-relaxed mb-1">{line1}</p>
      <p className="text-[11px] text-purple-300/60 leading-relaxed italic">{line2}</p>
      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-white/[0.04]">
        <a
          href={item.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[9px] text-white/25 hover:text-white/40 transition-colors uppercase tracking-wider"
        >
          {tp("pulse.source")}
          <ExternalLinkIcon />
        </a>
        {existingRoom ? (
          <button
            onClick={() => onJoinRoom(existingRoom.id)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-500/15 hover:bg-green-500/25 text-green-300/80 hover:text-green-200 text-[10px] font-medium transition-all active:scale-95"
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
            {tp("pulse.join")}
            <span className="text-green-400/60">({existingRoom.people.length})</span>
          </button>
        ) : (
          <button
            onClick={() => onTalkAbout(topic, item.modeSuggestion)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300/80 hover:text-purple-200 text-[10px] font-medium transition-all active:scale-95"
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
            {tp("pulse.talk")}
          </button>
        )}
      </div>
    </div>
  );
}

export function BishkekPulseFeed({
  onTalkAbout,
  rooms,
  onJoinRoom,
}: {
  onTalkAbout: (topic: string, mode: RoomModeId) => void;
  rooms: Room[];
  onJoinRoom: (roomId: string) => void;
}) {
  const { t, locale } = useI18n();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(0);

  const fetchFeed = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      const res = await fetch("/api/news/feed");
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
    fetchFeed();
  }, [fetchFeed]);

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
        <div className="h-2.5 bg-white/5 rounded w-5/6 mb-1.5" />
        <div className="h-2.5 bg-white/5 rounded w-4/6" />
      </div>
    );
  }

  if (error || items.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-white/30 text-xs">{error ? tp("pulse.error") : tp("pulse.empty")}</p>
        {error && (
          <button
            onClick={fetchFeed}
            className="text-xs text-purple-400/70 hover:text-purple-400 mt-2 transition-colors"
          >
            {tp("pulse.retry")}
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="flex flex-col gap-2 overflow-y-auto snap-y snap-mandatory h-[200px] hide-scrollbar"
    >
      {items.map((item) => {
        const topic = isRu ? item.topicSuggestionRu : item.topicSuggestion;
        const existingRoom = rooms.find((r) => r.topic === topic);
        return (
          <NewsCard
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

export { ExternalLinkIcon as PulseIcon };
