import type { RawNewsItem, RelevanceResult } from "@/types/news";

// Keywords that strongly indicate Bishkek / local relevance
const POSITIVE_KEYWORDS = [
  "бишкек",
  "бишкеке",
  "бишкека",
  "бишкекчан",
  "столиц",
  "улица",
  "дорога",
  "транспорт",
  "автобус",
  "троллейбус",
  "маршрутка",
  "вода",
  "свет",
  "электричеств",
  "отключени",
  "концерт",
  "кафе",
  "ресторан",
  "парк",
  "площадь",
  "мэрия",
  "мэр",
  "район",
  "микрорайон",
  "базар",
  "рынок",
  "ала-тоо",
  "ала-арча",
  "филармони",
  "аэропорт",
  "манас",
  "ТЭЦ",
  "тариф",
  "ЖКХ",
  "горожан",
  "жител",
  "горводоканал",
  "бишкекглавархитектур",
  "пробк",
  "авария",
  "ДТП",
  "светофор",
  "пешеход",
  "велосипед",
  "погода",
  "температур",
  "дождь",
  "снег",
  "жара",
  "мероприяти",
  "фестивал",
  "открыти",
  "строительств",
  "ремонт",
  "благоустройств",
];

// Keywords that indicate content we want to deprioritize
const NEGATIVE_KEYWORDS = [
  "война",
  "убийств",
  "терроризм",
  "теракт",
  "смерть",
  "погиб",
  "расстрел",
  "взрыв",
  "боевик",
  "украин",
  "россия и нато",
  "сирия",
  "ближний восток",
  "палестин",
  "израил",
  "трамп",
  "байден",
  "пентагон",
  "нато",
];

// Category keywords that indicate Bishkek-local content
const LOCAL_CATEGORIES = ["бишкек", "город", "общество", "происшествия", "транспорт"];

const MIN_SCORE = 2;

export function filterRelevantItems(
  items: RawNewsItem[],
  maxItems: number = 10
): RelevanceResult[] {
  const scored: RelevanceResult[] = [];

  for (const item of items) {
    const text = `${item.title} ${item.bodyText} ${item.category ?? ""}`.toLowerCase();
    let score = 0;
    const matched: string[] = [];

    // Check positive keywords
    for (const kw of POSITIVE_KEYWORDS) {
      if (text.includes(kw.toLowerCase())) {
        score += 2;
        matched.push(kw);
      }
    }

    // Bonus for local categories
    if (item.category) {
      const catLower = item.category.toLowerCase();
      for (const cat of LOCAL_CATEGORIES) {
        if (catLower.includes(cat)) {
          score += 3;
          matched.push(`category:${cat}`);
        }
      }
    }

    // Penalize negative keywords
    for (const kw of NEGATIVE_KEYWORDS) {
      if (text.includes(kw.toLowerCase())) {
        score -= 3;
      }
    }

    if (score >= MIN_SCORE) {
      scored.push({ item, score, matched });
    }
  }

  // Sort by score descending, take top N
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxItems);
}
