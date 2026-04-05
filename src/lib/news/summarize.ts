import type { RawNewsItem, GeminiNewsSummary } from "@/types/news";
import { getGeminiClient } from "@/lib/gemini/getClient";

const PROMPT_TEMPLATE = `You are a feed writer for "Bishkek Pulse" — a short city update feed inside an anonymous voice chat app for Bishkek.

Your job: transform this news article into a short, punchy feed item that feels like conversation fuel.

Article title: {TITLE}
Article text (truncated):
{BODY}

Rules:
- headline: very short headline IN ENGLISH (max 60 chars), catchy, not clickbait. Must be in English even if the source article is in Russian.
- headlineRu: same headline but IN RUSSIAN
- line1: one short factual sentence about what happened IN ENGLISH (max 120 chars)
- line1Ru: same sentence but IN RUSSIAN
- line2: one conversational sentence that makes people want to discuss it IN ENGLISH (max 120 chars)
- line2Ru: same sentence but IN RUSSIAN
- topicSuggestion: a discussion topic for a voice room IN ENGLISH (max 80 chars)
- topicSuggestionRu: same topic but IN RUSSIAN
- modeSuggestion: pick one of: debate | chill | confessions | business | funny | advice | deep | night

Style:
- Be natural, not robotic
- Don't be sensationalist
- line2 should spark discussion ("what do you think?", "would you...?", etc.)
- Keep it light and social
- If the content is too tragic or sensitive for a social feed, set modeSuggestion to "skip"

Return ONLY valid JSON:
{"headline":"...","headlineRu":"...","line1":"...","line1Ru":"...","line2":"...","line2Ru":"...","topicSuggestion":"...","topicSuggestionRu":"...","modeSuggestion":"..."}`;

export async function summarizeWithGemini(item: RawNewsItem): Promise<GeminiNewsSummary | null> {
  const bodyTruncated = item.bodyText.slice(0, 2000);

  const prompt = PROMPT_TEMPLATE.replace("{TITLE}", item.title).replace("{BODY}", bodyTruncated);

  const genAI = await getGeminiClient();
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  // Extract JSON
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  const parsed = JSON.parse(jsonMatch[0]);

  // Skip if content is too sensitive
  if (parsed.modeSuggestion === "skip") return null;

  // Validate required fields
  const required = [
    "headline",
    "headlineRu",
    "line1",
    "line1Ru",
    "line2",
    "line2Ru",
    "topicSuggestion",
    "topicSuggestionRu",
    "modeSuggestion",
  ];
  for (const key of required) {
    if (typeof parsed[key] !== "string" || !parsed[key]) return null;
  }

  const validModes = [
    "debate",
    "chill",
    "confessions",
    "business",
    "funny",
    "advice",
    "deep",
    "night",
  ];
  if (!validModes.includes(parsed.modeSuggestion)) {
    parsed.modeSuggestion = "chill";
  }

  return parsed as GeminiNewsSummary;
}
