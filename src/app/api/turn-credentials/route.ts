import { NextResponse } from "next/server";

const TURN_KEY_ID = process.env.CLOUDFLARE_TURN_KEY_ID;
const TURN_API_TOKEN = process.env.CLOUDFLARE_TURN_API_TOKEN;
const TTL = 86400; // 24 hours

export async function GET() {
  if (!TURN_KEY_ID || !TURN_API_TOKEN) {
    // Fallback: return basic STUN-only config
    return NextResponse.json({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });
  }

  try {
    const res = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${TURN_KEY_ID}/credentials/generate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TURN_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ttl: TTL }),
      }
    );

    if (!res.ok) {
      console.error("[turn] Cloudflare API error:", res.status, await res.text());
      return NextResponse.json(
        {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
          ],
        },
        { status: 200 }
      );
    }

    const data = await res.json();

    // Cloudflare returns { iceServers: { urls: [...], username, credential } }
    // We need to add STUN servers too
    return NextResponse.json({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        data.iceServers,
      ],
    });
  } catch (err) {
    console.error("[turn] Failed to fetch TURN credentials:", err);
    return NextResponse.json(
      {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      },
      { status: 200 }
    );
  }
}
