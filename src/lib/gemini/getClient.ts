import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";
import { getSetting, isAiEnabled, getAiModel } from "@/lib/settings";

export async function getGeminiClient(): Promise<GoogleGenerativeAI> {
  const key = (await getSetting("gemini_api_key")) || process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Gemini API key not configured");
  return new GoogleGenerativeAI(key);
}

/**
 * Returns the configured generative model if AI is enabled.
 * Throws if AI is disabled or no API key is set.
 */
export async function getGeminiModel(): Promise<GenerativeModel> {
  const enabled = await isAiEnabled();
  if (!enabled) throw new Error("AI_DISABLED");

  const genAI = await getGeminiClient();
  const modelName = await getAiModel();
  return genAI.getGenerativeModel({ model: modelName });
}
