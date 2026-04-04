import type { RawNewsItem, GeminiNewsSummary } from "@/types/news";
import type { RoomModeId } from "@/types/room";

const CATEGORY_MODE_MAP: Record<string, RoomModeId> = {
  город: "chill",
  бишкек: "chill",
  общество: "debate",
  политика: "debate",
  экономика: "business",
  происшествия: "deep",
  спорт: "funny",
  культура: "chill",
  транспорт: "advice",
};

function inferMode(item: RawNewsItem): RoomModeId {
  const catLower = (item.category ?? "").toLowerCase();
  for (const [key, mode] of Object.entries(CATEGORY_MODE_MAP)) {
    if (catLower.includes(key)) return mode;
  }
  return "chill";
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + "\u2026";
}

export function fallbackSummarize(item: RawNewsItem): GeminiNewsSummary {
  const headline = truncate(item.title, 60);
  const firstSentence = item.bodyText.split(/[.!?]\s/)[0]?.trim() || item.title;
  const line1 = truncate(firstSentence, 120);
  const line2 = "What do you think about this?";
  const line2Ru =
    "\u0427\u0442\u043E \u0434\u0443\u043C\u0430\u0435\u0442\u0435 \u043F\u043E \u044D\u0442\u043E\u043C\u0443 \u043F\u043E\u0432\u043E\u0434\u0443?";

  return {
    headline,
    headlineRu: headline,
    line1,
    line1Ru: line1,
    line2,
    line2Ru: line2Ru,
    topicSuggestion: truncate(item.title, 80),
    topicSuggestionRu: truncate(item.title, 80),
    modeSuggestion: inferMode(item),
  };
}
