import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSetting, setSetting, deleteSetting, maskKey, type SettingKey } from "@/lib/settings";

const VALID_KEYS: SettingKey[] = [
  "gemini_api_key",
  "google_maps_key",
  "ai_enabled",
  "ai_model",
  "map_provider",
];

/** Keys that return their full value (not masked) */
const PLAIN_KEYS: SettingKey[] = ["ai_enabled", "ai_model", "map_provider"];

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings: Record<string, { masked: string; isSet: boolean; value?: string }> = {};

  for (const key of VALID_KEYS) {
    const value = await getSetting(key);
    if (PLAIN_KEYS.includes(key)) {
      settings[key] = { masked: "", isSet: !!value, value: value || "" };
    } else {
      settings[key] = { masked: value ? maskKey(value) : "", isSet: !!value };
    }
  }

  return NextResponse.json({ settings });
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { key, value } = body as { key: string; value: string };

  if (!VALID_KEYS.includes(key as SettingKey)) {
    return NextResponse.json({ error: "Invalid setting key" }, { status: 400 });
  }

  if (!value || !value.trim()) {
    await deleteSetting(key as SettingKey);
    return NextResponse.json({ success: true, isSet: false });
  }

  await setSetting(key as SettingKey, value.trim());
  return NextResponse.json({ success: true, isSet: true, masked: maskKey(value.trim()) });
}
