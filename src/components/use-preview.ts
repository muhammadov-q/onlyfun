"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import type { PartyState } from "./use-party";

function createAudioElement(): HTMLAudioElement {
  const audio = document.createElement("audio");
  audio.autoplay = true;
  audio.setAttribute("playsinline", "");
  audio.style.position = "absolute";
  audio.style.width = "0";
  audio.style.height = "0";
  audio.style.opacity = "0";
  document.body.appendChild(audio);
  return audio;
}

function removeAudioElement(audio: HTMLAudioElement) {
  audio.pause();
  audio.srcObject = null;
  audio.remove();
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    ...(process.env.NEXT_PUBLIC_TURN_URL
      ? [
          {
            urls: process.env.NEXT_PUBLIC_TURN_URL,
            username: process.env.NEXT_PUBLIC_TURN_USER ?? "",
            credential: process.env.NEXT_PUBLIC_TURN_PASS ?? "",
          },
        ]
      : []),
  ],
};

const PREVIEW_MS = 6000;
const COOLDOWN_MS = 5 * 60 * 1000;
const LS_KEY = "onlyfun_preview_cd";

// ─── localStorage cooldown helpers ────────────────────────────────────────────

function getCooldowns(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveCooldown(roomId: string, remainingMs?: number) {
  const cd = getCooldowns();
  cd[roomId] = Date.now() + (remainingMs ?? COOLDOWN_MS);
  // Prune expired entries
  const now = Date.now();
  for (const k of Object.keys(cd)) {
    if (cd[k] < now) delete cd[k];
  }
  localStorage.setItem(LS_KEY, JSON.stringify(cd));
}

function getRemainingMs(roomId: string): number {
  const cd = getCooldowns();
  const until = cd[roomId] ?? 0;
  return Math.max(0, until - Date.now());
}

function formatCountdown(ms: number): string {
  const sec = Math.ceil(ms / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePreview(party: PartyState) {
  const {
    sendSignal,
    startPreview: serverStart,
    stopPreview: serverStop,
    onSignal,
    onMicReady,
    onPreviewStarted,
    onPreviewStopped,
    onPreviewUnavailable,
    onPreviewCooldown,
  } = party;

  const [previewingRoomId, setPreviewingRoomId] = useState<string | null>(null);
  const [previewCountdown, setPreviewCountdown] = useState<number>(0);
  const [cooldownMsg, setCooldownMsg] = useState<string | null>(null);

  const peers = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audios = useRef<Map<string, HTMLAudioElement>>(new Map());
  const iceQueue = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const cooldownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cooldownInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeRef = useRef(false);
  const previewStartTime = useRef(0);

  // ── Receive-only WebRTC connection ──

  const connectTo = useCallback(
    async (targetId: string, initiator: boolean) => {
      if (peers.current.has(targetId)) return;

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peers.current.set(targetId, pc);
      iceQueue.current.set(targetId, []);

      if (initiator) {
        pc.addTransceiver("audio", { direction: "recvonly" });
      }

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          sendSignal(targetId, { type: "candidate", candidate: e.candidate.toJSON() });
        }
      };

      pc.ontrack = (e) => {
        let audio = audios.current.get(targetId);
        if (!audio) {
          audio = createAudioElement();
          audios.current.set(targetId, audio);
        }
        audio.srcObject = e.streams[0];
        audio.play().catch(() => {
          // Autoplay blocked on mobile — retry on next user interaction
          const resume = () => {
            audio?.play().catch(() => {});
            document.removeEventListener("click", resume);
            document.removeEventListener("touchstart", resume);
          };
          document.addEventListener("click", resume, { once: true });
          document.addEventListener("touchstart", resume, { once: true });
        });
      };

      if (initiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignal(targetId, { type: "offer", sdp: pc.localDescription!.toJSON() });
      }
    },
    [sendSignal]
  );

  const flushIce = useCallback(async (targetId: string) => {
    const pc = peers.current.get(targetId);
    const queue = iceQueue.current.get(targetId);
    if (!pc || !queue) return;
    for (const c of queue) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      } catch {}
    }
    iceQueue.current.set(targetId, []);
  }, []);

  // ── Cleanup ──

  const cleanupAll = useCallback(() => {
    for (const [, pc] of peers.current) pc.close();
    peers.current.clear();
    for (const [, audio] of audios.current) {
      removeAudioElement(audio);
    }
    audios.current.clear();
    iceQueue.current.clear();
    if (stopTimer.current) clearTimeout(stopTimer.current);
    if (countdownInterval.current) clearInterval(countdownInterval.current);
    stopTimer.current = null;
    countdownInterval.current = null;
  }, []);

  // ── Stop preview ──

  const stop = useCallback(() => {
    if (!activeRef.current) return;
    activeRef.current = false;
    cleanupAll();
    serverStop();
    setPreviewingRoomId(null);
    setPreviewCountdown(0);
    onSignal.current = undefined;
    onMicReady.current = undefined;
  }, [cleanupAll, serverStop, onSignal, onMicReady]);

  // ── Start preview ──

  const start = useCallback(
    (roomId: string) => {
      // Check cooldown
      const remaining = getRemainingMs(roomId);
      if (remaining > 0) {
        setCooldownMsg(formatCountdown(remaining));
        if (cooldownInterval.current) clearInterval(cooldownInterval.current);
        if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
        cooldownInterval.current = setInterval(() => {
          const r = getRemainingMs(roomId);
          if (r <= 0) {
            setCooldownMsg(null);
            if (cooldownInterval.current) clearInterval(cooldownInterval.current);
          } else {
            setCooldownMsg(formatCountdown(r));
          }
        }, 1000);
        cooldownTimer.current = setTimeout(() => {
          setCooldownMsg(null);
          if (cooldownInterval.current) clearInterval(cooldownInterval.current);
        }, 4000);
        return;
      }

      // Stop any existing preview
      if (activeRef.current) stop();

      activeRef.current = true;
      previewStartTime.current = Date.now();
      setPreviewingRoomId(roomId);
      setPreviewCountdown(Math.ceil(PREVIEW_MS / 1000));

      // Countdown display
      countdownInterval.current = setInterval(() => {
        const elapsed = Date.now() - previewStartTime.current;
        const left = Math.max(0, Math.ceil((PREVIEW_MS - elapsed) / 1000));
        setPreviewCountdown(left);
      }, 500);

      // Set up signal handler for preview WebRTC
      onSignal.current = async (from: string, signal: unknown) => {
        if (!activeRef.current) return;
        const s = signal as {
          type: string;
          sdp?: RTCSessionDescriptionInit;
          candidate?: RTCIceCandidateInit;
        };

        if (s.type === "offer") {
          await connectTo(from, false);
          const pc = peers.current.get(from);
          if (!pc || !s.sdp) return;
          await pc.setRemoteDescription(new RTCSessionDescription(s.sdp));
          await flushIce(from);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendSignal(from, { type: "answer", sdp: pc.localDescription!.toJSON() });
        }

        if (s.type === "answer") {
          const pc = peers.current.get(from);
          if (!pc || !s.sdp) return;
          await pc.setRemoteDescription(new RTCSessionDescription(s.sdp));
          await flushIce(from);
        }

        if (s.type === "candidate") {
          const pc = peers.current.get(from);
          if (pc && pc.remoteDescription) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(s.candidate!));
            } catch {}
          } else {
            const queue = iceQueue.current.get(from) ?? [];
            queue.push(s.candidate!);
            iceQueue.current.set(from, queue);
          }
        }
      };

      // Handle mic-ready from room members who need us to initiate
      onMicReady.current = (from: string) => {
        if (!activeRef.current) return;
        if (peers.current.has(from)) return;
        connectTo(from, true);
      };

      // Send preview request to server
      serverStart(roomId);

      // Auto-stop after PREVIEW_MS
      stopTimer.current = setTimeout(() => {
        saveCooldown(roomId);
        stop();
      }, PREVIEW_MS);
    },
    [stop, connectTo, flushIce, sendSignal, onSignal, onMicReady, serverStart]
  );

  // ── Server-initiated stop ──

  useEffect(() => {
    onPreviewStopped.current = () => {
      if (activeRef.current) {
        const roomId = previewingRoomId;
        if (roomId) saveCooldown(roomId);
        activeRef.current = false;
        cleanupAll();
        setPreviewingRoomId(null);
        setPreviewCountdown(0);
        onSignal.current = undefined;
        onMicReady.current = undefined;
      }
    };

    onPreviewStarted.current = () => {
      // Server confirmed — connections will arrive via peer-join/signal
    };

    onPreviewUnavailable.current = () => {
      // Room has no real participants — just stop silently
      if (activeRef.current) {
        activeRef.current = false;
        cleanupAll();
        setPreviewingRoomId(null);
        setPreviewCountdown(0);
        onSignal.current = undefined;
        onMicReady.current = undefined;
      }
    };

    onPreviewCooldown.current = (_roomId: string, remainingMs: number) => {
      // Server rejected — still on cooldown for this room
      if (activeRef.current) {
        activeRef.current = false;
        cleanupAll();
        setPreviewingRoomId(null);
        setPreviewCountdown(0);
        onSignal.current = undefined;
        onMicReady.current = undefined;
      }
      // Sync client-side cooldown with server's remaining time
      saveCooldown(_roomId, remainingMs);
      setCooldownMsg(formatCountdown(remainingMs));
      if (cooldownInterval.current) clearInterval(cooldownInterval.current);
      if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
      cooldownInterval.current = setInterval(() => {
        const r = getRemainingMs(_roomId);
        if (r <= 0) {
          setCooldownMsg(null);
          if (cooldownInterval.current) clearInterval(cooldownInterval.current);
        } else {
          setCooldownMsg(formatCountdown(r));
        }
      }, 1000);
      cooldownTimer.current = setTimeout(
        () => {
          setCooldownMsg(null);
          if (cooldownInterval.current) clearInterval(cooldownInterval.current);
        },
        Math.min(remainingMs + 1000, 10000)
      );
    };

    return () => {
      onPreviewStopped.current = undefined;
      onPreviewStarted.current = undefined;
      onPreviewUnavailable.current = undefined;
      onPreviewCooldown.current = undefined;
    };
  }, [
    previewingRoomId,
    cleanupAll,
    onSignal,
    onMicReady,
    onPreviewStarted,
    onPreviewStopped,
    onPreviewUnavailable,
    onPreviewCooldown,
  ]);

  // Stop preview when entering a room
  useEffect(() => {
    if (party.currentRoomId && activeRef.current) {
      stop();
    }
  }, [party.currentRoomId, stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (activeRef.current) {
        cleanupAll();
        serverStop();
      }
      if (cooldownInterval.current) clearInterval(cooldownInterval.current);
      if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
    };
  }, [cleanupAll, serverStop]);

  return {
    startPreview: start,
    stopPreview: stop,
    previewingRoomId,
    previewCountdown,
    cooldownMsg,
  };
}
