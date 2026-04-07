import { getDb } from "./db";
import { encrypt, decrypt } from "./crypto";

export type SettingKey =
  | "gemini_api_key"
  | "google_maps_key"
  | "ai_enabled"
  | "ai_model"
  | "night_mode_enabled"
  | "operating_start_time"
  | "operating_end_time"
  | "under_construction"
  | "launch_countdown_enabled"
  | "launch_countdown_date"
  | "map_provider";

/** Keys that are stored as plain text (not encrypted) */
const PLAIN_KEYS: SettingKey[] = [
  "ai_enabled",
  "ai_model",
  "night_mode_enabled",
  "operating_start_time",
  "operating_end_time",
  "under_construction",
  "launch_countdown_enabled",
  "launch_countdown_date",
  "map_provider",
];

export async function getSetting(key: SettingKey): Promise<string | null> {
  const sql = getDb();
  const rows = await sql`SELECT value FROM app_settings WHERE key = ${key} LIMIT 1`;
  if (!rows[0]?.value) return null;
  if (PLAIN_KEYS.includes(key)) return rows[0].value;
  try {
    return decrypt(rows[0].value);
  } catch {
    return null;
  }
}

export async function setSetting(key: SettingKey, value: string): Promise<void> {
  const sql = getDb();
  const stored = PLAIN_KEYS.includes(key) ? value : encrypt(value);
  await sql`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (${key}, ${stored}, NOW())
    ON CONFLICT (key) DO UPDATE SET value = ${stored}, updated_at = NOW()
  `;
}

/** Check if AI features are enabled */
export async function isAiEnabled(): Promise<boolean> {
  const value = await getSetting("ai_enabled");
  return value === "true";
}

/** Get the configured AI model (defaults to gemini-2.5-flash) */
export async function getAiModel(): Promise<string> {
  const value = await getSetting("ai_model");
  return value || "gemini-2.5-flash";
}

export async function deleteSetting(key: SettingKey): Promise<void> {
  const sql = getDb();
  await sql`DELETE FROM app_settings WHERE key = ${key}`;
}

/** Get a masked version for display (first 8 chars + ****) */
export function maskKey(value: string): string {
  if (value.length <= 8) return "****";
  return value.slice(0, 8) + "****";
}
