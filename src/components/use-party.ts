"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { getDeviceId } from "@/lib/device-id";

export type Room = {
  id: string;
  hostId: string;
  hostName: string;
  topic: string;
  mode: string;
  maxPeople: number;
  people: { id: string; name: string }[];
  color: string;
  lat: number;
  lng: number;
  createdAt: number;
  iceBreakers: string[];
  currentQuestion: number;
};

export type ChatMsg = { from: string; name: string; text: string };

export type MarbleRaceState = {
  game: "marble-race";
  players: { id: string; name: string }[];
  finishOrder: string[];
  seed: number;
};

export type TicTacToeState = {
  game: "tic-tac-toe";
  playerX: { id: string; name: string };
  playerO: { id: string; name: string };
  board: (string | null)[];
  turn: "X" | "O";
  winner: "X" | "O" | "draw" | null;
};

export type GameState = MarbleRaceState | TicTacToeState | null;

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:1999";

export function useParty(name: string) {
  const [myId, setMyId] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [effectiveName, setEffectiveName] = useState(name);
  const [gameState, setGameState] = useState<GameState>(null);

  const onSignal = useRef<((from: string, signal: unknown) => void) | undefined>(undefined);
  const onPeerJoin = useRef<((id: string, name: string) => void) | undefined>(undefined);
  const onPeerLeave = useRef<((id: string) => void) | undefined>(undefined);
  const onMicReady = useRef<((from: string) => void) | undefined>(undefined);
  const onPreviewStarted = useRef<((roomId: string) => void) | undefined>(undefined);
  const onPreviewStopped = useRef<(() => void) | undefined>(undefined);
  const onPreviewUnavailable = useRef<((roomId: string) => void) | undefined>(undefined);
  const onPreviewCooldown = useRef<((roomId: string, remainingMs: number) => void) | undefined>(
    undefined
  );
  const onForceMuted = useRef<(() => void) | undefined>(undefined);
  const onKicked = useRef<(() => void) | undefined>(undefined);
  const onBanned = useRef<((minutes: number) => void) | undefined>(undefined);
  const onAdminWarn = useRef<((message: string) => void) | undefined>(undefined);
  const onAdminRename = useRef<((newName: string) => void) | undefined>(undefined);
  const onAdminBlock = useRef<((minutes: number, message: string) => void) | undefined>(undefined);

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
        ws.send(JSON.stringify({ type: "join", name: nameRef.current, deviceId: getDeviceId() }));
      };

      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);

        if (msg.type === "id") setMyId(msg.id);
        if (msg.type === "online") setOnlineCount(msg.count);
        if (msg.type === "sync") setRooms(msg.rooms);
        if (msg.type === "rooms") setRooms(msg.rooms);
        if (msg.type === "room-upsert") {
          setRooms((prev) => {
            const idx = prev.findIndex((r) => r.id === msg.room.id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = msg.room;
              return next;
            }
            return [...prev, msg.room];
          });
        }
        if (msg.type === "room-remove") {
          setRooms((prev) => prev.filter((r) => r.id !== msg.roomId));
        }
        if (msg.type === "joined") setCurrentRoomId(msg.roomId);
        if (msg.type === "left" || msg.type === "room-closed" || msg.type === "kicked") {
          setCurrentRoomId(null);
          setChatMessages([]);
          setGameState(null);
        }

        if (msg.type === "ice-breakers") {
          setRooms((prev) =>
            prev.map((r) =>
              r.id === msg.roomId ? { ...r, iceBreakers: msg.questions as string[] } : r
            )
          );
        }
        if (msg.type === "question-index") {
          setRooms((prev) =>
            prev.map((r) =>
              r.id === msg.roomId ? { ...r, currentQuestion: msg.index as number } : r
            )
          );
        }

        if (msg.type === "game-start") {
          if (msg.game === "marble-race") {
            setGameState({
              game: "marble-race",
              players: msg.players,
              finishOrder: msg.finishOrder,
              seed: msg.seed,
            });
          } else if (msg.game === "tic-tac-toe") {
            setGameState({
              game: "tic-tac-toe",
              playerX: msg.playerX,
              playerO: msg.playerO,
              board: msg.board,
              turn: msg.turn,
              winner: null,
            });
          }
        }
        if (msg.type === "game-update") {
          setGameState((prev) => {
            if (!prev || prev.game !== "tic-tac-toe") return prev;
            return { ...prev, board: msg.board, turn: msg.turn, winner: msg.winner };
          });
        }

        if (msg.type === "signal") onSignal.current?.(msg.from, msg.signal);
        if (msg.type === "peer-join") onPeerJoin.current?.(msg.id, msg.name);
        if (msg.type === "peer-leave") onPeerLeave.current?.(msg.id);
        if (msg.type === "mic-ready") onMicReady.current?.(msg.from);
        if (msg.type === "chat") setChatMessages((prev) => [...prev.slice(-100), msg]);
        if (msg.type === "preview-started") onPreviewStarted.current?.(msg.roomId);
        if (msg.type === "preview-stopped") onPreviewStopped.current?.();
        if (msg.type === "preview-unavailable") onPreviewUnavailable.current?.(msg.roomId);
        if (msg.type === "preview-cooldown")
          onPreviewCooldown.current?.(msg.roomId, msg.remainingMs);
        if (msg.type === "force-muted") onForceMuted.current?.();
        if (msg.type === "kicked") onKicked.current?.();
        if (msg.type === "banned") onBanned.current?.(msg.minutes);
        if (msg.type === "admin-warn") onAdminWarn.current?.(msg.message);
        if (msg.type === "admin-block") onAdminBlock.current?.(msg.minutes, msg.message);
        if (msg.type === "admin-kick") {
          setCurrentRoomId(null);
          setChatMessages([]);
        }
        if (msg.type === "admin-rename") {
          // Update localStorage with new name so it persists
          localStorage.setItem("onlyfun-name", msg.newName);
          setEffectiveName(msg.newName);
          onAdminRename.current?.(msg.newName);
        }
        if (msg.type === "name-locked") {
          // Server enforced IP-locked name — update localStorage and state
          localStorage.setItem("onlyfun-name", msg.name);
          setEffectiveName(msg.name);
        }
        if (msg.type === "name-changed") {
          localStorage.setItem("onlyfun-name", msg.newName);
          setEffectiveName(msg.newName);
        }
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

  const changeName = useCallback(
    (newName: string) => send({ type: "change-name", name: newName }),
    [send]
  );

  const createRoom = useCallback(
    (topic: string, max: number, lat: number, lng: number, mode: string, lang: string) => {
      send({ type: "create", topic, max, lat, lng, mode, lang });
    },
    [send]
  );

  const nextQuestion = useCallback(() => send({ type: "next-question" }), [send]);

  const joinRoom = useCallback((roomId: string) => send({ type: "join-room", roomId }), [send]);

  const leaveRoom = useCallback(() => send({ type: "leave" }), [send]);

  const sendSignal = useCallback(
    (to: string, signal: unknown) => send({ type: "signal", to, signal }),
    [send]
  );

  const sendMicReady = useCallback(() => send({ type: "mic-ready" }), [send]);

  const sendChat = useCallback((text: string) => send({ type: "chat", text }), [send]);

  const startPreview = useCallback((roomId: string) => send({ type: "preview", roomId }), [send]);
  const stopPreview = useCallback(() => send({ type: "preview-stop" }), [send]);
  const kickPeer = useCallback((targetId: string) => send({ type: "kick", targetId }), [send]);
  const mutePeer = useCallback((targetId: string) => send({ type: "mute-peer", targetId }), [send]);
  const startGame = useCallback(
    (game: "marble-race" | "tic-tac-toe") => send({ type: "start-game", game }),
    [send]
  );
  const sendGameMove = useCallback((cell: number) => send({ type: "game-move", cell }), [send]);
  const clearGame = useCallback(() => setGameState(null), []);

  const currentRoom = rooms.find((r) => r.id === currentRoomId) ?? null;

  return {
    myId,
    effectiveName,
    changeName,
    rooms,
    currentRoom,
    currentRoomId,
    onlineCount,
    chatMessages,
    createRoom,
    nextQuestion,
    joinRoom,
    leaveRoom,
    sendSignal,
    sendMicReady,
    sendChat,
    startPreview,
    stopPreview,
    kickPeer,
    mutePeer,
    startGame,
    sendGameMove,
    clearGame,
    gameState,
    onSignal,
    onPeerJoin,
    onPeerLeave,
    onMicReady,
    onPreviewStarted,
    onPreviewStopped,
    onPreviewUnavailable,
    onPreviewCooldown,
    onForceMuted,
    onKicked,
    onBanned,
    onAdminWarn,
    onAdminRename,
    onAdminBlock,
  };
}

export type PartyState = ReturnType<typeof useParty>;
