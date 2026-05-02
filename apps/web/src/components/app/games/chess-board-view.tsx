"use client";

import { useCallback, useMemo, useState } from "react";
import { Chess, type Square } from "chess.js";
import { Chessboard, ChessboardProvider } from "react-chessboard";

type ChessBoardViewProps = {
  fen: string;
  busy: boolean;
  myTurn: boolean;
  /** Play as White when true (first seated player). */
  boardOrientation: "white" | "black";
  onUciMove: (uci: string) => void;
  /** Spectator: board is view-only */
  readOnly?: boolean;
  /** Last move squares for highlight */
  lastMove?: { from: string; to: string } | null;
};

export function ChessBoardView({
  fen,
  busy,
  myTurn,
  boardOrientation,
  onUciMove,
  readOnly = false,
  lastMove = null,
}: ChessBoardViewProps) {
  const canDrag = !readOnly && myTurn && !busy;

  const [promo, setPromo] = useState<{ from: string; to: string } | null>(null);

  const squareStyles = useMemo(() => {
    const o: Record<string, React.CSSProperties> = {};
    if (lastMove?.from) {
      o[lastMove.from] = { backgroundColor: "rgba(34, 197, 94, 0.38)" };
    }
    if (lastMove?.to) {
      o[lastMove.to] = { backgroundColor: "rgba(34, 197, 94, 0.42)" };
    }
    return o;
  }, [lastMove]);

  const onPieceDrop = useCallback(
    ({
      sourceSquare,
      targetSquare,
    }: {
      sourceSquare: string;
      targetSquare: string | null;
    }) => {
      if (!targetSquare || !canDrag) return false;
      const chess = new Chess(fen);
      const moves = chess.moves({ square: sourceSquare as Square, verbose: true }).filter((m) => m.to === targetSquare);
      if (moves.length === 0) return false;

      const withPromo = moves.filter((m) => Boolean(m.promotion));
      if (withPromo.length > 1) {
        setPromo({ from: sourceSquare, to: targetSquare });
        return false;
      }

      const m = moves[0];
      const uci = `${m.from}${m.to}${m.promotion ?? ""}`;
      onUciMove(uci);
      return true;
    },
    [fen, canDrag, onUciMove],
  );

  const finishPromotion = useCallback(
    (piece: "q" | "r" | "b" | "n") => {
      if (!promo) return;
      const uci = `${promo.from}${promo.to}${piece}`;
      setPromo(null);
      onUciMove(uci);
    },
    [promo, onUciMove],
  );

  const options = useMemo(
    () => ({
      id: "suzi-chess-board",
      position: fen,
      boardOrientation,
      allowDragging: canDrag,
      showNotation: true,
      boardStyle: { borderRadius: "0.75rem" },
      darkSquareStyle: { backgroundColor: "#2b235c" },
      lightSquareStyle: { backgroundColor: "#4a3d8a" },
      squareStyles,
      onPieceDrop,
    }),
    [fen, boardOrientation, canDrag, onPieceDrop, squareStyles],
  );

  return (
    <div className="relative mx-auto w-full max-w-[min(100%,28rem)]" data-testid="chess-board-root">
      <ChessboardProvider options={options}>
        <Chessboard />
      </ChessboardProvider>

      <p className="mt-3 text-center text-xs text-cyan-100/65">
        {readOnly
          ? "You’re watching — moves apply when seated players act."
          : "Drag to move; choose promotion when a pawn reaches the last rank. The board syncs live over the session."}
      </p>

      {promo ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="promo-title"
        >
          <div className="w-full max-w-sm rounded-2xl border border-cyan-300/30 bg-[linear-gradient(160deg,rgba(28,16,84,0.98),rgba(18,12,58,0.98))] p-5 shadow-2xl">
            <p id="promo-title" className="text-center text-lg font-semibold text-white">
              Promote pawn
            </p>
            <p className="mt-1 text-center text-sm text-cyan-100/70">Choose the piece to promote to.</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {(
                [
                  ["Queen", "q"],
                  ["Rook", "r"],
                  ["Bishop", "b"],
                  ["Knight", "n"],
                ] as const
              ).map(([label, piece]) => (
                <button
                  key={piece}
                  type="button"
                  className="suzi-primary-btn py-3 text-sm font-semibold"
                  onClick={() => finishPromotion(piece)}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="mt-4 w-full rounded-lg border border-cyan-300/25 py-2 text-sm text-cyan-100/80 hover:bg-white/5"
              onClick={() => setPromo(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
