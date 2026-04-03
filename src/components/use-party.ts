"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export type Room = {
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

export type ChatMsg = { from: string; name: string; text: string };

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:1999";

export function useParty(name: string) {
  const [myId, setMyId] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);

  const onSignal = useRef<((from: string, signal: unknown) => void) | undefined>(undefined);
  const onPeerJoin = useRef<((id: string, name: string) => void) | undefined>(undefined);
  const onPeerLeave = useRef<((id: string) => void) | undefined>(undefined);
  const onMicReady = useRef<((from: string) => void) | undefined>(undefined);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nameRef = useRef(name);
  nameRef.current = name;

  const send = useCallback((data: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  useEffect(() => {
    let dead = false;

    function connect() {
      if (dead) return;
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "join", name: nameRef.current }));
      };

      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);

        if (msg.type === "id") setMyId(msg.id);
        if (msg.type === "online") setOnlineCount(msg.count);
        if (msg.type === "sync") setRooms(msg.rooms);
        if (msg.type === "rooms") setRooms(msg.rooms);
        if (msg.type === "joined") setCurrentRoomId(msg.roomId);
        if (msg.type === "left") {
          setCurrentRoomId(null);
          setChatMessages([]);
        }

        if (msg.type === "signal") onSignal.current?.(msg.from, msg.signal);
        if (msg.type === "peer-join") onPeerJoin.current?.(msg.id, msg.name);
        if (msg.type === "peer-leave") onPeerLeave.current?.(msg.id);
        if (msg.type === "mic-ready") onMicReady.current?.(msg.from);
        if (msg.type === "chat") setChatMessages((prev) => [...prev.slice(-100), msg]);
      };

      ws.onclose = () => {
        if (!dead) {
          reconnectTimer.current = setTimeout(connect, 2000);
        }
      };
    }

    connect();

    return () => {
      dead = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, []);

  const createRoom = useCallback(
    (topic: string, max: number, x: number, y: number) => {
      send({ type: "create", topic, max, x, y });
    },
    [send]
  );

  const joinRoom = useCallback((roomId: string) => send({ type: "join-room", roomId }), [send]);

  const leaveRoom = useCallback(() => send({ type: "leave" }), [send]);

  const sendSignal = useCallback(
    (to: string, signal: unknown) => send({ type: "signal", to, signal }),
    [send]
  );

  const sendMicReady = useCallback(() => send({ type: "mic-ready" }), [send]);

  const sendChat = useCallback((text: string) => send({ type: "chat", text }), [send]);

  const currentRoom = rooms.find((r) => r.id === currentRoomId) ?? null;

  return {
    myId,
    rooms,
    currentRoom,
    currentRoomId,
    onlineCount,
    chatMessages,
    createRoom,
    joinRoom,
    leaveRoom,
    sendSignal,
    sendMicReady,
    sendChat,
    onSignal,
    onPeerJoin,
    onPeerLeave,
    onMicReady,
  };
}

export type PartyState = ReturnType<typeof useParty>;
