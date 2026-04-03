"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type { PartyState } from "./use-party";

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

  const stream = useRef<MediaStream | null>(null);
  const peers = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audios = useRef<Map<string, HTMLAudioElement>>(new Map());
  const iceCandidateQueue = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const myIdRef = useRef(myId);
  myIdRef.current = myId;

  // Get microphone
  const getMic = useCallback(async () => {
    if (stream.current) return stream.current;
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      setMicActive(true);
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

      // When we receive remote audio, play it
      pc.ontrack = (e) => {
        let audio = audios.current.get(targetId);
        if (!audio) {
          audio = new Audio();
          audio.autoplay = true;
          audios.current.set(targetId, audio);
        }
        audio.srcObject = e.streams[0];
        audio.play().catch(() => {});
      };

      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        if (state === "connected" || state === "completed") {
          setConnectedPeers((s) => new Set([...s, targetId]));
        }
        if (state === "disconnected" || state === "failed" || state === "closed") {
          setConnectedPeers((s) => { const n = new Set(s); n.delete(targetId); return n; });
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
    if (pc) { pc.close(); peers.current.delete(targetId); }
    const a = audios.current.get(targetId);
    if (a) { a.pause(); a.srcObject = null; audios.current.delete(targetId); }
    iceCandidateQueue.current.delete(targetId);
    setConnectedPeers((s) => { const n = new Set(s); n.delete(targetId); return n; });
  }, []);

  // Process queued ICE candidates
  const flushCandidates = useCallback(async (targetId: string) => {
    const pc = peers.current.get(targetId);
    const queue = iceCandidateQueue.current.get(targetId);
    if (!pc || !queue) return;
    for (const c of queue) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
    }
    iceCandidateQueue.current.set(targetId, []);
  }, []);

  // --- WIRE UP HANDLERS ---

  // WebRTC signaling
  useEffect(() => {
    onSignal.current = async (from: string, signal: unknown) => {
      const s = signal as { type: string; sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit };

      if (s.type === "offer") {
        // Someone is calling us
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
          try { await pc.addIceCandidate(new RTCIceCandidate(s.candidate!)); } catch {}
        } else {
          // Queue it — remote description not set yet
          const queue = iceCandidateQueue.current.get(from) ?? [];
          queue.push(s.candidate!);
          iceCandidateQueue.current.set(from, queue);
        }
      }
    };

    return () => { onSignal.current = undefined; };
  }, [connect, sendSignal, flushCandidates, onSignal]);

  // When a peer joins our pixel
  useEffect(() => {
    onPeerJoin.current = (id: string) => {
      // Lower ID initiates the call
      if (stream.current && myIdRef.current && myIdRef.current < id) {
        connect(id, true);
      }
    };
    return () => { onPeerJoin.current = undefined; };
  }, [connect, onPeerJoin]);

  // When a peer leaves
  useEffect(() => {
    onPeerLeave.current = (id: string) => disconnect(id);
    return () => { onPeerLeave.current = undefined; };
  }, [disconnect, onPeerLeave]);

  // When a peer announces mic-ready
  useEffect(() => {
    onMicReady.current = (from: string) => {
      if (!stream.current || !myIdRef.current) return;
      if (peers.current.has(from)) return; // already connected
      if (myIdRef.current < from) {
        connect(from, true);
      } else {
        // Tell them we're ready too, so they initiate
        sendMicReady();
      }
    };
    return () => { onMicReady.current = undefined; };
  }, [connect, sendMicReady, onMicReady]);

  // Start mic and announce ready on mount
  const start = useCallback(async () => {
    const mic = await getMic();
    if (mic) sendMicReady();
  }, [getMic, sendMicReady]);

  // Stop everything
  const stop = useCallback(() => {
    for (const [id] of peers.current) disconnect(id);
    if (stream.current) {
      stream.current.getTracks().forEach((t) => t.stop());
      stream.current = null;
    }
    setMicActive(false);
    setConnectedPeers(new Set());
  }, [disconnect]);

  const toggleMute = useCallback(() => {
    if (!stream.current) return;
    const next = !muted;
    stream.current.getAudioTracks().forEach((t) => { t.enabled = !next; });
    setMuted(next);
  }, [muted]);

  return { start, stop, toggleMute, muted, micActive, connectedPeers };
}
