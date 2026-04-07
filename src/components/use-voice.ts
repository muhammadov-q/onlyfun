"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type { PartyState } from "./use-party";

// Create a DOM-attached <audio> element so mobile browsers route through
// the active audio device (earbuds/headphones) instead of the speaker.
function createAudioElement(): HTMLAudioElement {
  const audio = document.createElement("audio");
  audio.autoplay = true;
  audio.setAttribute("playsinline", "");
  // Hidden but in DOM — iOS needs this for proper audio routing
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

// Fallback STUN-only config (used if API fails)
const FALLBACK_ICE: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }],
};

// Cached Cloudflare TURN credentials (refreshed every 12h)
let cachedIceConfig: RTCConfiguration | null = null;
let cacheExpiry = 0;

async function getIceServers(): Promise<RTCConfiguration> {
  if (cachedIceConfig && Date.now() < cacheExpiry) return cachedIceConfig;
  try {
    const res = await fetch("/api/turn-credentials");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    cachedIceConfig = { iceServers: data.iceServers };
    cacheExpiry = Date.now() + 12 * 60 * 60 * 1000; // cache 12h
    console.log("[voice] TURN credentials loaded:", data.iceServers.length, "servers");
    return cachedIceConfig;
  } catch (e) {
    console.warn("[voice] Failed to fetch TURN credentials, using STUN only:", e);
    return FALLBACK_ICE;
  }
}

// Max retries for ICE restart before giving up
const MAX_ICE_RESTARTS = 3;

