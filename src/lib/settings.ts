import { getDb } from "./db";
import { encrypt, decrypt } from "./crypto";

export type SettingKey = "gemini_api_key" | "google_maps_key";

export async function getSetting(key: SettingKey): Promise<string | null> {
  const sql = getDb();
  const rows = await sql`SELECT value FROM app_settings WHERE key = ${key} LIMIT 1`;
  if (!rows[0]?.value) return null;
  try {
    return decrypt(rows[0].value);
  } catch {
    return null;
  }
}

export async function setSetting(key: SettingKey, value: string): Promise<void> {
  const sql = getDb();
  const encrypted = encrypt(value);
  await sql`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (${key}, ${encrypted}, NOW())
    ON CONFLICT (key) DO UPDATE SET value = ${encrypted}, updated_at = NOW()
  `;
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
