import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { neon } from "@neondatabase/serverless";

// Load .env.local if it exists (Next.js doesn't share env with the WS server)
const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*"?(.*?)"?\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2];
    }
  }
}

type Room = {
  id: string;
  hostId: string;
  hostName: string;
  topic: string;
  mode: string;
  maxPeople: number;
  people: { id: string; name: string }[];
  color: string;
  lat: number;
  lng: number;
  createdAt: number;
  banned: Map<string, number>; // name -> ban expiry timestamp
  lang: string;
  iceBreakers: string[];
  currentQuestion: number;
};

const COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#ec4899",
  "#f43f5e",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
];

const FAKE_NAMES = [
  "Aida",
  "Timur",
  "Mila",
  "daniyar",
  "alex",
  "Нурай",
  "Bekzat",
  "Камила",
  "Arsen",
  "max",
  "Zarina",
  "Эрмек",
  "Aliya",
  "Sasha",
  "Айдана",
  "Ruslan",
  "Dina",
  "Azamat",
  "Nika",
  "Askar",
  "Лера",
  "Марат",
  "Анара",
  "Damir",
  "Elina",
  "Talgat",
  "Asel",
  "Beka",
  "Kira",
  "Sultan",
];

const SEED_TOPICS = [
  "кто смотрел Dune 2?",
  "late night coding vibes 🎧",
  "переезд в Бишкек — советы?",
  "startup ideas, no judgement",
  "музыка на вечер 🎵",
  "кто играет в Valorant?",
  "лучшие кафе в центре ☕",
  "AI hype — реально или нет?",
  "планы на выходные 🌄",
  "учим английский вместе",
  "кто тут фрилансер?",
  "обсуждаем новый альбом 🎶",
  "горы или море? 🏔️🌊",
  "ночной рандом чат",
  "книги, которые изменили жизнь 📚",
];

const SEED_ONLINE_OFFSET = 17;

// Bishkek bounds
const LAT_MIN = 42.83,
  LAT_MAX = 42.92;
const LNG_MIN = 74.5,
  LNG_MAX = 74.7;

// Minimum distance between rooms (degrees) — ~300m apart
const MIN_DIST = 0.003;

function tooClose(lat: number, lng: number, existingRooms: Room[]): boolean {
  for (const r of existingRooms) {
    const dlat = lat - r.lat;
    const dlng = lng - r.lng;
    if (Math.sqrt(dlat * dlat + dlng * dlng) < MIN_DIST) return true;
  }
  return false;
}

function randomLatLng(): { lat: number; lng: number } {
  return {
    lat: LAT_MIN + Math.random() * (LAT_MAX - LAT_MIN),
    lng: LNG_MIN + Math.random() * (LNG_MAX - LNG_MIN),
  };
}

function findFreePosition(existingRooms: Room[]): { lat: number; lng: number } {
  for (let i = 0; i < 50; i++) {
    const pos = randomLatLng();
    if (!tooClose(pos.lat, pos.lng, existingRooms)) return pos;
  }
  return randomLatLng();
}

