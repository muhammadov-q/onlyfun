"use client";

import { useState } from "react";
import { useI18n } from "@/i18n";

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" />
    </svg>
  );
}

export function CreateModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (topic: string, max: number) => void;
}) {
  const [topic, setTopic] = useState("");
  const [max, setMax] = useState(4);
  const [suggesting, setSuggesting] = useState(false);
  const { t, locale } = useI18n();

  const suggestTopic = async () => {
    setSuggesting(true);
    try {
      const res = await fetch("/api/ai/suggest-topic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lang: locale }),
      });
      const data = await res.json();
      if (data.topic) setTopic(data.topic);
    } catch {
      // silently fail
    }
    setSuggesting(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Mobile: bottom drawer. Desktop: centered card */}
      <div className="w-full sm:max-w-md sm:mx-4 bg-zinc-950 sm:bg-zinc-950 rounded-t-3xl sm:rounded-2xl border-0 sm:border border-white/10 shadow-2xl slide-up sm:animate-in overflow-hidden">

        {/* Drag handle (mobile only) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        <div className="px-5 pt-4 sm:pt-6 pb-2">
          <h2 className="text-white text-lg font-bold tracking-tight">{t("create.title")}</h2>
          <p className="text-white/40 text-sm mt-1">{t("create.subtitle")}</p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (topic.trim().length >= 2) onCreate(topic.trim(), max);
          }}
          className="px-5 pb-6 sm:pb-6 space-y-5 pt-2"
          style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-white/50 text-xs font-medium">{t("create.topicLabel")}</label>
              <button
                type="button"
                onClick={suggestTopic}
                disabled={suggesting}
                className="flex items-center gap-1 text-[11px] font-medium text-violet-400 hover:text-violet-300 disabled:opacity-50 transition-colors"
              >
                <SparkleIcon className={suggesting ? "animate-spin" : ""} />
                {suggesting ? t("ai.suggesting") : t("ai.suggestTopic")}
              </button>
            </div>
            <input
              placeholder={t("create.topicPlaceholder")}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              maxLength={80}
              autoFocus
              className="w-full bg-white/5 text-white px-4 py-3.5 rounded-xl border border-white/10 focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/5 placeholder-white/20 text-sm transition-all"
            />
            <p className="text-white/20 text-[10px] mt-1.5 text-right font-mono">
              {topic.length}/80
            </p>
          </div>

          <div>
            <label className="text-white/50 text-xs font-medium block mb-2">
              {t("create.maxPeople")}
            </label>
            <div className="flex gap-2">
              {[2, 3, 4, 5, 6, 8].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setMax(n)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    max === n
                      ? "bg-white text-black shadow-sm"
                      : "bg-white/5 text-white/40 border border-white/10 hover:text-white hover:border-white/20"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 rounded-xl text-sm bg-white/5 text-white/50 border border-white/10 hover:bg-white/10 transition-all"
            >
              {t("create.cancel")}
            </button>
            <button
              type="submit"
              disabled={topic.trim().length < 2}
              className="flex-1 py-3.5 rounded-xl text-sm font-semibold bg-white text-black disabled:opacity-20 hover:bg-zinc-100 transition-all shadow-sm"
            >
              {t("create.submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
