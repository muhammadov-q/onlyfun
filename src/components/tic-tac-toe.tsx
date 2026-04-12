"use client";

import { useState, useEffect, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Player = { id: string; name: string };

const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function getWinLine(board: (string | null)[]): number[] | null {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return line;
  }
  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function TicTacToe({
  playerX,
  playerO,
  board,
  turn,
  winner,
  myId,
  onMove,
  onClose,
}: {
  playerX: Player;
  playerO: Player;
  board: (string | null)[];
  turn: "X" | "O";
  winner: "X" | "O" | "draw" | null;
  myId: string | null;
  onMove: (cell: number) => void;
  onClose: () => void;
}) {
  const [lastMove, setLastMove] = useState<number | null>(null);
  const isPlayerX = myId === playerX.id;
  const isPlayerO = myId === playerO.id;
  const isPlayer = isPlayerX || isPlayerO;
  const myMark = isPlayerX ? "X" : isPlayerO ? "O" : null;
  const isMyTurn = myMark === turn && !winner;

  const winLine = winner && winner !== "draw" ? getWinLine(board) : null;

  const handleCellClick = useCallback(
    (cell: number) => {
      if (!isMyTurn || board[cell] !== null || winner) return;
      setLastMove(cell);
      onMove(cell);
    },
    [isMyTurn, board, winner, onMove]
  );

  // Auto-close after 6s when game ends
  useEffect(() => {
    if (!winner) return;
    const t = setTimeout(onClose, 6000);
    return () => clearTimeout(t);
  }, [winner, onClose]);

  const turnPlayer = turn === "X" ? playerX : playerO;

  const statusText = winner
    ? winner === "draw"
      ? "Draw!"
      : winner === myMark
        ? "You won!"
        : `${winner === "X" ? playerX.name : playerO.name} wins!`
    : isMyTurn
      ? "Your turn"
      : `${turnPlayer.name}'s turn`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="relative flex flex-col items-center gap-4 sm:gap-5 p-4 sm:p-5 animate-in"
        style={{ maxWidth: 320, width: "calc(100% - 16px)" }}
      >
        {/* Title */}
        <div className="flex items-center gap-2">
          <span className="text-lg">#</span>
          <h2 className="text-white text-lg font-bold tracking-tight">Tic Tac Toe</h2>
        </div>

        {/* Players */}
        <div className="flex items-center gap-3 w-full">
          <PlayerBadge
            name={playerX.name}
            mark="X"
            isMe={isPlayerX}
            isActive={turn === "X" && !winner}
            isWinner={winner === "X"}
          />
          <span className="text-white/20 text-xs font-bold">VS</span>
          <PlayerBadge
            name={playerO.name}
            mark="O"
            isMe={isPlayerO}
            isActive={turn === "O" && !winner}
            isWinner={winner === "O"}
          />
        </div>

        {/* Board */}
        <div
          className="grid grid-cols-3 gap-1.5 sm:gap-2 w-full"
          style={{ maxWidth: 240, aspectRatio: "1" }}
        >
          {board.map((cell, i) => {
            const isWinCell = winLine?.includes(i);
            const isClickable = isMyTurn && cell === null && !winner;

            return (
              <button
                key={i}
                onClick={() => handleCellClick(i)}
                disabled={!isClickable}
                className="relative flex items-center justify-center transition-all duration-150 aspect-square"
                style={{
                  borderRadius: 14,
                  background: isWinCell
                    ? "rgba(34,197,94,0.15)"
                    : cell
                      ? "rgba(255,255,255,0.06)"
                      : isClickable
                        ? "rgba(255,255,255,0.04)"
                        : "rgba(255,255,255,0.02)",
                  border: isWinCell
                    ? "2px solid rgba(34,197,94,0.4)"
                    : lastMove === i
                      ? "2px solid rgba(255,255,255,0.2)"
                      : "2px solid rgba(255,255,255,0.06)",
                  cursor: isClickable ? "pointer" : "default",
                  touchAction: "manipulation",
                }}
              >
                {cell === "X" && <XMark highlight={isWinCell} />}
                {cell === "O" && <OMark highlight={isWinCell} />}
              </button>
            );
          })}
        </div>

        {/* Status */}
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-full"
          style={{
            background: winner
              ? winner === "draw"
                ? "rgba(255,255,255,0.06)"
                : winner === myMark
                  ? "rgba(34,197,94,0.12)"
                  : "rgba(239,68,68,0.12)"
              : isMyTurn
                ? "rgba(59,130,246,0.12)"
                : "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {!winner && isMyTurn && (
            <div
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: "#3b82f6" }}
            />
          )}
          <span
            className="text-xs font-medium"
            style={{
              color: winner
                ? winner === "draw"
                  ? "rgba(255,255,255,0.5)"
                  : winner === myMark
                    ? "#22c55e"
                    : "#ef4444"
                : isMyTurn
                  ? "#3b82f6"
                  : "rgba(255,255,255,0.4)",
            }}
          >
            {statusText}
          </span>
        </div>

        {/* Spectator label */}
        {!isPlayer && <span className="text-white/25 text-[10px]">Spectating</span>}

        {/* Close button */}
        {winner && (
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-xs font-medium text-white/60 bg-white/5 border border-white/10 active:bg-white/10 transition-colors"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PlayerBadge({
  name,
  mark,
  isMe,
  isActive,
  isWinner,
}: {
  name: string;
  mark: "X" | "O";
  isMe: boolean;
  isActive: boolean;
  isWinner: boolean;
}) {
  return (
    <div
      className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200"
      style={{
        background: isWinner
          ? "rgba(34,197,94,0.12)"
          : isActive
            ? "rgba(255,255,255,0.06)"
            : "transparent",
        border: isActive ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(255,255,255,0.04)",
      }}
    >
      <span
        className="text-sm font-black"
        style={{
          color: mark === "X" ? "#3b82f6" : "#ef4444",
          textShadow: isActive ? `0 0 8px ${mark === "X" ? "#3b82f640" : "#ef444440"}` : "none",
        }}
      >
        {mark}
      </span>
      <span className="text-white/60 text-xs font-medium truncate flex-1">
        {name} {isMe ? "(you)" : ""}
      </span>
      {isWinner && <span className="text-sm">👑</span>}
    </div>
  );
}

function XMark({ highlight }: { highlight?: boolean }) {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      stroke={highlight ? "#22c55e" : "#3b82f6"}
      strokeWidth="3.5"
      strokeLinecap="round"
      className="animate-in"
    >
      <line x1="8" y1="8" x2="24" y2="24" />
      <line x1="24" y1="8" x2="8" y2="24" />
    </svg>
  );
}

function OMark({ highlight }: { highlight?: boolean }) {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      stroke={highlight ? "#22c55e" : "#ef4444"}
      strokeWidth="3.5"
      strokeLinecap="round"
      className="animate-in"
    >
      <circle cx="16" cy="16" r="8" />
    </svg>
  );
}