export function useVoice(party: PartyState) {
  const { myId, sendSignal, sendMicReady, onSignal, onPeerJoin, onPeerLeave, onMicReady } = party;
  const [muted, setMuted] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [connectedPeers, setConnectedPeers] = useState<Set<string>>(new Set());
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingPeers, setSpeakingPeers] = useState<Set<string>>(new Set());
  const [wasForceMuted, setWasForceMuted] = useState(false);

  const stream = useRef<MediaStream | null>(null);
  const peers = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audios = useRef<Map<string, HTMLAudioElement>>(new Map());
  const iceCandidateQueue = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const iceRestartCount = useRef<Map<string, number>>(new Map());
  const myIdRef = useRef(myId);
  myIdRef.current = myId;

  // Pending mic-ready messages that arrived before our mic was ready
  const pendingMicReady = useRef<Set<string>>(new Set());

  // Pending offers that arrived before our mic was ready (mobile: getUserMedia is slow)
  const pendingOffers = useRef<Map<string, { sdp: RTCSessionDescriptionInit }>>(new Map());

  // Speaking detection
  const audioCtxRef = useRef<AudioContext | null>(null);
  const localAnalyser = useRef<{ node: AnalyserNode; buf: Uint8Array<ArrayBuffer> } | null>(null);
  const peerAnalysers = useRef<Map<string, { node: AnalyserNode; buf: Uint8Array<ArrayBuffer> }>>(
    new Map()
  );
  const rafId = useRef<number>(0);
  const mutedRef = useRef(false);
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  // Get microphone
  const getMic = useCallback(async () => {
    if (stream.current) return stream.current;
    try {
      // Prefer headset/earbuds mic if connected
      let audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      };
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const mics = devices.filter((d) => d.kind === "audioinput" && d.deviceId);
        const headset = mics.find(
          (d) =>
            d.label.toLowerCase().includes("headset") ||
            d.label.toLowerCase().includes("airpod") ||
            d.label.toLowerCase().includes("earbud") ||
            d.label.toLowerCase().includes("hands-free") ||
            d.deviceId === "communications"
        );
        if (headset) audioConstraints.deviceId = { ideal: headset.deviceId };
      } catch {}
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
      });
      setMicActive(true);

      // Set up audio-level polling for speaking detection
      try {
        const ctx = new AudioContext();
        await ctx.resume();
        audioCtxRef.current = ctx;

        const node = ctx.createAnalyser();
        node.fftSize = 256;
        const buf = new Uint8Array(node.frequencyBinCount) as Uint8Array<ArrayBuffer>;
        localAnalyser.current = { node, buf };
        ctx.createMediaStreamSource(stream.current).connect(node);

        const poll = () => {
          // Local speaking
          if (localAnalyser.current && !mutedRef.current) {
            localAnalyser.current.node.getByteFrequencyData(localAnalyser.current.buf);
            const len = localAnalyser.current.buf.length;
            let sum = 0;
            for (let i = 0; i < len; i++) sum += localAnalyser.current.buf[i];
            setIsSpeaking(sum / len > 12);
          } else {
            setIsSpeaking(false);
          }

          // Remote peers speaking
          const speakers = new Set<string>();
          for (const [id, a] of peerAnalysers.current) {
            a.node.getByteFrequencyData(a.buf);
            const len = a.buf.length;
            let sum = 0;
            for (let i = 0; i < len; i++) sum += a.buf[i];
            if (sum / len > 8) speakers.add(id);
          }
          setSpeakingPeers(speakers);

          rafId.current = requestAnimationFrame(poll);
        };
        rafId.current = requestAnimationFrame(poll);
      } catch {
        // Speaking detection unavailable — silently skip
      }

      return stream.current;
    } catch (err) {
      console.error("Mic denied:", err);
      return null;
    }
  }, []);

  // Create a WebRTC peer connection to a target
  const connect = useCallback(
    async (targetId: string, initiator: boolean) => {
      if (peers.current.has(targetId)) return;

      const mic = stream.current;
      if (!mic) return;

      const iceConfig = await getIceServers();
      const pc = new RTCPeerConnection(iceConfig);
      peers.current.set(targetId, pc);

      // Preserve any ICE candidates that arrived before this connection was created
      if (!iceCandidateQueue.current.has(targetId)) {
        iceCandidateQueue.current.set(targetId, []);
      }

      // Add our audio track
      for (const track of mic.getTracks()) {
        pc.addTrack(track, mic);
      }

      // If we're currently muted, replace track with null immediately
      if (mutedRef.current) {
        for (const sender of pc.getSenders()) {
          if (sender.track?.kind === "audio") {
            sender.replaceTrack(null).catch((e) => console.warn("replaceTrack mute:", e));
          }
        }
      }

      // When we get ICE candidates, send them
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          sendSignal(targetId, { type: "candidate", candidate: e.candidate.toJSON() });
        }
      };

      // When we receive remote audio, play it + hook up speaking analyser
      pc.ontrack = (e) => {
        let audio = audios.current.get(targetId);
        if (!audio) {
          audio = createAudioElement();
          audios.current.set(targetId, audio);
        }
        audio.srcObject = e.streams[0];
        audio.play().catch((err) => {
          // Autoplay blocked — retry on next user interaction
          console.warn("Audio autoplay blocked for peer", targetId, err);
          const resume = () => {
            audio?.play().catch(() => {});
            document.removeEventListener("click", resume);
            document.removeEventListener("touchstart", resume);
          };
          document.addEventListener("click", resume, { once: true });
          document.addEventListener("touchstart", resume, { once: true });
        });

        // Connect remote stream to an analyser for speaking detection
        const ctx = audioCtxRef.current;
        if (ctx && e.streams[0]) {
          try {
            const node = ctx.createAnalyser();
            node.fftSize = 256;
            const buf = new Uint8Array(node.frequencyBinCount) as Uint8Array<ArrayBuffer>;
            ctx.createMediaStreamSource(e.streams[0]).connect(node);
            peerAnalysers.current.set(targetId, { node, buf });
          } catch {}
        }
      };

      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        console.log(`[voice] ICE ${targetId}: ${state}`);
        if (state === "connected" || state === "completed") {
          // Log the selected candidate pair for debugging connectivity
          pc.getStats().then((stats) => {
            stats.forEach((report) => {
              if (report.type === "candidate-pair" && report.state === "succeeded") {
                const local = stats.get(report.localCandidateId);
                const remote = stats.get(report.remoteCandidateId);
                console.log(
                  `[voice] Connected via ${local?.candidateType ?? "?"} → ${remote?.candidateType ?? "?"}`,
                  local?.protocol ?? ""
                );
              }
            });
          });
          setConnectedPeers((s) => new Set([...s, targetId]));
          iceRestartCount.current.set(targetId, 0);
        }
        if (state === "disconnected") {
          // Transient — wait for recovery before taking action
          setConnectedPeers((s) => {
            const n = new Set(s);
            n.delete(targetId);
            return n;
          });
        }
        if (state === "failed") {
          // Attempt ICE restart before giving up
          const restarts = iceRestartCount.current.get(targetId) ?? 0;
          if (restarts < MAX_ICE_RESTARTS) {
            iceRestartCount.current.set(targetId, restarts + 1);
            console.warn(
              `[voice] ICE failed for ${targetId}, restarting (attempt ${restarts + 1}/${MAX_ICE_RESTARTS})`
            );
            pc.restartIce();
            pc.createOffer({ iceRestart: true })
              .then((offer) => pc.setLocalDescription(offer))
              .then(() => {
                if (pc.localDescription) {
                  sendSignal(targetId, { type: "offer", sdp: pc.localDescription.toJSON() });
                }
              })
              .catch((e) => console.warn("[voice] ICE restart failed:", e));
          } else {
            console.warn(
              `[voice] ICE failed for ${targetId} after ${MAX_ICE_RESTARTS} restarts, giving up`
            );
            setConnectedPeers((s) => {
              const n = new Set(s);
              n.delete(targetId);
              return n;
            });
          }
        }
        if (state === "closed") {
          setConnectedPeers((s) => {
            const n = new Set(s);
            n.delete(targetId);
            return n;
          });
        }
      };

      pc.onconnectionstatechange = () => {
        console.log(`[voice] Connection ${targetId}: ${pc.connectionState}`);
        if (pc.connectionState === "failed") {
          // DTLS failure — full reconnect needed
          console.warn(`[voice] DTLS failed for ${targetId}`);
        }
      };

      if (initiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignal(targetId, { type: "offer", sdp: pc.localDescription!.toJSON() });
      }
    },
    [sendSignal]
  );

  const disconnect = useCallback((targetId: string) => {
    const pc = peers.current.get(targetId);
    if (pc) {
      pc.close();
      peers.current.delete(targetId);
    }
    const a = audios.current.get(targetId);
    if (a) {
      removeAudioElement(a);
      audios.current.delete(targetId);
    }
    iceCandidateQueue.current.delete(targetId);
    iceRestartCount.current.delete(targetId);
    peerAnalysers.current.delete(targetId);
    setConnectedPeers((s) => {
      const n = new Set(s);
      n.delete(targetId);
      return n;
    });
  }, []);

  // Process queued ICE candidates
  const flushCandidates = useCallback(async (targetId: string) => {
    const pc = peers.current.get(targetId);
    const queue = iceCandidateQueue.current.get(targetId);
    if (!pc || !queue) return;
    for (const c of queue) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      } catch (e) {
        console.warn("Failed to add queued ICE candidate:", e);
      }
    }
    iceCandidateQueue.current.set(targetId, []);
  }, []);

  // --- WIRE UP HANDLERS ---

  // WebRTC signaling
  useEffect(() => {
    onSignal.current = async (from: string, signal: unknown) => {
      const s = signal as {
        type: string;
        sdp?: RTCSessionDescriptionInit;
        candidate?: RTCIceCandidateInit;
      };

      if (s.type === "offer") {
        // If we already have a connection (e.g. ICE restart), handle re-offer
        const existingPc = peers.current.get(from);
        if (existingPc) {
          try {
            await existingPc.setRemoteDescription(new RTCSessionDescription(s.sdp!));
            await flushCandidates(from);
            const answer = await existingPc.createAnswer();
            await existingPc.setLocalDescription(answer);
            sendSignal(from, { type: "answer", sdp: existingPc.localDescription!.toJSON() });
          } catch (e) {
            console.warn("Re-offer handling failed:", e);
          }
          return;
        }

        // On mobile, getUserMedia can be slow — buffer offers until mic is ready
        if (!stream.current) {
          if (s.sdp) pendingOffers.current.set(from, { sdp: s.sdp });
          return;
        }

        await connect(from, false);
        const pc = peers.current.get(from);
        if (!pc || !s.sdp) return;
        await pc.setRemoteDescription(new RTCSessionDescription(s.sdp));
        await flushCandidates(from);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal(from, { type: "answer", sdp: pc.localDescription!.toJSON() });
      }

      if (s.type === "answer") {
        const pc = peers.current.get(from);
        if (!pc || !s.sdp) return;
        await pc.setRemoteDescription(new RTCSessionDescription(s.sdp));
        await flushCandidates(from);
      }

      if (s.type === "candidate") {
        const pc = peers.current.get(from);
        if (pc && pc.remoteDescription) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(s.candidate!));
          } catch (e) {
            console.warn("Failed to add ICE candidate:", e);
          }
        } else {
          const queue = iceCandidateQueue.current.get(from) ?? [];
          queue.push(s.candidate!);
          iceCandidateQueue.current.set(from, queue);
        }
      }
    };

    return () => {
      onSignal.current = undefined;
    };
  }, [connect, sendSignal, flushCandidates, onSignal]);

  // When a peer joins our room — connection is handled by mic-ready exchange,
  // not here. Connecting eagerly on peer-join races with mic-ready and can
  // create stale PeerConnections that block later connection attempts.
  useEffect(() => {
    onPeerJoin.current = () => {};
    return () => {
      onPeerJoin.current = undefined;
    };
  }, [onPeerJoin]);

  // When a peer leaves
  useEffect(() => {
    onPeerLeave.current = (id: string) => disconnect(id);
    return () => {
      onPeerLeave.current = undefined;
    };
  }, [disconnect, onPeerLeave]);

  // When a peer announces mic-ready
  useEffect(() => {
    onMicReady.current = (from: string) => {
      if (!myIdRef.current) return;

      // If our mic isn't ready yet, buffer this for later
      if (!stream.current) {
        pendingMicReady.current.add(from);
        return;
      }

      if (peers.current.has(from)) return;
      if (myIdRef.current < from) {
        connect(from, true);
      } else {
        sendMicReady();
      }
    };
    return () => {
      onMicReady.current = undefined;
    };
  }, [connect, sendMicReady, onMicReady]);

  // When host force-mutes us
  useEffect(() => {
    party.onForceMuted.current = () => {
      // Always show the toast, even if already muted
      setWasForceMuted(true);

      if (!muted) {
        setMuted(true);
      }

      // Always replace tracks to ensure we're truly muted
      for (const [, pc] of peers.current) {
        for (const sender of pc.getSenders()) {
          if (sender.track?.kind === "audio" || sender.track === null) {
            sender.replaceTrack(null).catch((e) => console.warn("Force mute replaceTrack:", e));
          }
        }
      }
      stream.current?.getAudioTracks().forEach((t) => {
        t.enabled = false;
      });
    };
    return () => {
      party.onForceMuted.current = undefined;
    };
  }, [muted, party.onForceMuted]);

  // Start mic and announce ready
  const start = useCallback(async () => {
    const mic = await getMic();
    if (mic) {
      sendMicReady();

      // Process any offers that arrived before our mic was ready (mobile)
      if (pendingOffers.current.size > 0) {
        for (const [from, { sdp }] of pendingOffers.current) {
          if (peers.current.has(from)) continue;
          connect(from, false).then(async () => {
            const pc = peers.current.get(from);
            if (!pc) return;
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(sdp));
              await flushCandidates(from);
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              sendSignal(from, { type: "answer", sdp: pc.localDescription!.toJSON() });
            } catch (e) {
              console.warn("Failed to process buffered offer:", e);
            }
          });
        }
        pendingOffers.current.clear();
      }

      // Process any mic-ready messages that arrived before our mic was ready
      if (pendingMicReady.current.size > 0) {
        for (const peerId of pendingMicReady.current) {
          if (peers.current.has(peerId)) continue;
          if (myIdRef.current && myIdRef.current < peerId) {
            connect(peerId, true);
          } else {
            sendMicReady();
          }
        }
        pendingMicReady.current.clear();
      }
    }
  }, [getMic, sendMicReady, sendSignal, connect, flushCandidates]);

  // Stop everything
  const stop = useCallback(() => {
    cancelAnimationFrame(rafId.current);
    for (const [id] of peers.current) disconnect(id);
    if (stream.current) {
      stream.current.getTracks().forEach((t) => t.stop());
      stream.current = null;
    }
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    localAnalyser.current = null;
    peerAnalysers.current.clear();
    pendingMicReady.current.clear();
    pendingOffers.current.clear();
    iceRestartCount.current.clear();
    setMicActive(false);
    setConnectedPeers(new Set());
    setIsSpeaking(false);
    setSpeakingPeers(new Set());
  }, [disconnect]);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;

      // Stop / resume outgoing audio on every sender
      for (const [, pc] of peers.current) {
        for (const sender of pc.getSenders()) {
          if (sender.track?.kind === "audio" || sender.track === null) {
            if (next) {
              sender.replaceTrack(null).catch((e) => console.warn("Mute replaceTrack:", e));
            } else {
              const audioTrack = stream.current?.getAudioTracks()[0];
              if (audioTrack) {
                sender
                  .replaceTrack(audioTrack)
                  .catch((e) => console.warn("Unmute replaceTrack:", e));
              }
            }
          }
        }
      }

      // Also disable the track itself as a fallback (no-peer-yet case)
      stream.current?.getAudioTracks().forEach((t) => {
        t.enabled = !next;
      });

      return next;
    });
  }, []);

  return {
    start,
    stop,
    toggleMute,
    muted,
    micActive,
    connectedPeers,
    isSpeaking,
    speakingPeers,
    wasForceMuted,
    clearForceMuted: () => setWasForceMuted(false),
  };
}
