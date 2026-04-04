import { WebSocketServer, WebSocket } from "ws";
import crypto from "crypto";

type Room = {
  id: string;
  hostId: string;
  hostName: string;
  topic: string;
  maxPeople: number;
  people: { id: string; name: string }[];
  color: string;
  lat: number;
  lng: number;
  createdAt: number;
  banned: Map<string, number>; // name -> ban expiry timestamp
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
    maxPeople,
    people,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    lat,
    lng,
    createdAt: Date.now() - Math.floor(Math.random() * 7200000),
    banned: new Map(),
  };
}

// --- State ---
const rooms = new Map<string, Room>();
const seedRoomIds = new Set<string>();
const users = new Map<string, { ws: WebSocket; name: string; roomId: string | null }>();
const previewers = new Map<string, { roomId: string; timeout: NodeJS.Timeout }>();
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
  }
  while (seedRoomIds.size < SEED_COUNT) {
    const newRoom = makeSeedRoom();
    rooms.set(newRoom.id, newRoom);
    seedRoomIds.add(newRoom.id);
  }
  sendRooms();
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

function serializeRooms() {
  return [...rooms.values()].map(({ banned, ...rest }) => rest);
}

function sendRooms() {
  broadcastAll({ type: "rooms", rooms: serializeRooms() });
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

  const room = rooms.get(preview.roomId);
  if (room) {
    for (const p of room.people) {
      const u = users.get(p.id);
      if (u && u.ws.readyState === WebSocket.OPEN) {
        u.ws.send(JSON.stringify({ type: "peer-leave", id: userId }));
      }
    }
  }

  const user = users.get(userId);
  if (user && user.ws.readyState === WebSocket.OPEN) {
    user.ws.send(JSON.stringify({ type: "preview-stopped" }));
  }
}

function leaveRoom(userId: string) {
  const user = users.get(userId);
  if (!user?.roomId) return;
  const room = rooms.get(user.roomId);
  if (!room) return;

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
  } else {
    for (const p of room.people) {
      const u = users.get(p.id);
      if (u && u.ws.readyState === WebSocket.OPEN) {
        u.ws.send(JSON.stringify({ type: "peer-leave", id: userId }));
      }
    }
    if (room.people.length === 0) rooms.delete(room.id);
  }

  user.roomId = null;
}

// --- Server ---
const PORT = parseInt(process.env.PORT || "1999", 10);
const wss = new WebSocketServer({ port: PORT });

console.log(`WebSocket server running on port ${PORT}`);

wss.on("connection", (ws) => {
  const connId = crypto.randomUUID();

  ws.send(JSON.stringify({ type: "sync", rooms: serializeRooms() }));

  ws.on("message", (raw) => {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (msg.type === "join") {
      users.set(connId, { ws, name: String(msg.name), roomId: null });
      ws.send(JSON.stringify({ type: "id", id: connId }));
      broadcastAll({ type: "online", count: users.size + SEED_ONLINE_OFFSET });
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
        maxPeople: Math.min(Math.max(Number(msg.max) || 4, 2), 8),
        people: [{ id: connId, name: user.name }],
        color: COLORS[colorIdx++ % COLORS.length],
        lat,
        lng,
        createdAt: Date.now(),
        banned: new Map(),
      };
      rooms.set(room.id, room);
      user.roomId = room.id;

      ws.send(JSON.stringify({ type: "joined", roomId: room.id }));
      sendRooms();
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

      sendRooms();
    }

    if (msg.type === "leave") {
      leaveRoom(connId);
      ws.send(JSON.stringify({ type: "left" }));
      sendRooms();
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
      leaveRoom(targetId);
      if (target.ws.readyState === WebSocket.OPEN) {
        target.ws.send(JSON.stringify({ type: "left" }));
      }
      sendRooms();
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

      const room = rooms.get(String(msg.roomId));
      if (!room) return;

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
    leaveRoom(connId);
    users.delete(connId);
    broadcastAll({ type: "online", count: users.size + SEED_ONLINE_OFFSET });
    sendRooms();
  });
});
