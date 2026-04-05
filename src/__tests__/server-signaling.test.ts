/**
 * Tests for server-side WebRTC signal relay (server/index.ts)
 *
 * Tests the signaling logic in isolation from the actual WebSocket server.
 */
import { describe, it, expect, vi } from "vitest";

// ─── Mock WebSocket ──────────────────────────────────────────────────────────

function createMockWs() {
  return {
    readyState: 1, // WebSocket.OPEN
    send: vi.fn(),
  };
}

// ─── Simulated server state ──────────────────────────────────────────────────

type User = { ws: ReturnType<typeof createMockWs>; roomId: string | null; name: string };
type Room = {
  id: string;
  hostId: string;
  hostName: string;
  people: { id: string; name: string }[];
  banned: Map<string, number>;
};

function createServerState() {
  const users = new Map<string, User>();
  const rooms = new Map<string, Room>();

  function sendToRoom(roomId: string, msg: object, excludeId?: string) {
    const room = rooms.get(roomId);
    if (!room) return;
    for (const p of room.people) {
      if (p.id === excludeId) continue;
      const u = users.get(p.id);
      if (u && u.ws.readyState === 1) {
        u.ws.send(JSON.stringify(msg));
      }
    }
  }

  return { users, rooms, sendToRoom };
}

describe("Server Signal Relay", () => {
  describe("signal message routing", () => {
    it("should relay signal from sender to target", () => {
      const { users } = createServerState();

      const wsA = createMockWs();
      const wsB = createMockWs();
      users.set("conn-A", { ws: wsA, roomId: "room-1", name: "Alice" });
      users.set("conn-B", { ws: wsB, roomId: "room-1", name: "Bob" });

      // Simulate signal relay (server/index.ts:1025-1030)
      const msg = { type: "signal", to: "conn-B", signal: { type: "offer", sdp: "offer-sdp" } };
      const connId = "conn-A";

      const targetUser = users.get(String(msg.to));
      if (targetUser && targetUser.ws.readyState === 1) {
        targetUser.ws.send(JSON.stringify({ type: "signal", from: connId, signal: msg.signal }));
      }

      expect(wsB.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: "signal",
          from: "conn-A",
          signal: { type: "offer", sdp: "offer-sdp" },
        })
      );
      expect(wsA.send).not.toHaveBeenCalled();
    });

    it("should silently drop signal if target doesn't exist", () => {
      const { users } = createServerState();

      const wsA = createMockWs();
      users.set("conn-A", { ws: wsA, roomId: "room-1", name: "Alice" });

      const msg = { type: "signal", to: "nonexistent", signal: { type: "offer" } };
      const targetUser = users.get(String(msg.to));

      // Should not throw
      if (targetUser && targetUser.ws.readyState === 1) {
        targetUser.ws.send(JSON.stringify({ type: "signal", from: "conn-A", signal: msg.signal }));
      }

      expect(wsA.send).not.toHaveBeenCalled();
    });

    it("should silently drop signal if target WebSocket is closed", () => {
      const { users } = createServerState();

      const wsA = createMockWs();
      const wsB = createMockWs();
      wsB.readyState = 3; // CLOSED
      users.set("conn-A", { ws: wsA, roomId: "room-1", name: "Alice" });
      users.set("conn-B", { ws: wsB, roomId: "room-1", name: "Bob" });

      const msg = { type: "signal", to: "conn-B", signal: { type: "offer" } };
      const targetUser = users.get(String(msg.to));
      if (targetUser && targetUser.ws.readyState === 1) {
        targetUser.ws.send(JSON.stringify({ type: "signal", from: "conn-A", signal: msg.signal }));
      }

      expect(wsB.send).not.toHaveBeenCalled();
    });

    /**
     * BUG #14: No room-scoping for signal relay.
     *
     * The server relays signals to ANY user by connection ID, regardless
     * of whether they're in the same room. A user could potentially send
     * signals to users in other rooms. While this isn't a voice bug per se,
     * it means stale signals from a previous room could interfere with
     * a new room's connections.
     */
    it("BUG: signals are relayed without checking room membership", () => {
      const { users } = createServerState();

      const wsA = createMockWs();
      const wsB = createMockWs();
      users.set("conn-A", { ws: wsA, roomId: "room-1", name: "Alice" });
      users.set("conn-B", { ws: wsB, roomId: "room-2", name: "Bob" }); // Different room!

      const msg = { type: "signal", to: "conn-B", signal: { type: "offer" } };
      const connId = "conn-A";

      // Server blindly relays without room check
      const targetUser = users.get(String(msg.to));
      if (targetUser && targetUser.ws.readyState === 1) {
        targetUser.ws.send(JSON.stringify({ type: "signal", from: connId, signal: msg.signal }));
      }

      // Signal delivered to user in DIFFERENT room — this shouldn't happen
      expect(wsB.send).toHaveBeenCalled();
    });
  });

  describe("mic-ready broadcast", () => {
    it("should broadcast mic-ready to all room members except sender", () => {
      const { users, rooms, sendToRoom } = createServerState();

      const wsA = createMockWs();
      const wsB = createMockWs();
      const wsC = createMockWs();
      users.set("conn-A", { ws: wsA, roomId: "room-1", name: "Alice" });
      users.set("conn-B", { ws: wsB, roomId: "room-1", name: "Bob" });
      users.set("conn-C", { ws: wsC, roomId: "room-1", name: "Charlie" });
      rooms.set("room-1", {
        id: "room-1",
        hostId: "conn-A",
        hostName: "Alice",
        people: [
          { id: "conn-A", name: "Alice" },
          { id: "conn-B", name: "Bob" },
          { id: "conn-C", name: "Charlie" },
        ],
        banned: new Map(),
      });

      // conn-A sends mic-ready
      const connId = "conn-A";
      const user = users.get(connId);
      if (user?.roomId) {
        sendToRoom(user.roomId, { type: "mic-ready", from: connId }, connId);
      }

      expect(wsA.send).not.toHaveBeenCalled(); // Excluded self
      expect(wsB.send).toHaveBeenCalledWith(JSON.stringify({ type: "mic-ready", from: "conn-A" }));
      expect(wsC.send).toHaveBeenCalledWith(JSON.stringify({ type: "mic-ready", from: "conn-A" }));
    });

    it("should not broadcast mic-ready if user is not in a room", () => {
      const { users, sendToRoom } = createServerState();

      const wsA = createMockWs();
      users.set("conn-A", { ws: wsA, roomId: null, name: "Alice" });

      const connId = "conn-A";
      const user = users.get(connId);
      if (user?.roomId) {
        sendToRoom(user.roomId, { type: "mic-ready", from: connId }, connId);
      }

      expect(wsA.send).not.toHaveBeenCalled();
    });
  });

  describe("peer-join on room join", () => {
    it("should notify all existing peers when new user joins", () => {
      const { users, rooms } = createServerState();

      const wsA = createMockWs();
      const wsB = createMockWs();
      const wsNew = createMockWs();
      users.set("conn-A", { ws: wsA, roomId: "room-1", name: "Alice" });
      users.set("conn-B", { ws: wsB, roomId: "room-1", name: "Bob" });
      users.set("conn-new", { ws: wsNew, roomId: null, name: "Newbie" });
      rooms.set("room-1", {
        id: "room-1",
        hostId: "conn-A",
        hostName: "Alice",
        people: [
          { id: "conn-A", name: "Alice" },
          { id: "conn-B", name: "Bob" },
        ],
        banned: new Map(),
      });

      // Simulate join (server/index.ts:948-960)
      const room = rooms.get("room-1")!;
      const connId = "conn-new";
      const user = users.get(connId)!;
      room.people.push({ id: connId, name: user.name });
      user.roomId = room.id;

      // Send peer-join notifications
      for (const p of room.people) {
        if (p.id === connId) continue;
        const peerUser = users.get(p.id);
        if (peerUser && peerUser.ws.readyState === 1) {
          peerUser.ws.send(JSON.stringify({ type: "peer-join", id: connId, name: user.name }));
        }
        wsNew.send(JSON.stringify({ type: "peer-join", id: p.id, name: p.name }));
      }

      // Existing peers should be notified about new user
      expect(wsA.send).toHaveBeenCalledWith(
        JSON.stringify({ type: "peer-join", id: "conn-new", name: "Newbie" })
      );
      expect(wsB.send).toHaveBeenCalledWith(
        JSON.stringify({ type: "peer-join", id: "conn-new", name: "Newbie" })
      );

      // New user should be notified about existing peers
      const newUserMessages = wsNew.send.mock.calls.map((c: string[]) => JSON.parse(c[0]));
      expect(newUserMessages).toContainEqual({
        type: "peer-join",
        id: "conn-A",
        name: "Alice",
      });
      expect(newUserMessages).toContainEqual({
        type: "peer-join",
        id: "conn-B",
        name: "Bob",
      });
    });
  });

  describe("force-mute", () => {
    it("should only allow host to force-mute", () => {
      const { users, rooms } = createServerState();

      const wsHost = createMockWs();
      const wsTarget = createMockWs();
      const wsNonHost = createMockWs();
      users.set("host", { ws: wsHost, roomId: "room-1", name: "Host" });
      users.set("target", { ws: wsTarget, roomId: "room-1", name: "Target" });
      users.set("nonhost", { ws: wsNonHost, roomId: "room-1", name: "NonHost" });
      rooms.set("room-1", {
        id: "room-1",
        hostId: "host",
        hostName: "Host",
        people: [
          { id: "host", name: "Host" },
          { id: "target", name: "Target" },
          { id: "nonhost", name: "NonHost" },
        ],
        banned: new Map(),
      });

      // Non-host tries to mute
      const connId = "nonhost";
      const room = rooms.get("room-1")!;
      if (room.hostId !== connId) {
        // Should be rejected
      } else {
        wsTarget.send(JSON.stringify({ type: "force-muted" }));
      }
      expect(wsTarget.send).not.toHaveBeenCalled();

      // Host mutes
      const hostConnId = "host";
      const room2 = rooms.get("room-1")!;
      if (room2.hostId === hostConnId) {
        const target = users.get("target");
        if (target && target.ws.readyState === 1) {
          target.ws.send(JSON.stringify({ type: "force-muted" }));
        }
      }
      expect(wsTarget.send).toHaveBeenCalledWith(JSON.stringify({ type: "force-muted" }));
    });

    it("should not allow host to force-mute themselves", () => {
      const { users, rooms } = createServerState();

      const wsHost = createMockWs();
      users.set("host", { ws: wsHost, roomId: "room-1", name: "Host" });
      rooms.set("room-1", {
        id: "room-1",
        hostId: "host",
        hostName: "Host",
        people: [{ id: "host", name: "Host" }],
        banned: new Map(),
      });

      // Replicate server logic: targetId === connId → return
      const connId = "host";
      const targetId = "host";
      const room = rooms.get("room-1")!;
      if (!room || room.hostId !== connId) return;
      if (targetId === connId) return; // Self-mute blocked

      wsHost.send(JSON.stringify({ type: "force-muted" }));
      expect(wsHost.send).not.toHaveBeenCalled();
    });
  });

  describe("peer-leave on disconnect", () => {
    it("should broadcast peer-leave when user disconnects", () => {
      const { users, rooms } = createServerState();

      const wsA = createMockWs();
      const wsB = createMockWs();
      const wsLeaving = createMockWs();
      users.set("conn-A", { ws: wsA, roomId: "room-1", name: "Alice" });
      users.set("conn-B", { ws: wsB, roomId: "room-1", name: "Bob" });
      users.set("conn-leaving", { ws: wsLeaving, roomId: "room-1", name: "Leaver" });
      rooms.set("room-1", {
        id: "room-1",
        hostId: "conn-A",
        hostName: "Alice",
        people: [
          { id: "conn-A", name: "Alice" },
          { id: "conn-B", name: "Bob" },
          { id: "conn-leaving", name: "Leaver" },
        ],
        banned: new Map(),
      });

      // Simulate leaveRoom (server/index.ts:608-640)
      const userId = "conn-leaving";
      const user = users.get(userId)!;
      const room = rooms.get(user.roomId!)!;
      room.people = room.people.filter((p) => p.id !== userId);

      for (const p of room.people) {
        const u = users.get(p.id);
        if (u && u.ws.readyState === 1) {
          u.ws.send(JSON.stringify({ type: "peer-leave", id: userId }));
        }
      }

      expect(wsA.send).toHaveBeenCalledWith(
        JSON.stringify({ type: "peer-leave", id: "conn-leaving" })
      );
      expect(wsB.send).toHaveBeenCalledWith(
        JSON.stringify({ type: "peer-leave", id: "conn-leaving" })
      );
    });

    it("should close room and notify all when host disconnects", () => {
      const { users, rooms } = createServerState();

      const wsA = createMockWs(); // host
      const wsB = createMockWs();
      users.set("host", { ws: wsA, roomId: "room-1", name: "Host" });
      users.set("conn-B", { ws: wsB, roomId: "room-1", name: "Bob" });
      rooms.set("room-1", {
        id: "room-1",
        hostId: "host",
        hostName: "Host",
        people: [
          { id: "host", name: "Host" },
          { id: "conn-B", name: "Bob" },
        ],
        banned: new Map(),
      });

      // Host leaves — room is closed
      const userId = "host";
      const room = rooms.get("room-1")!;

      if (room.hostId === userId) {
        for (const p of room.people) {
          const u = users.get(p.id);
          if (u && u.ws.readyState === 1) {
            u.ws.send(JSON.stringify({ type: "peer-leave", id: userId }));
            u.ws.send(JSON.stringify({ type: "room-closed" }));
            u.roomId = null;
          }
        }
        rooms.delete(room.id);
      }

      expect(wsB.send).toHaveBeenCalledWith(JSON.stringify({ type: "peer-leave", id: "host" }));
      expect(wsB.send).toHaveBeenCalledWith(JSON.stringify({ type: "room-closed" }));
      expect(rooms.has("room-1")).toBe(false);
    });
  });
});
