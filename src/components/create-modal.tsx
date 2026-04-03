"use client";

import { useState } from "react";
import { useI18n } from "@/i18n";

export function CreateModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (topic: string, max: number) => void;
}) {
  const [topic, setTopic] = useState("");
  const [max, setMax] = useState(4);
  const { t } = useI18n();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md mx-4 bg-white rounded-2xl border border-zinc-200 shadow-xl animate-in">
        <div className="p-6">
          <h2 className="text-black text-lg font-bold tracking-tight">{t("create.title")}</h2>
          <p className="text-zinc-400 text-sm mt-1">{t("create.subtitle")}</p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (topic.trim().length >= 2) onCreate(topic.trim(), max);
          }}
          className="px-6 pb-6 space-y-5"
        >
          <div>
            <label className="text-zinc-500 text-xs font-medium block mb-2">{t("create.topicLabel")}</label>
            <input
              placeholder={t("create.topicPlaceholder")}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              maxLength={80}
              autoFocus
              className="w-full bg-zinc-50 text-black px-4 py-3.5 rounded-xl border border-zinc-200 focus:outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 placeholder-zinc-300 text-sm transition-all"
            />
            <p className="text-zinc-300 text-[10px] mt-1.5 text-right font-mono">{topic.length}/80</p>
          </div>

          <div>
            <label className="text-zinc-500 text-xs font-medium block mb-2">{t("create.maxPeople")}</label>
            <div className="flex gap-2">
              {[2, 3, 4, 5, 6, 8].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setMax(n)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    max === n
                      ? "bg-black text-white shadow-sm"
                      : "bg-zinc-50 text-zinc-400 border border-zinc-200 hover:text-black hover:border-zinc-300"
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
              className="flex-1 py-3.5 rounded-xl text-sm bg-zinc-50 text-zinc-500 border border-zinc-200 hover:bg-zinc-100 transition-all"
            >
              {t("create.cancel")}
            </button>
            <button
              type="submit"
              disabled={topic.trim().length < 2}
              className="flex-1 py-3.5 rounded-xl text-sm font-semibold bg-black text-white disabled:opacity-20 hover:bg-zinc-800 transition-all shadow-sm"
            >
              {t("create.submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
