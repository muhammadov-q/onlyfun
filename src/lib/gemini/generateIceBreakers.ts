import type { RoomModeId } from "@/types/room";
import { ROOM_MODES_MAP } from "@/config/roomModes";
import { getGeminiModel } from "./getClient";

const MODE_TONES: Record<RoomModeId, { en: string; ru: string }> = {
  debate: {
    en: "opinionated, controversial, argumentative — push people to pick a side",
    ru: "спорные, провокационные, аргументированные — заставь людей выбрать сторону",
  },
  chill: {
    en: "easy, relaxed, light — no pressure, just vibes",
    ru: "лёгкие, расслабленные — без напряга, просто общение",
  },
  confessions: {
    en: "personal, honest, vulnerable but safe — invite people to share real stuff",
    ru: "личные, честные, уязвимые но безопасные — пригласи людей поделиться настоящим",
  },
  business: {
    en: "practical, money-oriented, career-focused, idea-driven",
    ru: "практичные, про деньги, карьеру, бизнес-идеи",
  },
  funny: {
    en: "playful, absurd, humorous — make people laugh or say something ridiculous",
    ru: "весёлые, абсурдные, юмористические — заставь людей смеяться",
  },
  advice: {
    en: "helpful, supportive, thoughtful — seek wisdom or share experience",
    ru: "полезные, поддерживающие, вдумчивые — поделись опытом или попроси совет",
  },
  deep: {
    en: "philosophical, emotional, meaningful — make people really think",
    ru: "философские, эмоциональные, глубокие — заставь задуматься",
  },
  night: {
    en: "late-night, random, slightly chaotic — anything goes, unfiltered energy",
    ru: "ночные, рандомные, слегка хаотичные — без фильтров и рамок",
  },
};

export async function generateIceBreakers(
  topic: string,
  mode: RoomModeId,
  lang: "en" | "ru" = "en"
): Promise<string[]> {
  const isRu = lang === "ru";
  const tone = MODE_TONES[mode][lang];
  const modeInfo = ROOM_MODES_MAP[mode];

  const prompt = isRu
    ? `Ты генератор вопросов-айсбрейкеров для анонимной голосовой комнаты.

Тема комнаты: "${topic}"
Режим: ${modeInfo.labelRu} (${modeInfo.descriptionRu})
Тон: ${tone}

Правила:
- Сгенерируй ровно 10 вопросов-айсбрейкеров
- Каждый вопрос ДОЛЖЕН быть напрямую связан с темой "${topic}"
- Тон вопросов должен соответствовать режиму "${modeInfo.labelRu}"
- Никаких дубликатов
- Никаких общих/шаблонных вопросов
- Вопросы должны быть естественными и разговорными
- На простом русском языке
- Подходят для взрослых в анонимной голосовой комнате
- Максимум 100 символов на вопрос

Верни ТОЛЬКО валидный JSON в формате:
{"questions":["вопрос 1","вопрос 2","вопрос 3","вопрос 4","вопрос 5","вопрос 6","вопрос 7","вопрос 8","вопрос 9","вопрос 10"]}`
    : `You are an ice-breaker question generator for an anonymous voice chat room.

Room topic: "${topic}"
Mode: ${modeInfo.label} (${modeInfo.description})
Tone: ${tone}

Rules:
- Generate exactly 10 ice-breaker questions
- Every question MUST be directly related to the topic "${topic}"
- Tone must match the "${modeInfo.label}" mode
- No duplicates
- No generic filler questions
- Keep questions natural and conversational
- Suitable for adults in a casual anonymous voice room
- Max 100 characters per question

Return ONLY valid JSON in this format:
{"questions":["question 1","question 2","question 3","question 4","question 5","question 6","question 7","question 8","question 9","question 10"]}`;

  const model = await getGeminiModel();
  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  // Extract JSON from response (handle markdown code blocks)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in response");

  const parsed = JSON.parse(jsonMatch[0]);

  if (
    !parsed.questions ||
    !Array.isArray(parsed.questions) ||
    parsed.questions.length !== 10 ||
    !parsed.questions.every((q: unknown) => typeof q === "string" && q.length > 0)
  ) {
    throw new Error("Invalid response structure");
  }

  return parsed.questions as string[];
}
