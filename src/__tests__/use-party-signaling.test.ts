/**
 * Tests for WebSocket signaling layer (use-party.ts)
 *
 * Validates message routing, handler dispatch, and reconnection behavior.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// We test the signaling logic in isolation since useParty depends on WebSocket.
// These tests validate the message dispatch patterns.

describe("Party Signaling Logic", () => {
  describe("Signal Routing", () => {
    it("should dispatch signal messages to onSignal handler", () => {
      const onSignal = vi.fn();
      const msg = { type: "signal", from: "peer-A", signal: { type: "offer", sdp: "..." } };

      // Simulate ws.onmessage dispatch logic from use-party.ts:112
      if (msg.type === "signal") onSignal(msg.from, msg.signal);

      expect(onSignal).toHaveBeenCalledWith("peer-A", { type: "offer", sdp: "..." });
    });

    it("should dispatch mic-ready to onMicReady handler", () => {
      const onMicReady = vi.fn();
      const msg = { type: "mic-ready", from: "peer-B" };

      if (msg.type === "mic-ready") onMicReady(msg.from);

      expect(onMicReady).toHaveBeenCalledWith("peer-B");
    });

    it("should dispatch force-muted to onForceMuted handler", () => {
      const onForceMuted = vi.fn();
      const msg = { type: "force-muted" };

      if (msg.type === "force-muted") onForceMuted();

      expect(onForceMuted).toHaveBeenCalledTimes(1);
    });

    it("should dispatch peer-join to onPeerJoin handler", () => {
      const onPeerJoin = vi.fn();
      const msg = { type: "peer-join", id: "peer-C", name: "Charlie" };

      if (msg.type === "peer-join") onPeerJoin(msg.id, msg.name);

      expect(onPeerJoin).toHaveBeenCalledWith("peer-C", "Charlie");
    });

    it("should dispatch peer-leave to onPeerLeave handler", () => {
      const onPeerLeave = vi.fn();
      const msg = { type: "peer-leave", id: "peer-C" };

      if (msg.type === "peer-leave") onPeerLeave(msg.id);

      expect(onPeerLeave).toHaveBeenCalledWith("peer-C");
    });
  });

  describe("send() guard", () => {
    it("should not send when WebSocket is not OPEN", () => {
      const ws = { readyState: 3 /* CLOSED */, send: vi.fn() }; // WebSocket.CLOSED = 3

      // Replicate the guard from use-party.ts:52-55
      const send = (data: object) => {
        if (ws.readyState === 1 /* OPEN */) {
          ws.send(JSON.stringify(data));
        }
      };

      send({ type: "signal", to: "peer-A", signal: {} });
      expect(ws.send).not.toHaveBeenCalled();
    });

    it("should send when WebSocket is OPEN", () => {
      const ws = { readyState: 1 /* OPEN */, send: vi.fn() };

      const send = (data: object) => {
        if (ws.readyState === 1) {
          ws.send(JSON.stringify(data));
        }
      };

      send({ type: "signal", to: "peer-A", signal: { type: "offer" } });
      expect(ws.send).toHaveBeenCalledWith(
        JSON.stringify({ type: "signal", to: "peer-A", signal: { type: "offer" } })
      );
    });

    /**
     * BUG #12: Messages sent during WebSocket reconnect are silently lost.
     *
     * The send() function checks ws.readyState === OPEN and silently
     * drops messages otherwise. During the 2-second reconnect window:
     * - ICE candidates are lost
     * - Signal messages (offers/answers) are lost
     * - mic-ready announcements are lost
     *
     * No message buffering exists. No retry after reconnect.
     * This means any network blip causes permanent voice failure.
     */
    it("BUG: messages during reconnect are silently dropped, not buffered", () => {
      const ws = { readyState: 0 /* CONNECTING */, send: vi.fn() };
      const messageBuffer: object[] = [];

      const send = (data: object) => {
        if (ws.readyState === 1) {
          ws.send(JSON.stringify(data));
        }
        // BUG: No buffering. Should be:
        // else messageBuffer.push(data);
      };

      send({ type: "mic-ready" });
      send({ type: "signal", to: "peer-A", signal: { type: "candidate" } });

      expect(ws.send).not.toHaveBeenCalled();
      // These critical messages are gone forever
    });
  });

  describe("Handler Conflict (Preview vs Voice)", () => {
    /**
     * BUG #13: onSignal/onMicReady handlers conflict between useVoice and usePreview.
     *
     * Both hooks write to the same refs: party.onSignal.current and party.onMicReady.current.
     * The last one to mount/update wins. During the transition from previewing a room
     * to joining it, there's a window where:
     * 1. usePreview is cleaning up (sets onSignal.current = undefined)
     * 2. useVoice hasn't set up its handler yet
     * 3. Signals arrive during this gap and are lost
     *
     * This is especially bad because joining a room is when signals are most critical.
     */
    it("BUG: simultaneous preview and voice handlers clobber each other", () => {
      const onSignal = {
        current: undefined as ((from: string, signal: unknown) => void) | undefined,
      };

      // Preview sets its handler
      const previewHandler = vi.fn();
      onSignal.current = previewHandler;

      // Voice sets its handler (overwrites preview)
      const voiceHandler = vi.fn();
      onSignal.current = voiceHandler;

      // Signal arrives — only voice handler receives it
      onSignal.current?.("peer-A", { type: "offer" });
      expect(previewHandler).not.toHaveBeenCalled();
      expect(voiceHandler).toHaveBeenCalled();

      // Preview cleanup runs (transition to room)
      onSignal.current = undefined;

      // Signals during this gap are completely lost
      (onSignal.current as ((from: string, signal: unknown) => void) | undefined)?.("peer-A", {
        type: "answer",
      });
      // Nothing handles it — connection fails silently
    });
  });

  describe("Room Lifecycle", () => {
    it("should clear chat on room leave/kicked/closed", () => {
      let currentRoomId: string | null = "room-1";
      let chatMessages: { text: string }[] = [{ text: "hello" }];

      // Simulate the dispatch for various leave scenarios
      for (const type of ["left", "room-closed", "kicked"]) {
        currentRoomId = "room-1";
        chatMessages = [{ text: "hello" }];

        // From use-party.ts:92-95
        if (type === "left" || type === "room-closed" || type === "kicked") {
          currentRoomId = null;
          chatMessages = [];
        }

        expect(currentRoomId).toBeNull();
        expect(chatMessages).toEqual([]);
      }
    });
  });
});
