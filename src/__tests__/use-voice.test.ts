/**
 * Comprehensive tests for the WebRTC voice system (use-voice.ts)
 *
 * Tests organized by bug severity and scenario category.
 * Each test documents a specific bug or validates a critical path.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useVoice } from "@/components/use-voice";
import { MockMediaStream, MockMediaStreamTrack, mockGetUserMedia } from "./setup";

// ─── Helper: create a mock PartyState ────────────────────────────────────────

function createMockParty(myId = "user-A") {
  return {
    myId,
    sendSignal: vi.fn(),
    sendMicReady: vi.fn(),
    onSignal: { current: undefined as ((from: string, signal: unknown) => void) | undefined },
    onPeerJoin: { current: undefined as ((id: string, name: string) => void) | undefined },
    onPeerLeave: { current: undefined as ((id: string) => void) | undefined },
    onMicReady: { current: undefined as ((from: string) => void) | undefined },
    onForceMuted: { current: undefined as (() => void) | undefined },
    effectiveName: "TestUser",
    changeName: vi.fn(),
    rooms: [],
    currentRoom: null,
    currentRoomId: null,
    onlineCount: 1,
    chatMessages: [],
    createRoom: vi.fn(),
    nextQuestion: vi.fn(),
    joinRoom: vi.fn(),
    leaveRoom: vi.fn(),
    sendChat: vi.fn(),
    startPreview: vi.fn(),
    stopPreview: vi.fn(),
    kickPeer: vi.fn(),
    mutePeer: vi.fn(),
    onPreviewStarted: { current: undefined },
    onPreviewStopped: { current: undefined },
    onPreviewUnavailable: { current: undefined },
    onKicked: { current: undefined },
    onBanned: { current: undefined },
    onAdminWarn: { current: undefined },
    onAdminRename: { current: undefined },
    onAdminBlock: { current: undefined },
  } as any;
}

describe("useVoice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserMedia.mockResolvedValue(new MockMediaStream());
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. MICROPHONE ACQUISITION
  // ═���═════════════════════════════════════════════════════════════════════════

  describe("Microphone Acquisition", () => {
    it("should acquire microphone and set micActive on start()", async () => {
      const party = createMockParty();
      const { result } = renderHook(() => useVoice(party));

      await act(async () => {
        await result.current.start();
      });

      expect(result.current.micActive).toBe(true);
      expect(mockGetUserMedia).toHaveBeenCalledWith({
        audio: expect.objectContaining({
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }),
      });
    });

    it("should broadcast mic-ready after acquiring mic", async () => {
      const party = createMockParty();
      const { result } = renderHook(() => useVoice(party));

      await act(async () => {
        await result.current.start();
      });

      expect(party.sendMicReady).toHaveBeenCalledTimes(1);
    });

    it("should handle mic denial gracefully", async () => {
      mockGetUserMedia.mockRejectedValueOnce(new Error("NotAllowedError"));
      const party = createMockParty();
      const { result } = renderHook(() => useVoice(party));

      await act(async () => {
        await result.current.start();
      });

      expect(result.current.micActive).toBe(false);
      expect(party.sendMicReady).not.toHaveBeenCalled();
    });

    it("should not re-acquire mic if already acquired", async () => {
      const party = createMockParty();
      const { result } = renderHook(() => useVoice(party));

      await act(async () => {
        await result.current.start();
      });
      await act(async () => {
        await result.current.start();
      });

      expect(mockGetUserMedia).toHaveBeenCalledTimes(1);
      expect(party.sendMicReady).toHaveBeenCalledTimes(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. PEER CONNECTION ESTABLISHMENT
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Peer Connection - onPeerJoin", () => {
    /**
     * BUG #1 (CRITICAL): Race condition — peer-join arrives before mic is ready.
     *
     * When InsideRoom mounts, voice.start() is called which triggers async
     * getUserMedia(). Meanwhile, the server immediately sends peer-join messages.
     * If onPeerJoin fires before getUserMedia resolves, stream.current is null
     * and the connection is silently dropped with no retry.
     */
    it("BUG: should handle peer-join arriving BEFORE mic is ready", async () => {
      let resolveMic!: (stream: MockMediaStream) => void;
      mockGetUserMedia.mockReturnValue(
        new Promise((resolve) => {
          resolveMic = resolve;
        })
      );

      const party = createMockParty("aaa");
      const { result } = renderHook(() => useVoice(party));

      // Start mic acquisition (not yet resolved) — don't await
      act(() => {
        result.current.start();
      });

      // Peer joins BEFORE mic is ready
      act(() => {
        party.onPeerJoin.current?.("zzz", "Bob");
      });

      // Now resolve mic
      await act(async () => {
        resolveMic(new MockMediaStream());
      });

      // BUG: sendSignal was never called — connection silently lost
      // because stream.current was null when onPeerJoin fired
      expect(party.sendSignal).not.toHaveBeenCalled();
    });

    it("should initiate connection when my ID < peer ID", async () => {
      const party = createMockParty("aaa");
      const { result } = renderHook(() => useVoice(party));

      await act(async () => {
        await result.current.start();
      });

      // connect() is async internally — need to flush promises
      await act(async () => {
        party.onPeerJoin.current?.("zzz", "Peer");
      });

      expect(party.sendSignal).toHaveBeenCalledWith(
        "zzz",
        expect.objectContaining({ type: "offer" })
      );
    });

    it("should NOT initiate connection when my ID > peer ID", async () => {
      const party = createMockParty("zzz");
      const { result } = renderHook(() => useVoice(party));

      await act(async () => {
        await result.current.start();
      });

      await act(async () => {
        party.onPeerJoin.current?.("aaa", "Peer");
      });

      expect(party.sendSignal).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. WEBRTC SIGNALING
  // ═══════════════════════════════════════════════════════════════════════════

  describe("WebRTC Signaling", () => {
    it("should handle offer → create answer → send answer", async () => {
      const party = createMockParty();
      const { result } = renderHook(() => useVoice(party));

      await act(async () => {
        await result.current.start();
      });

      await act(async () => {
        await party.onSignal.current?.("user-B", {
          type: "offer",
          sdp: { type: "offer", sdp: "remote-offer-sdp" },
        });
      });

      expect(party.sendSignal).toHaveBeenCalledWith(
        "user-B",
        expect.objectContaining({ type: "answer" })
      );
    });

    it("should queue ICE candidates arriving before remote description", async () => {
      const party = createMockParty("aaa");
      const { result } = renderHook(() => useVoice(party));

      await act(async () => {
        await result.current.start();
      });

      // Initiate connection
      act(() => {
        party.onPeerJoin.current?.("zzz", "Peer");
      });

      // ICE candidate arrives before answer
      await act(async () => {
        await party.onSignal.current?.("zzz", {
          type: "candidate",
          candidate: { candidate: "early-candidate", sdpMid: "0", sdpMLineIndex: 0 },
        });
      });

      // Then answer arrives — should flush queued candidates
      await act(async () => {
        await party.onSignal.current?.("zzz", {
          type: "answer",
          sdp: { type: "answer", sdp: "remote-answer-sdp" },
        });
      });

      // No throw = success
    });

    /**
     * BUG #2: ICE candidates for unknown peers are queued then wiped.
     *
     * If candidates arrive BEFORE the offer from a peer, they're queued.
     * But when the offer triggers connect(), it calls
     * iceCandidateQueue.current.set(targetId, []) — wiping the queue.
     */
    it("BUG: ICE candidates from unknown peers are queued but may be lost", async () => {
      const party = createMockParty();
      const { result } = renderHook(() => useVoice(party));

      await act(async () => {
        await result.current.start();
      });

      // Candidate arrives from unknown peer (before any offer)
      await act(async () => {
        await party.onSignal.current?.("unknown-peer", {
          type: "candidate",
          candidate: { candidate: "orphan-candidate" },
        });
      });

      // Offer arrives — connect() resets the queue
      await act(async () => {
        await party.onSignal.current?.("unknown-peer", {
          type: "offer",
          sdp: { type: "offer", sdp: "late-offer" },
        });
      });

      // The orphan candidate was lost because connect() reset the queue
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. MUTE / UNMUTE
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Mute / Unmute", () => {
    it("should toggle mute state", async () => {
      const party = createMockParty();
      const { result } = renderHook(() => useVoice(party));

      expect(result.current.muted).toBe(false);

      act(() => result.current.toggleMute());
      expect(result.current.muted).toBe(true);

      act(() => result.current.toggleMute());
      expect(result.current.muted).toBe(false);
    });

    it("should disable audio tracks when muting", async () => {
      const mockTrack = new MockMediaStreamTrack();
      mockGetUserMedia.mockResolvedValueOnce(new MockMediaStream([mockTrack]));

      const party = createMockParty();
      const { result } = renderHook(() => useVoice(party));

      await act(async () => {
        await result.current.start();
      });

      act(() => result.current.toggleMute());
      expect(mockTrack.enabled).toBe(false);
    });

    it("should re-enable audio tracks when unmuting", async () => {
      const mockTrack = new MockMediaStreamTrack();
      mockGetUserMedia.mockResolvedValueOnce(new MockMediaStream([mockTrack]));

      const party = createMockParty();
      const { result } = renderHook(() => useVoice(party));

      await act(async () => {
        await result.current.start();
      });

      act(() => result.current.toggleMute());
      expect(mockTrack.enabled).toBe(false);

      act(() => result.current.toggleMute());
      expect(mockTrack.enabled).toBe(true);
    });

    /**
     * BUG #3: replaceTrack errors are silently swallowed.
     *
     * sender.replaceTrack() uses .catch(() => {}). If it fails,
     * user sees UI toggle but audio isn't actually muted/unmuted.
     */
    it("BUG: replaceTrack failure during unmute leaves audio broken silently", async () => {
      const mockTrack = new MockMediaStreamTrack();
      mockGetUserMedia.mockResolvedValueOnce(new MockMediaStream([mockTrack]));

      const party = createMockParty("aaa");
      const { result } = renderHook(() => useVoice(party));

      await act(async () => {
        await result.current.start();
      });

      // Create a peer connection
      act(() => party.onPeerJoin.current?.("zzz", "Peer"));

      act(() => result.current.toggleMute());
      expect(result.current.muted).toBe(true);

      act(() => result.current.toggleMute());
      expect(result.current.muted).toBe(false);
      // No way to know if replaceTrack actually succeeded — errors swallowed
    });

    /**
     * BUG #4: toggleMute uses stale closure for `muted`.
     *
     * useCallback([muted]) — if called twice before re-render,
     * both calls see same `muted` value, double-toggle cancels out.
     */
    it("BUG: rapid double-toggle may use stale muted state", async () => {
      const party = createMockParty();
      const { result } = renderHook(() => useVoice(party));

      act(() => {
        result.current.toggleMute();
        result.current.toggleMute();
      });

      // Due to stale closure, both calls compute !false = true
      // So muted ends up true instead of false (the expected round-trip)
      // This test documents the stale closure pattern
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. FORCE MUTE
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Force Mute", () => {
    it("should mute when force-muted by host", async () => {
      const mockTrack = new MockMediaStreamTrack();
      mockGetUserMedia.mockResolvedValueOnce(new MockMediaStream([mockTrack]));

      const party = createMockParty();
      const { result } = renderHook(() => useVoice(party));

      await act(async () => {
        await result.current.start();
      });

      expect(result.current.muted).toBe(false);

      act(() => party.onForceMuted.current?.());

      expect(result.current.muted).toBe(true);
      expect(result.current.wasForceMuted).toBe(true);
      expect(mockTrack.enabled).toBe(false);
    });

    /**
     * FIXED: Force mute now always sets wasForceMuted flag,
     * even if user was already muted — so the toast always shows.
     */
    it("FIXED: force mute sets wasForceMuted even if already muted", async () => {
      const party = createMockParty();
      const { result } = renderHook(() => useVoice(party));

      await act(async () => {
        await result.current.start();
      });

      act(() => result.current.toggleMute());
      expect(result.current.muted).toBe(true);

      act(() => party.onForceMuted.current?.());

      // Now wasForceMuted is always set
      expect(result.current.wasForceMuted).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. ICE CONNECTION STATE
  // ═══════════════════════════════════════════════════════════════════════════

  describe("ICE Connection State", () => {
    /**
     * BUG #6 (CRITICAL): No ICE restart or reconnection on failure.
     *
     * When iceConnectionState goes to "failed", the peer is removed from
     * connectedPeers but the broken RTCPeerConnection stays in peers.current.
     * No reconnection or ICE restart is attempted. User must leave and rejoin.
     */
    it("BUG: ICE failure leaves broken connection with no recovery", async () => {
      const party = createMockParty("aaa");
      const { result } = renderHook(() => useVoice(party));

      await act(async () => {
        await result.current.start();
      });

      act(() => party.onPeerJoin.current?.("zzz", "Peer"));

      // The code at use-voice.ts:187-199 only updates connectedPeers
      // but does NOT:
      // - Attempt ICE restart (pc.restartIce())
      // - Close and recreate the connection
      // - Notify the user of the failure
    });

    /**
     * BUG #7: Only iceConnectionState is monitored, not connectionState.
     *
     * connectionState is more reliable. A connection can have
     * iceConnectionState "connected" but connectionState "failed".
     */
    it("BUG: connectionState is not monitored at all", () => {
      // use-voice.ts only sets pc.oniceconnectionstatechange
      // It does NOT set pc.onconnectionstatechange
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. NO TURN SERVER
  // ═══════════════════════════════════════════════════════════════════════════

  describe("ICE Server Configuration", () => {
    /**
     * BUG #8 (MOST CRITICAL): No TURN server configured.
     *
     * Only STUN servers are used. Mobile networks (4G/5G) use symmetric NAT.
     * Without TURN relay, WebRTC connections WILL FAIL for:
     * - Mobile users on cellular data
     * - Users behind corporate firewalls
     * - Users in countries with strict network policies
     *
     * This is THE #1 cause of "voice not working on phone".
     */
    it("BUG: only STUN servers — no TURN relay for symmetric NAT", () => {
      // ICE_SERVERS at use-voice.ts:27-33 only contains stun: URLs
      // Needs turn: URLs for reliable mobile/firewall connectivity
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. CLEANUP
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Cleanup", () => {
    it("should stop all tracks and close connections on stop()", async () => {
      const mockTrack = new MockMediaStreamTrack();
      mockGetUserMedia.mockResolvedValueOnce(new MockMediaStream([mockTrack]));

      const party = createMockParty();
      const { result } = renderHook(() => useVoice(party));

      await act(async () => {
        await result.current.start();
      });

      act(() => result.current.stop());

      expect(mockTrack.readyState).toBe("ended");
      expect(result.current.micActive).toBe(false);
      expect(result.current.connectedPeers.size).toBe(0);
    });

    it("should handle disconnect for non-existent peer without throwing", async () => {
      const party = createMockParty();
      const { result } = renderHook(() => useVoice(party));

      await act(async () => {
        await result.current.start();
      });

      act(() => party.onPeerLeave.current?.("nonexistent"));
      // No throw = pass
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. MIC-READY HANDSHAKE
  // ═══════════════════════════════════════════════════════════════════════════

  describe("mic-ready Handshake", () => {
    it("should initiate connection on mic-ready if my ID < peer ID", async () => {
      const party = createMockParty("aaa");
      const { result } = renderHook(() => useVoice(party));

      await act(async () => {
        await result.current.start();
      });

      await act(async () => {
        party.onMicReady.current?.("zzz");
      });

      expect(party.sendSignal).toHaveBeenCalledWith(
        "zzz",
        expect.objectContaining({ type: "offer" })
      );
    });

    it("should echo mic-ready if my ID > peer ID", async () => {
      const party = createMockParty("zzz");
      const { result } = renderHook(() => useVoice(party));

      await act(async () => {
        await result.current.start();
      });

      await act(async () => {
        party.onMicReady.current?.("aaa");
      });

      expect(party.sendMicReady).toHaveBeenCalledTimes(2); // start() + echo
      expect(party.sendSignal).not.toHaveBeenCalled();
    });

    it("should not duplicate connection if already connected", async () => {
      const party = createMockParty("aaa");
      const { result } = renderHook(() => useVoice(party));

      await act(async () => {
        await result.current.start();
      });

      await act(async () => {
        party.onMicReady.current?.("zzz");
      });
      const firstCallCount = party.sendSignal.mock.calls.length;

      await act(async () => {
        party.onMicReady.current?.("zzz");
      });
      expect(party.sendSignal.mock.calls.length).toBe(firstCallCount);
    });

    /**
     * BUG #9: mic-ready from peer is lost if local mic isn't ready.
     *
     * onMicReady checks `if (!stream.current || !myIdRef.current) return;`
     * If getUserMedia hasn't resolved yet, the mic-ready is silently dropped.
     * No buffering, no retry.
     */
    it("BUG: mic-ready from peer is lost if local mic not ready", async () => {
      let resolveMic!: (s: MockMediaStream) => void;
      mockGetUserMedia.mockReturnValue(
        new Promise((resolve) => {
          resolveMic = resolve;
        })
      );

      const party = createMockParty("aaa");
      const { result } = renderHook(() => useVoice(party));

      // Start mic acquisition (not resolved yet)
      act(() => {
        result.current.start();
      });

      // Peer's mic-ready arrives before our mic is ready
      act(() => party.onMicReady.current?.("zzz"));

      // Now mic resolves
      await act(async () => {
        resolveMic(new MockMediaStream());
      });

      // The mic-ready from "zzz" was silently dropped — no connection
      // sendSignal only has the mic-ready broadcast, no offer
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. AUDIO PLAYBACK
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Audio Playback", () => {
    /**
     * BUG #10: audio.play() blocked on mobile without user gesture.
     *
     * Mobile browsers require user gesture for audio playback.
     * audio.play().catch(() => {}) silently swallows autoplay rejection.
     * User sees connection established but hears nothing.
     */
    it("BUG: autoplay rejection on mobile is silently swallowed", () => {
      // createAudioElement sets autoplay=true, play().catch(() => {})
      // On mobile, this fails silently without user gesture.
      // Fix: detect failure, show "tap to listen" button.
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 11. WEBSOCKET RECONNECTION
  // ═══════════════════════════════════════════════════════════════════════════

  describe("WebSocket Reconnection", () => {
    /**
     * BUG #11: WebSocket reconnect doesn't reset voice state.
     *
     * On reconnect, user gets new myId. Existing peer connections still
     * use old signaling IDs. Voice connections die silently.
     */
    it("BUG: voice connections break on WebSocket reconnect", () => {
      // myIdRef is updated but existing RTCPeerConnections
      // still use old signaling IDs. Server maps by connection ID.
    });
  });
});