function findFreeNear(
  lat: number,
  lng: number,
  existingRooms: Room[]
): { lat: number; lng: number } {
  if (!tooClose(lat, lng, existingRooms)) return { lat, lng };
  for (let radius = 1; radius <= 8; radius++) {
    const d = MIN_DIST * radius;
    const candidates = [
      { lat: lat + d, lng },
      { lat: lat - d, lng },
      { lat, lng: lng + d },
      { lat, lng: lng - d },
      { lat: lat + d, lng: lng + d },
      { lat: lat - d, lng: lng - d },
    ];
    for (const c of candidates) {
      if (!tooClose(c.lat, c.lng, existingRooms)) return c;
    }
  }
  return { lat, lng };
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function makeSeedRoom(): Room {
  const maxPeople = pickRandom([3, 4, 5, 6]);
  const topic = pickRandom(SEED_TOPICS);
  const host = pickRandom(FAKE_NAMES);

  const usedNames = new Set<string>([host]);
  const people: { id: string; name: string }[] = [
    { id: `_seed_${crypto.randomUUID().slice(0, 8)}`, name: host },
  ];
  while (people.length < maxPeople) {
    const name = pickRandom(FAKE_NAMES);
    if (usedNames.has(name)) continue;
    usedNames.add(name);
    people.push({ id: `_seed_${crypto.randomUUID().slice(0, 8)}`, name });
  }

  const { lat, lng } = findFreePosition([...rooms.values()]);

  return {
    id: crypto.randomUUID(),
    hostId: people[0].id,
    hostName: host,
    topic,
    mode: pickRandom([
      "debate",
      "chill",
      "confessions",
      "business",
      "funny",
      "advice",
      "deep",
      "night",
    ]),
    maxPeople,
    people,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    lat,
    lng,
    createdAt: Date.now() - Math.floor(Math.random() * 7200000),
    banned: new Map(),
    lang: "en",
    iceBreakers: [],
    currentQuestion: 0,
  };
}

// --- State ---
const rooms = new Map<string, Room>();
const seedRoomIds = new Set<string>();
const users = new Map<
  string,
  { ws: WebSocket; name: string; roomId: string | null; ip: string; deviceId: string | null }
>();
const previewers = new Map<string, { roomId: string; timeout: NodeJS.Timeout }>();
// Server-side preview cooldown: keyed by "deviceId|roomId" → expiry timestamp
// deviceId is required — each device gets its own cooldown even on shared WiFi
const previewCooldowns = new Map<string, number>();
const PREVIEW_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes per room

function getPreviewKey(user: { ip: string; deviceId: string | null }, roomId: string): string {
  // Always prefer deviceId so two phones on the same WiFi get separate cooldowns
  if (user.deviceId) return `${user.deviceId}|${roomId}`;
  // Fallback to IP only if no deviceId (shouldn't normally happen)
  return `${user.ip}|${roomId}`;
}

function isPreviewOnCooldown(
  user: { ip: string; deviceId: string | null },
  roomId: string
): number {
  const key = getPreviewKey(user, roomId);
  const expiry = previewCooldowns.get(key);
  if (!expiry) return 0;
  const remaining = expiry - Date.now();
  if (remaining <= 0) {
    previewCooldowns.delete(key);
    return 0;
  }
  return remaining;
}

function setPreviewCooldown(user: { ip: string; deviceId: string | null }, roomId: string) {
  const key = getPreviewKey(user, roomId);
  previewCooldowns.set(key, Date.now() + PREVIEW_COOLDOWN_MS);
}

// Periodically clean up expired cooldowns
setInterval(() => {
  const now = Date.now();
  for (const [key, expiry] of previewCooldowns) {
    if (expiry < now) previewCooldowns.delete(key);
  }
}, 60_000);
let colorIdx = 0;

const SEED_COUNT = 50;
for (let i = 0; i < SEED_COUNT; i++) {
  const room = makeSeedRoom();
  rooms.set(room.id, room);
  seedRoomIds.add(room.id);
}
colorIdx = SEED_COUNT;

function shuffleSeeds() {
  const ids = [...seedRoomIds];
  if (ids.length > 0) {
    const removeId = pickRandom(ids);
    rooms.delete(removeId);
    seedRoomIds.delete(removeId);
    broadcastRoomRemove(removeId);
  }
  while (seedRoomIds.size < SEED_COUNT) {
    const newRoom = makeSeedRoom();
    rooms.set(newRoom.id, newRoom);
    seedRoomIds.add(newRoom.id);
    broadcastRoomUpsert(newRoom);
  }
  setTimeout(shuffleSeeds, 20000 + Math.random() * 20000);
}

setTimeout(shuffleSeeds, 15000 + Math.random() * 15000);

// --- Helpers ---
function broadcastAll(msg: object) {
  const data = JSON.stringify(msg);
  for (const [, user] of users) {
    if (user.ws.readyState === WebSocket.OPEN) user.ws.send(data);
  }
}

function serializeRoom(room: Room) {
  const { banned, ...rest } = room;
  return rest;
}

function serializeRooms() {
  return [...rooms.values()].map(({ banned, ...rest }) => rest);
}

/** Send a single room add/update to all clients (instead of the full list) */
function broadcastRoomUpsert(room: Room) {
  broadcastAll({ type: "room-upsert", room: serializeRoom(room) });
}

/** Notify all clients that a room was removed */
function broadcastRoomRemove(roomId: string) {
  broadcastAll({ type: "room-remove", roomId });
}

// --- Block check via DB ---
async function checkBlocked(ip: string): Promise<{ minutes: number } | null> {
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) return null;
    const sql = neon(dbUrl);
    const rows = await sql`
      SELECT blocked_until FROM blocked_users
      WHERE ip = ${ip} AND blocked_until > NOW()
      ORDER BY blocked_until DESC LIMIT 1
    `;
    if (!rows[0]) return null;
    const until = new Date(rows[0].blocked_until).getTime();
    const minutes = Math.max(1, Math.ceil((until - Date.now()) / 60000));
    return { minutes };
  } catch {
    return null;
  }
}

// --- Device / IP → Name lock via DB ---
async function getLockedName(ip: string, deviceId?: string | null): Promise<string | null> {
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      console.log("[name-lock] No DATABASE_URL");
      return null;
    }
    const sql = neon(dbUrl);
    // Prefer device_id lookup (per-browser, no shared-network collision)
    if (deviceId) {
      const rows = await sql`SELECT name FROM user_names WHERE device_id = ${deviceId} LIMIT 1`;
      if (rows[0]?.name) {
        console.log(`[name-lock] lookup did=${deviceId} => ${rows[0].name}`);
        return rows[0].name;
      }
    }
    // Fall back to IP (legacy entries without device_id)
    const rows = await sql`SELECT name FROM user_names WHERE ip = ${ip} LIMIT 1`;
    console.log(`[name-lock] lookup ip=${ip} => ${rows[0]?.name ?? "(none)"}`);
    return rows[0]?.name ?? null;
  } catch (e) {
    console.error("[name-lock] getLockedName error:", e);
    return null;
  }
}

