import { NextResponse } from "next/server";
import { getSetting } from "@/lib/settings";

export async function GET() {
  const key = (await getSetting("google_maps_key")) || process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  if (!key) {
    return NextResponse.json({ error: "Google Maps key not configured" }, { status: 404 });
  }
  return NextResponse.json({ key });
}
