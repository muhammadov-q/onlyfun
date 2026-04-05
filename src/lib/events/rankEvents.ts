import type { RawEventItem, SidebarEventItem } from "@/types/events";
import type { RoomModeId } from "@/types/room";

const ITICKET_BASE = "https://iticket.kg";

// Categories that score highest for a nightlife/social app
const CATEGORY_SCORES: Record<string, number> = {
  concerts: 10,
  concert: 10,
  "stand-up": 9,
  standup: 9,
  festivals: 8,
  festival: 8,
  parties: 8,
  party: 8,
  nightlife: 10,
  club: 9,
  dj: 9,
  theatre: 5,
  theater: 5,
  sport: 4,
  cinema: 3,
  kids: 1,
  children: 1,
};

// Keywords in title that boost score
const SOCIAL_KEYWORDS = [
  "concert",
  "концерт",
  "stand-up",
  "стендап",
  "festival",
  "фестиваль",
  "party",
  "вечеринка",
  "dj",
  "диджей",
  "live",
  "night",
  "ночь",
  "club",
  "клуб",
  "show",
  "шоу",
  "comedy",
  "комедия",
];

const BISHKEK_KEYWORDS = ["bishkek", "бишкек", "филармония", "philharmonic", "ala-too", "ала-тоо"];

// Mode mapping by category/keyword
const CATEGORY_MODE_MAP: Record<string, RoomModeId> = {
  concerts: "chill",
  concert: "chill",
  "stand-up": "funny",
  standup: "funny",
  comedy: "funny",
  festivals: "chill",
  festival: "chill",
  parties: "night",
  party: "night",
  nightlife: "night",
  club: "night",
  dj: "night",
  theatre: "deep",
  theater: "deep",
  sport: "debate",
  cinema: "chill",
};

// Topic templates per category
const TOPIC_TEMPLATES: Record<string, { en: string; ru: string }> = {
  concerts: {
    en: "Tonight's concert: {title}",
    ru: "Концерт сегодня: {title}",
  },
  concert: {
    en: "Tonight's concert: {title}",
    ru: "Концерт сегодня: {title}",
  },
  "stand-up": {
    en: "Stand-up in Bishkek: {title}",
    ru: "Стендап в Бишкеке: {title}",
  },
  standup: {
    en: "Stand-up in Bishkek: {title}",
    ru: "Стендап в Бишкеке: {title}",
  },
  festivals: {
    en: "Festival in Bishkek: {title}",
    ru: "Фестиваль в Бишкеке: {title}",
  },
  festival: {
    en: "Festival in Bishkek: {title}",
    ru: "Фестиваль в Бишкеке: {title}",
  },
  parties: {
    en: "Party tonight: {title}",
    ru: "Вечеринка сегодня: {title}",
  },
  party: {
    en: "Party tonight: {title}",
    ru: "Вечеринка сегодня: {title}",
  },
  sport: {
    en: "Sports event: {title}",
    ru: "Спортивное событие: {title}",
  },
  default: {
    en: "Event in Bishkek: {title}",
    ru: "Событие в Бишкеке: {title}",
  },
};

export function rankAndTransformEvents(
  rawEvents: RawEventItem[],
  maxItems: number = 8
): SidebarEventItem[] {
  // Filter out events with no title
  const valid = rawEvents.filter((e) => e.title && e.title.trim().length > 0);

  // Deduplicate by title (normalized)
  const seen = new Set<string>();
  const unique = valid.filter((e) => {
    const key = e.title.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Score each event
  const scored = unique.map((event) => ({
    event,
    score: scoreEvent(event),
  }));

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Take top N and transform
  return scored.slice(0, maxItems).map(({ event }) => transformEvent(event));
}

function scoreEvent(event: RawEventItem): number {
  let score = 0;
  const titleLower = event.title.toLowerCase();
  const catSlug = event.categorySlug?.toLowerCase() || "";
  const catName = event.category?.toLowerCase() || "";

  // Category score
  const catScore = CATEGORY_SCORES[catSlug] ?? CATEGORY_SCORES[catName] ?? 3; // Default base score
  score += catScore;

  // Social keyword bonus
  for (const kw of SOCIAL_KEYWORDS) {
    if (titleLower.includes(kw)) {
      score += 3;
      break;
    }
  }

  // Bishkek relevance bonus
  const allText = `${titleLower} ${event.venue?.toLowerCase() || ""} ${event.city?.toLowerCase() || ""}`;
  for (const kw of BISHKEK_KEYWORDS) {
    if (allText.includes(kw)) {
      score += 4;
      break;
    }
  }

  // Default city is Bishkek for iticket.kg — small bonus
  if (
    !event.city ||
    event.city.toLowerCase().includes("bishkek") ||
    event.city.toLowerCase().includes("бишкек")
  ) {
    score += 2;
  }

  // Completeness bonus
  if (event.imageUrl) score += 1;
  if (event.venue) score += 1;
  if (event.dateText) score += 1;
  if (event.url) score += 1;

  // Price info bonus
  if (event.minPrice != null) score += 1;

  return score;
}

function formatEventDateRu(startIso: string, endIso?: string): string {
  try {
    const start = new Date(startIso);
    if (isNaN(start.getTime())) return startIso;

    const tz = "Asia/Bishkek";

    const dayName = start.toLocaleDateString("ru-RU", {
      weekday: "short",
      timeZone: tz,
    });
    const day = start.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "2-digit",
      year: "numeric",
      timeZone: tz,
    });

    const startTime = start.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: tz,
    });

    let result = `${dayName} ${day} ${startTime}`;

    if (endIso) {
      const end = new Date(endIso);
      if (!isNaN(end.getTime())) {
        const endTime = end.toLocaleTimeString("ru-RU", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: tz,
        });
        result += ` – ${endTime}`;
      }
    }

    return result;
  } catch {
    return startIso;
  }
}

