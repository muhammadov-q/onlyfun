import { NextResponse } from "next/server";
import { getOperatingHoursStatus } from "@/lib/operating-hours";

export const revalidate = 0; // no cache

export async function GET() {
  const status = await getOperatingHoursStatus();
  return NextResponse.json(status);
}