async function saveNameLock(ip: string, name: string, deviceId?: string | null): Promise<void> {
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      console.log("[name-lock] No DATABASE_URL");
      return;
    }
    const sql = neon(dbUrl);
    if (deviceId) {
      // Use device_id as unique key (one name per browser)
      await sql`
        INSERT INTO user_names (ip, name, device_id)
        VALUES (${ip}, ${name}, ${deviceId})
        ON CONFLICT (device_id) DO UPDATE SET name = ${name}, ip = ${ip}, updated_at = NOW()
      `;
    } else {
      // Legacy fallback (no device_id): just insert, skip if IP already exists
      const existing = await sql`SELECT id FROM user_names WHERE ip = ${ip} LIMIT 1`;
      if (!existing.length) {
        await sql`INSERT INTO user_names (ip, name) VALUES (${ip}, ${name})`;
      }
    }
    console.log(`[name-lock] saved ip=${ip} did=${deviceId ?? "(none)"} => name=${name}`);
  } catch (e) {
    console.error("[name-lock] saveNameLock error:", e);
  }
}

// --- Decrypt helper (matches src/lib/crypto.ts) ---
function decryptSetting(encoded: string): string {
  const secret = process.env.JWT_SECRET || "";
  const key = crypto.createHash("sha256").update(secret).digest();
  const [ivB64, tagB64, dataB64] = encoded.split(":");
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const encrypted = Buffer.from(dataB64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final("utf8");
}

// --- Gemini API key: DB first, env fallback ---
const ENV_GEMINI_KEY = process.env.GEMINI_API_KEY || "";

async function getGeminiKey(): Promise<string> {
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
      const sql = neon(dbUrl);
      const rows = await sql`SELECT value FROM app_settings WHERE key = 'gemini_api_key' LIMIT 1`;
      if (rows[0]?.value) return decryptSetting(rows[0].value);
    }
  } catch {}
  return ENV_GEMINI_KEY;
}

async function isAiEnabledServer(): Promise<boolean> {
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
      const sql = neon(dbUrl);
      const rows = await sql`SELECT value FROM app_settings WHERE key = 'ai_enabled' LIMIT 1`;
      return rows[0]?.value === "true";
    }
  } catch {}
  return false;
}

async function getAiModelServer(): Promise<string> {
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
      const sql = neon(dbUrl);
      const rows = await sql`SELECT value FROM app_settings WHERE key = 'ai_model' LIMIT 1`;
      if (rows[0]?.value) return rows[0].value;
    }
  } catch {}
  return "gemini-2.5-flash";
}

