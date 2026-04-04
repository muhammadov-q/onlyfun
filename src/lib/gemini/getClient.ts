import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSetting } from "@/lib/settings";

export async function getGeminiClient(): Promise<GoogleGenerativeAI> {
  const key = (await getSetting("gemini_api_key")) || process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Gemini API key not configured");
  return new GoogleGenerativeAI(key);
}