function transformEvent(event: RawEventItem): SidebarEventItem {
  const catSlug = event.categorySlug?.toLowerCase() || "";
  const catName = event.category?.toLowerCase() || "";

  // Determine mode
  const mode: RoomModeId =
    CATEGORY_MODE_MAP[catSlug] ?? CATEGORY_MODE_MAP[catName] ?? inferModeFromTitle(event.title);

  // Generate topic suggestion
  const template = TOPIC_TEMPLATES[catSlug] ?? TOPIC_TEMPLATES[catName] ?? TOPIC_TEMPLATES.default;

  const shortTitle = event.title.length > 40 ? event.title.slice(0, 37) + "..." : event.title;

  const topicSuggestion = template.en.replace("{title}", shortTitle);
  const topicSuggestionRu = template.ru.replace("{title}", shortTitle);

  // Build source URL
  const sourceUrl =
    event.url ||
    (event.slug
      ? catSlug
        ? `${ITICKET_BASE}/en/events/${catSlug}/${event.slug}`
        : `${ITICKET_BASE}/en/events/${event.slug}`
      : undefined) ||
    `${ITICKET_BASE}/en/events`;

  // Generate stable ID
  const id = `iticket-${event.slug || hashString(event.title)}`;

  // Build price text from structured data or pre-built price string
  const price = event.price || formatPrice(event.minPrice, event.maxPrice);
  const priceRu =
    formatPriceRu(event.minPrice, event.maxPrice) ||
    (price ? price.replace(/^from /, "от ") : undefined);

  // Build Russian date text from raw ISO dates
  const dateTextRu = event.startDate
    ? formatEventDateRu(event.startDate, event.endDate)
    : event.dateText;

  return {
    id,
    source: "iticket",
    title: event.title,
    sourceUrl,
    price,
    priceRu,
    dateText: event.dateText,
    dateTextRu,
    venue: event.venue,
    category: event.category,
    topicSuggestion,
    topicSuggestionRu,
    modeSuggestion: mode,
  };
}

function formatPrice(min?: number, max?: number): string | undefined {
  if (min == null && max == null) return undefined;
  if (min != null && max != null && min !== max) {
    return `${min} – ${max} KGS`;
  }
  return `${min ?? max} KGS`;
}

function formatPriceRu(min?: number, max?: number): string | undefined {
  if (min == null && max == null) return undefined;
  if (min != null && max != null && min !== max) {
    return `${min} – ${max} сом`;
  }
  if (min != null) {
    return `от ${min} сом`;
  }
  return `${max} сом`;
}

function inferModeFromTitle(title: string): RoomModeId {
  const lower = title.toLowerCase();
  if (lower.includes("stand-up") || lower.includes("comedy") || lower.includes("стендап"))
    return "funny";
  if (lower.includes("concert") || lower.includes("концерт")) return "chill";
  if (lower.includes("party") || lower.includes("вечеринка") || lower.includes("dj"))
    return "night";
  if (lower.includes("festival") || lower.includes("фестиваль")) return "chill";
  if (lower.includes("theatre") || lower.includes("театр")) return "deep";
  return "chill";
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash).toString(36);
}
