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
  x: number;
  y: number;
  createdAt: number;
};

const COLORS = [
  "#6366f1", "#8b5cf6", "#a855f7", "#ec4899",
  "#f43f5e", "#ef4444", "#f97316", "#eab308",
  "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
];

// Fake names pool for seed rooms
const FAKE_NAMES = [
  "Aida", "Timur", "Mila", "daniyar", "alex", "Нурай", "Bekzat", "Камила",
  "Arsen", "max", "Zarina", "Эрмек", "Aliya", "Sasha", "Айдана", "Ruslan",
  "Dina", "Azamat", "Nika", "Askar", "Лера", "Марат", "Анара", "Damir",
  "Elina", "Talgat", "Asel", "Beka", "Kira", "Sultan",
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

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function makeSeedRoom(): Room {
  const maxPeople = pickRandom([3, 4, 5, 6]);
  const topic = pickRandom(SEED_TOPICS);
  const host = pickRandom(FAKE_NAMES);

  // Fill to max (full room)
  const usedNames = new Set<string>([host]);
  const people: { id: string; name: string }[] = [
    { id: `_seed_${crypto.randomUUID().slice(0, 8)}`, name: host },
  ];
  while (people.length < maxPeople) {
    let name = pickRandom(FAKE_NAMES);
    if (usedNames.has(name)) continue;
    usedNames.add(name);
    people.push({ id: `_seed_${crypto.randomUUID().slice(0, 8)}`, name });
  }

  return {
    id: crypto.randomUUID(),
    hostId: people[0].id,
    hostName: host,
    topic,
    maxPeople,
    people,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    x: 150 + Math.floor(Math.random() * 700),
    y: 100 + Math.floor(Math.random() * 400),
    createdAt: Date.now() - Math.floor(Math.random() * 7200000),
  };
}

// --- State ---
const rooms = new Map<string, Room>();
const seedRoomIds = new Set<string>();
const users = new Map<string, { ws: WebSocket; name: string; roomId: string | null }>();
let colorIdx = 0;

// Init seed rooms (3 full rooms — always exactly 3)
const SEED_COUNT = 3;
for (let i = 0; i < SEED_COUNT; i++) {
  const room = makeSeedRoom();
  rooms.set(room.id, room);
  seedRoomIds.add(room.id);
}
colorIdx = SEED_COUNT;

// --- Shuffle seed rooms every 20-40 seconds to feel alive ---
function shuffleSeeds() {
  // Replace one random seed room to keep exactly 3
  const ids = [...seedRoomIds];
  if (ids.length > 0) {
    const removeId = pickRandom(ids);
    rooms.delete(removeId);
    seedRoomIds.delete(removeId);
  }

  // Ensure always 3 seed rooms
  while (seedRoomIds.size < SEED_COUNT) {
    const newRoom = makeSeedRoom();
    rooms.set(newRoom.id, newRoom);
    seedRoomIds.add(newRoom.id);
  }

  // Broadcast updated rooms
  sendRooms();

  // Schedule next shuffle at random interval
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

function sendRooms() {
  broadcastAll({ type: "rooms", rooms: [...rooms.values()] });
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

function leaveRoom(userId: string) {
  const user = users.get(userId);
  if (!user?.roomId) return;
  const room = rooms.get(user.roomId);
  if (!room) return;

  room.people = room.people.filter((p) => p.id !== userId);

  for (const p of room.people) {
    const u = users.get(p.id);
    if (u && u.ws.readyState === WebSocket.OPEN) {
      u.ws.send(JSON.stringify({ type: "peer-leave", id: userId }));
    }
  }

  if (room.people.length === 0) {
    rooms.delete(room.id);
  }
  user.roomId = null;
}

// --- Server ---
const PORT = parseInt(process.env.PORT || "1999", 10);
const wss = new WebSocketServer({ port: PORT });

console.log(`WebSocket server running on port ${PORT}`);

wss.on("connection", (ws) => {
  const connId = crypto.randomUUID();

  // Send current rooms on connect
  ws.send(JSON.stringify({ type: "sync", rooms: [...rooms.values()] }));

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

      const room: Room = {
        id: crypto.randomUUID(),
        hostId: connId,
        hostName: user.name,
        topic: String(msg.topic).slice(0, 80),
        maxPeople: Math.min(Math.max(Number(msg.max) || 4, 2), 8),
        people: [{ id: connId, name: user.name }],
        color: COLORS[colorIdx++ % COLORS.length],
        x: Number(msg.x) || 0,
        y: Number(msg.y) || 0,
        createdAt: Date.now(),
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
      if (seedRoomIds.has(room.id)) return; // can't join seed rooms
      if (room.people.length >= room.maxPeople) return;
      if (room.people.some((p) => p.id === connId)) return;

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
  });

  ws.on("close", () => {
    leaveRoom(connId);
    users.delete(connId);
    broadcastAll({ type: "online", count: users.size + SEED_ONLINE_OFFSET });
    sendRooms();
  });
});