const MODE_TONES: Record<string, { en: string; ru: string }> = {
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

const FALLBACK_TEMPLATES: Record<string, string[]> = {
  debate: [
    "What's the most overrated thing about {topic}?",
    "Hot take: unpopular opinion on {topic}?",
    "Is {topic} overhyped or underrated?",
    "What's the biggest myth about {topic}?",
    "If you could change one thing about {topic}?",
    "Are people too obsessed with {topic}?",
    "What side are you on with {topic}?",
    "Worst advice about {topic}?",
    "Is {topic} better now than 5 years ago?",
    "What do most people get wrong about {topic}?",
  ],
  chill: [
    "What got you into {topic}?",
    "Favorite thing about {topic}?",
    "Anyone here new to {topic}?",
    "Chill story about {topic}?",
    "If {topic} was a vibe, what would it be?",
    "Easiest way to get into {topic}?",
    "What reminds you of {topic}?",
    "How does {topic} make you feel?",
    "What song goes with {topic}?",
    "Describe {topic} in one word?",
  ],
  confessions: [
    "What about {topic} have you never told anyone?",
    "Ever been embarrassed because of {topic}?",
    "Guilty pleasure related to {topic}?",
    "When did {topic} surprise you emotionally?",
    "Secret opinion about {topic}?",
    "Has {topic} ever changed your mind?",
    "Biggest mistake with {topic}?",
    "Most personal thing about {topic} for you?",
    "Did {topic} ever make you cry?",
    "What do you wish you knew earlier about {topic}?",
  ],
  business: [
    "How can someone make money from {topic}?",
    "Next big opportunity in {topic}?",
    "Who's killing it in {topic}?",
    "Business idea around {topic}?",
    "Would you invest in {topic}?",
    "Most valuable skill in {topic}?",
    "How did {topic} affect your career?",
    "What's the ROI of {topic}?",
    "Biggest risk in {topic}?",
    "Where is {topic} headed in 5 years?",
  ],
  funny: [
    "If {topic} was a person, who would it be?",
    "Dumbest thing about {topic}?",
    "Rate {topic}: pizza or taco scale?",
    "If {topic} had a dating profile?",
    "What animal is {topic}?",
    "Explain {topic} like you're drunk",
    "Funniest fail in {topic}?",
    "If {topic} was a meme, which one?",
    "{topic}'s theme song would be?",
    "Roast {topic} in one sentence",
  ],
  advice: [
    "Best advice about {topic} you got?",
    "What should beginners know about {topic}?",
    "Mistake to avoid in {topic}?",
    "How to deal with hard parts of {topic}?",
    "Who taught you most about {topic}?",
    "Best resource for {topic}?",
    "What would you tell younger you about {topic}?",
    "What changed everything for you in {topic}?",
    "How to stay motivated with {topic}?",
    "Underrated advice about {topic}?",
  ],
  deep: [
    "Why does {topic} matter to you?",
    "How has {topic} shaped who you are?",
    "What does {topic} say about human nature?",
    "If {topic} disappeared, what changes?",
    "Deeper meaning behind {topic}?",
    "How does {topic} connect to life's meaning?",
    "What emotion does {topic} bring up?",
    "World without {topic} — what's different?",
    "Is {topic} a symptom of something bigger?",
    "What truth about {topic} scares people?",
  ],
  night: [
    "Late night — wildest take on {topic}?",
    "3am thought: is {topic} even real?",
    "Weirdest connection between {topic} and your life?",
    "Conspiracy theory about {topic} — go!",
    "Drunk-text {topic}: what do you say?",
    "Most unhinged thing about {topic}?",
    "Anyone else overthink {topic} at night?",
    "What would aliens think about {topic}?",
    "{topic} in a parallel universe?",
    "If {topic} was a late-night snack?",
  ],
};

function getFallbackQuestions(topic: string, mode: string): string[] {
  const templates = FALLBACK_TEMPLATES[mode] || FALLBACK_TEMPLATES["chill"];
  return templates.map((t) => t.replace(/\{topic\}/g, topic));
}

async function generateIceBreakersForRoom(roomId: string) {
  const room = rooms.get(roomId);
  if (!room) return;

  const aiEnabled = await isAiEnabledServer();
  const geminiKey = await getGeminiKey();
  if (!aiEnabled || !geminiKey) {
    room.iceBreakers = getFallbackQuestions(room.topic, room.mode);
    sendToRoom(roomId, {
      type: "ice-breakers",
      roomId,
      questions: room.iceBreakers,
    });
    return;
  }

  const isRu = room.lang === "ru";
  const toneObj = MODE_TONES[room.mode] || MODE_TONES["chill"];
  const tone = isRu ? toneObj.ru : toneObj.en;

  const prompt = isRu
    ? `Ты генератор вопросов-айсбрейкеров для анонимной голосовой комнаты.

Тема комнаты: "${room.topic}"
Тон: ${tone}

Правила:
- Сгенерируй ровно 10 вопросов-айсбрейкеров
- Каждый вопрос ДОЛЖЕН быть напрямую связан с темой "${room.topic}"
- Никаких дубликатов и шаблонных вопросов
- Естественные, разговорные, на простом русском языке
- Подходят для взрослых в анонимной голосовой комнате
- Максимум 100 символов на вопрос

Верни ТОЛЬКО валидный JSON: {"questions":["q1","q2","q3","q4","q5","q6","q7","q8","q9","q10"]}`
    : `You are an ice-breaker question generator for an anonymous voice chat room.

Room topic: "${room.topic}"
Mode tone: ${tone}

Rules:
- Generate exactly 10 ice-breaker questions
- Every question MUST be directly related to the topic "${room.topic}"
- No duplicates, no generic filler
- Natural, conversational, suitable for adults in anonymous voice room
- Max 100 characters per question

Return ONLY valid JSON: {"questions":["q1","q2","q3","q4","q5","q6","q7","q8","q9","q10"]}`;

  try {
    const aiModel = await getAiModelServer();
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${aiModel}:generateContent?key=${geminiKey}`;
    const res = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON");
    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed.questions) || parsed.questions.length !== 10)
      throw new Error("Bad structure");

    room.iceBreakers = parsed.questions;
  } catch (err) {
    console.error("Gemini ice-breaker generation failed, using fallback:", err);
    room.iceBreakers = getFallbackQuestions(room.topic, room.mode);
  }

  // Room may have been deleted while waiting for API
  if (rooms.has(roomId)) {
    sendToRoom(roomId, {
      type: "ice-breakers",
      roomId,
      questions: room.iceBreakers,
    });
  }
}

function sendToRoom(roomId: string, msg: object, excludeId?: string) {
  const room = rooms.get(roomId);
  if (!room) return;
  const data = JSON.stringify(msg);
  for (const p of room.people) {
    if (p.id === excludeId) continue;
    const user = users.get(p.id);
    if (user && user.ws.readyState === WebSocket.OPEN) user.ws.send(data);
  }
}

function stopPreview(userId: string) {
  const preview = previewers.get(userId);
  if (!preview) return;
  clearTimeout(preview.timeout);
  previewers.delete(userId);

  // Set cooldown for this user+room
  const user = users.get(userId);
  if (user) {
    setPreviewCooldown(user, preview.roomId);
  }

  const room = rooms.get(preview.roomId);
  if (room) {
    for (const p of room.people) {
      const u = users.get(p.id);
      if (u && u.ws.readyState === WebSocket.OPEN) {
        u.ws.send(JSON.stringify({ type: "peer-leave", id: userId }));
      }
    }
  }

  if (user && user.ws.readyState === WebSocket.OPEN) {
    user.ws.send(JSON.stringify({ type: "preview-stopped" }));
  }
}

function leaveRoom(userId: string): { roomId: string; deleted: boolean } | null {
  const user = users.get(userId);
  if (!user?.roomId) return null;
  const room = rooms.get(user.roomId);
  if (!room) return null;

  const roomId = room.id;
  room.people = room.people.filter((p) => p.id !== userId);

  // If the host left, close the room and kick everyone
  if (room.hostId === userId) {
    for (const p of room.people) {
      const u = users.get(p.id);
      if (u && u.ws.readyState === WebSocket.OPEN) {
        u.ws.send(JSON.stringify({ type: "peer-leave", id: userId }));
        u.ws.send(JSON.stringify({ type: "room-closed" }));
        u.roomId = null;
      }
    }
    rooms.delete(room.id);
    user.roomId = null;
    return { roomId, deleted: true };
  } else {
    for (const p of room.people) {
      const u = users.get(p.id);
      if (u && u.ws.readyState === WebSocket.OPEN) {
        u.ws.send(JSON.stringify({ type: "peer-leave", id: userId }));
      }
    }
    const deleted = room.people.length === 0;
    if (deleted) rooms.delete(room.id);
    user.roomId = null;
    return { roomId, deleted };
  }
}

// --- Server ---
const PORT = parseInt(process.env.PORT || "1999", 10);
const ADMIN_SECRET = process.env.JWT_SECRET || "";

const server = http.createServer((req, res) => {
  // CORS for admin panel
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Authorization");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === "/admin/stats" && req.method === "GET") {
    // Verify admin token
    const auth = req.headers.authorization;
    if (!ADMIN_SECRET || !auth || auth !== `Bearer ${ADMIN_SECRET}`) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    const realRooms: object[] = [];
    const seedRoomCount = seedRoomIds.size;

    for (const [id, room] of rooms) {
      if (seedRoomIds.has(id)) continue;
      realRooms.push({
        id: room.id,
        topic: room.topic,
        mode: room.mode,
        hostName: room.hostName,
        people: room.people.map((p) => ({ id: p.id, name: p.name })),
        maxPeople: room.maxPeople,
        color: room.color,
        createdAt: room.createdAt,
        lang: room.lang,
      });
    }

    const realUsers: object[] = [];
    for (const [id, user] of users) {
      realUsers.push({
        id,
        name: user.name,
        ip: user.ip,
        roomId: user.roomId,
        connected: user.ws.readyState === WebSocket.OPEN,
      });
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        realRooms,
        realUsers,
        seedRoomCount,
        totalRooms: rooms.size,
        totalConnections: users.size,
      })
    );
    return;
  }

  // Admin action: warn / block / kick a user by connection ID
  if (req.url === "/admin/action" && req.method === "POST") {
    const auth = req.headers.authorization;
    if (!ADMIN_SECRET || !auth || auth !== `Bearer ${ADMIN_SECRET}`) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const { action, userId, message, minutes } = JSON.parse(body);
        const user = users.get(userId);

        if (!user || user.ws.readyState !== WebSocket.OPEN) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "User not connected" }));
          return;
        }

        if (action === "warn") {
          user.ws.send(
            JSON.stringify({
              type: "admin-warn",
              message:
                message || "You have received a warning for misbehavior. Please follow the rules.",
            })
          );
        } else if (action === "block") {
          user.ws.send(
            JSON.stringify({
              type: "admin-block",
              minutes: minutes || 30,
              message: message || "You have been blocked.",
            })
          );
          // Kick from room and close connection after a short delay
          const result = leaveRoom(userId);
          if (result) {
            if (result.deleted) broadcastRoomRemove(result.roomId);
            else {
              const r = rooms.get(result.roomId);
              if (r) broadcastRoomUpsert(r);
            }
          }
          setTimeout(() => {
            user.ws.close();
          }, 500);
        } else if (action === "rename") {
          const newName = String(message || "").trim();
          if (!newName) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "New name is required" }));
            return;
          }
          const oldName = user.name;
          user.name = newName;
          // Update name in any room they're in
          if (user.roomId) {
            const room = rooms.get(user.roomId);
            if (room) {
              const person = room.people.find((p) => p.id === userId);
              if (person) person.name = newName;
              if (room.hostId === userId) room.hostName = newName;
              broadcastRoomUpsert(room);
            }
          }
          user.ws.send(JSON.stringify({ type: "admin-rename", oldName, newName }));
          // Update name lock in DB (prefer device_id, fall back to IP)
          {
            const dbUrl = process.env.DATABASE_URL;
            if (dbUrl) {
              const sql = neon(dbUrl);
              const q = user.deviceId
                ? sql`UPDATE user_names SET name = ${newName}, updated_at = NOW() WHERE device_id = ${user.deviceId}`
                : user.ip
                  ? sql`UPDATE user_names SET name = ${newName}, updated_at = NOW() WHERE ip = ${user.ip}`
                  : Promise.resolve();
              q.catch(() => {});
            }
          }
        } else if (action === "kick") {
          const result = leaveRoom(userId);
          user.ws.send(JSON.stringify({ type: "admin-kick" }));
          if (result) {
            if (result.deleted) broadcastRoomRemove(result.roomId);
            else {
              const r = rooms.get(result.roomId);
              if (r) broadcastRoomUpsert(r);
            }
          }
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true }));
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid request" }));
      }
    });
    return;
  }

  // Name check — uses same IP extraction as WebSocket so IPs always match
  if (req.url === "/name-check" && req.method === "GET") {
    const fwd = req.headers["x-forwarded-for"];
    let ip =
      (typeof fwd === "string" ? fwd.split(",")[0].trim() : req.socket.remoteAddress) || "unknown";
    if (ip.startsWith("::ffff:")) ip = ip.slice(7);

    getLockedName(ip)
      .then((name) => {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ name: name || null }));
      })
      .catch(() => {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ name: null }));
      });
    return;
  }

  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server });
server.listen(PORT, () => {
  console.log(`WebSocket + HTTP server running on port ${PORT}`);
  console.log(
    `DATABASE_URL: ${process.env.DATABASE_URL ? "loaded" : "MISSING — name locks and blocking will NOT work"}`
  );
  getGeminiKey().then((k) =>
    console.log(`Gemini API key: ${k ? "loaded" : "MISSING (set via admin panel)"}`)
  );
  // Migrate: add device_id column if missing
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    const sql = neon(dbUrl);
    sql`ALTER TABLE user_names ADD COLUMN IF NOT EXISTS device_id VARCHAR(100)`
      .then(
        () =>
          sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_user_names_device_id ON user_names (device_id) WHERE device_id IS NOT NULL`
      )
      .then(() => console.log("[migrate] device_id column ready"))
      .catch((e) => console.error("[migrate] device_id migration error:", e));
    // Drop old unique constraint on ip (allow multiple users per IP)
    sql`ALTER TABLE user_names DROP CONSTRAINT IF EXISTS user_names_ip_key`
      .then(() => console.log("[migrate] ip unique constraint dropped"))
      .catch(() => {});
  }
});

