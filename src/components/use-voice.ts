"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type { PartyState } from "./use-party";

// Route audio to the default communication device (earbuds/headphones if connected)
async function routeToOutputDevice(audio: HTMLAudioElement) {
  if (typeof audio.setSinkId !== "function") return;
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const outputs = devices.filter((d) => d.kind === "audiooutput");
    // Prefer the communications device, fall back to default
    const comm = outputs.find((d) => d.deviceId === "communications");
    const target = comm || outputs.find((d) => d.deviceId === "default");
    if (target) await audio.setSinkId(target.deviceId);
  } catch {}
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

export function useVoice(party: PartyState) {
  const { myId, sendSignal, sendMicReady, onSignal, onPeerJoin, onPeerLeave, onMicReady } = party;
  const [muted, setMuted] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [connectedPeers, setConnectedPeers] = useState<Set<string>>(new Set());
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingPeers, setSpeakingPeers] = useState<Set<string>>(new Set());

  const stream = useRef<MediaStream | null>(null);
  const peers = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audios = useRef<Map<string, HTMLAudioElement>>(new Map());
  const iceCandidateQueue = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const myIdRef = useRef(myId);
  myIdRef.current = myId;

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

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peers.current.set(targetId, pc);
      iceCandidateQueue.current.set(targetId, []);

      // Add our audio track
      for (const track of mic.getTracks()) {
        pc.addTrack(track, mic);
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
          audio = new Audio();
          audio.autoplay = true;
          routeToOutputDevice(audio);
          audios.current.set(targetId, audio);
        }
        audio.srcObject = e.streams[0];
        audio.play().catch(() => {});

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
        if (state === "connected" || state === "completed") {
          setConnectedPeers((s) => new Set([...s, targetId]));
        }
        if (state === "disconnected" || state === "failed" || state === "closed") {
          setConnectedPeers((s) => {
            const n = new Set(s);
            n.delete(targetId);
            return n;
          });
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
      a.pause();
      a.srcObject = null;
      audios.current.delete(targetId);
    }
    iceCandidateQueue.current.delete(targetId);
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
      } catch {}
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
          } catch {}
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

  // When a peer joins our room
  useEffect(() => {
    onPeerJoin.current = (id: string) => {
      if (stream.current && myIdRef.current && myIdRef.current < id) {
        connect(id, true);
      }
    };
    return () => {
      onPeerJoin.current = undefined;
    };
  }, [connect, onPeerJoin]);

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
      if (!stream.current || !myIdRef.current) return;
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

  // Start mic and announce ready
  const start = useCallback(async () => {
    const mic = await getMic();
    if (mic) sendMicReady();
  }, [getMic, sendMicReady]);

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
    setMicActive(false);
    setConnectedPeers(new Set());
    setIsSpeaking(false);
    setSpeakingPeers(new Set());
  }, [disconnect]);

  const toggleMute = useCallback(() => {
    const next = !muted;
    setMuted(next);

    // Stop / resume outgoing audio on every sender
    for (const [, pc] of peers.current) {
      for (const sender of pc.getSenders()) {
        if (sender.track?.kind === "audio" || sender.track === null) {
          if (next) {
            // Muting: replace with null so we send nothing (stronger than enabled=false)
            sender.replaceTrack(null).catch(() => {});
          } else {
            // Unmuting: put the real track back
            const audioTrack = stream.current?.getAudioTracks()[0];
            if (audioTrack) sender.replaceTrack(audioTrack).catch(() => {});
          }
        }
      }
    }

    // Also disable the track itself as a fallback (no-peer-yet case)
    stream.current?.getAudioTracks().forEach((t) => {
      t.enabled = !next;
    });

    // Mute / unmute incoming audio from all peers
    audios.current.forEach((audio) => {
      audio.muted = next;
    });
  }, [muted]);

  return { start, stop, toggleMute, muted, micActive, connectedPeers, isSpeaking, speakingPeers };
}