wss.on("connection", (ws, req) => {
  const connId = crypto.randomUUID();
  // Extract IP — support proxies via x-forwarded-for
  const forwarded = req.headers["x-forwarded-for"];
  let connIp =
    (typeof forwarded === "string" ? forwarded.split(",")[0].trim() : req.socket.remoteAddress) ||
    "unknown";
  // Strip IPv4-mapped IPv6 prefix (::ffff:192.168.1.1 → 192.168.1.1)
  if (connIp.startsWith("::ffff:")) connIp = connIp.slice(7);

  ws.send(JSON.stringify({ type: "sync", rooms: serializeRooms() }));

  ws.on("message", (raw) => {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (msg.type === "join") {
      let name = String(msg.name);
      const deviceId = typeof msg.deviceId === "string" ? msg.deviceId : null;
      // Check if IP is blocked
      checkBlocked(connIp).then(async (block) => {
        if (block) {
          ws.send(
            JSON.stringify({
              type: "admin-block",
              minutes: block.minutes,
              message: "You are blocked. Try again later.",
            })
          );
          setTimeout(() => ws.close(), 500);
          return;
        }
        // Enforce name lock — prefer device_id, fall back to IP
        const lockedName = await getLockedName(connIp, deviceId);
        if (lockedName) {
          name = lockedName;
          ws.send(JSON.stringify({ type: "name-locked", name: lockedName }));
        } else {
          // First time — save the name with device token
          await saveNameLock(connIp, name, deviceId);
        }
        users.set(connId, { ws, name, roomId: null, ip: connIp, deviceId });
        ws.send(JSON.stringify({ type: "id", id: connId }));
        broadcastAll({ type: "online", count: users.size + SEED_ONLINE_OFFSET });
      });
    }

    if (msg.type === "create") {
      const user = users.get(connId);
      if (!user) return;
      leaveRoom(connId);

      const preferLat = Number(msg.lat) || 42.8746;
      const preferLng = Number(msg.lng) || 74.5953;
      const { lat, lng } = findFreeNear(preferLat, preferLng, [...rooms.values()]);

      const room: Room = {
        id: crypto.randomUUID(),
        hostId: connId,
        hostName: user.name,
        topic: String(msg.topic).slice(0, 80),
        mode: String(msg.mode || "chill"),
        maxPeople: Math.min(Math.max(Number(msg.max) || 4, 2), 8),
        people: [{ id: connId, name: user.name }],
        color: COLORS[colorIdx++ % COLORS.length],
        lat,
        lng,
        createdAt: Date.now(),
        lang: String(msg.lang || "en"),
        banned: new Map(),
        iceBreakers: [],
        currentQuestion: 0,
      };
      rooms.set(room.id, room);
      user.roomId = room.id;

      ws.send(JSON.stringify({ type: "joined", roomId: room.id }));
      broadcastRoomUpsert(room);

      // Generate ice breakers in background
      generateIceBreakersForRoom(room.id);
    }

    if (msg.type === "join-room") {
      const user = users.get(connId);
      if (!user) return;
      const room = rooms.get(String(msg.roomId));
      if (!room) return;
      if (seedRoomIds.has(room.id)) return;
      if (room.people.length >= room.maxPeople) return;
      if (room.people.some((p) => p.id === connId)) return;
      // Check ban by name
      const banExpiry = room.banned.get(user.name);
      if (banExpiry && Date.now() < banExpiry) {
        const mins = Math.ceil((banExpiry - Date.now()) / 60000);
        ws.send(JSON.stringify({ type: "banned", minutes: mins }));
        return;
      }

      leaveRoom(connId);
      stopPreview(connId);
      room.people.push({ id: connId, name: user.name });
      user.roomId = room.id;

      ws.send(JSON.stringify({ type: "joined", roomId: room.id }));

      for (const p of room.people) {
        if (p.id === connId) continue;
        const peerUser = users.get(p.id);
        if (peerUser && peerUser.ws.readyState === WebSocket.OPEN) {
          peerUser.ws.send(JSON.stringify({ type: "peer-join", id: connId, name: user.name }));
        }
        ws.send(JSON.stringify({ type: "peer-join", id: p.id, name: p.name }));
      }

      // Send existing ice breakers to the new joiner
      if (room.iceBreakers.length > 0) {
        ws.send(
          JSON.stringify({
            type: "ice-breakers",
            roomId: room.id,
            questions: room.iceBreakers,
          })
        );
        ws.send(
          JSON.stringify({
            type: "question-index",
            roomId: room.id,
            index: room.currentQuestion,
          })
        );
      }

      broadcastRoomUpsert(room);
    }

    if (msg.type === "leave") {
      const result = leaveRoom(connId);
      ws.send(JSON.stringify({ type: "left" }));
      if (result) {
        if (result.deleted) broadcastRoomRemove(result.roomId);
        else {
          const r = rooms.get(result.roomId);
          if (r) broadcastRoomUpsert(r);
        }
      }
    }

    if (msg.type === "change-name") {
      const user = users.get(connId);
      if (!user) return;
      const newName = String(msg.name || "").trim();
      if (newName.length < 2 || newName.length > 20) return;
      const oldName = user.name;
      user.name = newName;
      // Update in any room
      if (user.roomId) {
        const room = rooms.get(user.roomId);
        if (room) {
          const person = room.people.find((p) => p.id === connId);
          if (person) person.name = newName;
          if (room.hostId === connId) room.hostName = newName;
          broadcastRoomUpsert(room);
        }
      }
      // Update name lock in DB (prefer device_id, fall back to IP)
      {
        const dbUrl = process.env.DATABASE_URL;
        if (dbUrl) {
          const sql = neon(dbUrl);
          const q = user.deviceId
            ? sql`UPDATE user_names SET name = ${newName}, updated_at = NOW() WHERE device_id = ${user.deviceId}`
            : user.ip
              ? sql`UPDATE user_names SET name = ${newName}, updated_at = NOW() WHERE ip = ${user.ip}`
              : Promise.resolve();
          q.catch(() => {});
        }
      }
      ws.send(JSON.stringify({ type: "name-changed", oldName, newName }));
    }

    if (msg.type === "signal") {
      const targetUser = users.get(String(msg.to));
      if (targetUser && targetUser.ws.readyState === WebSocket.OPEN) {
        targetUser.ws.send(JSON.stringify({ type: "signal", from: connId, signal: msg.signal }));
      }
    }

    if (msg.type === "mic-ready") {
      const user = users.get(connId);
      if (!user?.roomId) return;
      sendToRoom(user.roomId, { type: "mic-ready", from: connId }, connId);
    }

    if (msg.type === "kick") {
      const user = users.get(connId);
      if (!user?.roomId) return;
      const room = rooms.get(user.roomId);
      if (!room || room.hostId !== connId) return; // only host can kick
      const targetId = String(msg.targetId);
      const target = users.get(targetId);
      if (!target || target.roomId !== room.id || targetId === connId) return;
      // Ban the user's name for 1 hour
      room.banned.set(target.name, Date.now() + 60 * 60 * 1000);
      // Notify the kicked user
      if (target.ws.readyState === WebSocket.OPEN) {
        target.ws.send(JSON.stringify({ type: "kicked" }));
      }
      // Remove them from the room
      const result = leaveRoom(targetId);
      if (target.ws.readyState === WebSocket.OPEN) {
        target.ws.send(JSON.stringify({ type: "left" }));
      }
      if (result) {
        if (result.deleted) broadcastRoomRemove(result.roomId);
        else {
          const r = rooms.get(result.roomId);
          if (r) broadcastRoomUpsert(r);
        }
      }
    }

    if (msg.type === "mute-peer") {
      const user = users.get(connId);
      if (!user?.roomId) return;
      const room = rooms.get(user.roomId);
      if (!room || room.hostId !== connId) return; // only host
      const targetId = String(msg.targetId);
      const target = users.get(targetId);
      if (!target || target.roomId !== room.id || targetId === connId) return;
      if (target.ws.readyState === WebSocket.OPEN) {
        target.ws.send(JSON.stringify({ type: "force-muted" }));
      }
    }

    if (msg.type === "next-question") {
      const user = users.get(connId);
      if (!user?.roomId) return;
      const room = rooms.get(user.roomId);
      if (!room || room.hostId !== connId) return; // only host
      if (room.iceBreakers.length === 0) return;
      room.currentQuestion = (room.currentQuestion + 1) % room.iceBreakers.length;
      sendToRoom(user.roomId, {
        type: "question-index",
        roomId: room.id,
        index: room.currentQuestion,
      });
      // Also send to host
      ws.send(
        JSON.stringify({
          type: "question-index",
          roomId: room.id,
          index: room.currentQuestion,
        })
      );
    }

    if (msg.type === "chat") {
      const user = users.get(connId);
      if (!user?.roomId) return;
      sendToRoom(user.roomId, {
        type: "chat",
        from: connId,
        name: user.name,
        text: String(msg.text).slice(0, 200),
      });
    }

    if (msg.type === "preview") {
      const user = users.get(connId);
      if (!user || user.roomId) return; // can't preview while in a room

      const roomId = String(msg.roomId);
      const room = rooms.get(roomId);
      if (!room) return;

      // Check server-side cooldown for this user+room
      const remaining = isPreviewOnCooldown(user, roomId);
      if (remaining > 0) {
        ws.send(JSON.stringify({ type: "preview-cooldown", roomId, remainingMs: remaining }));
        return;
      }

      // Stop any existing preview by this user
      stopPreview(connId);

      // Only real (non-seed) participants with an active ws can stream audio
      const realPeople = room.people.filter((p) => users.has(p.id) && !p.id.startsWith("_seed_"));
      if (realPeople.length === 0) {
        ws.send(JSON.stringify({ type: "preview-unavailable", roomId: room.id }));
        return;
      }

      // Tell room members to connect their audio to the previewer
      for (const p of realPeople) {
        const peerUser = users.get(p.id);
        if (peerUser && peerUser.ws.readyState === WebSocket.OPEN) {
          peerUser.ws.send(JSON.stringify({ type: "peer-join", id: connId, name: "_preview" }));
          peerUser.ws.send(JSON.stringify({ type: "mic-ready", from: connId }));
        }
      }

      ws.send(JSON.stringify({ type: "preview-started", roomId: room.id }));

      // Auto-stop after 7 seconds (client stops at ~6s, this is a safety net)
      const timeout = setTimeout(() => stopPreview(connId), 7000);
      previewers.set(connId, { roomId: room.id, timeout });
    }

    if (msg.type === "preview-stop") {
      stopPreview(connId);
    }
  });

  ws.on("close", () => {
    stopPreview(connId);
    const result = leaveRoom(connId);
    users.delete(connId);
    broadcastAll({ type: "online", count: users.size + SEED_ONLINE_OFFSET });
    if (result) {
      if (result.deleted) broadcastRoomRemove(result.roomId);
      else {
        const r = rooms.get(result.roomId);
        if (r) broadcastRoomUpsert(r);
      }
    }
  });
});
