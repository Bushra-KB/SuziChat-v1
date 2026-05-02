"use client";

import { useCallback, useMemo } from "react";
import { Chess, type Square } from "chess.js";
import { Chessboard, ChessboardProvider } from "react-chessboard";

type ChessBoardViewProps = {
  fen: string;
  busy: boolean;
  myTurn: boolean;
  /** Play as White when true (first seated player). */
  boardOrientation: "white" | "black";
  onUciMove: (uci: string) => void;
};

function tryLegalUci(currentFen: string, sourceSquare: string, targetSquare: string): string | null {
  const chess = new Chess(currentFen);
  const moves = chess.moves({ square: sourceSquare as Square, verbose: true });
  const toTarget = moves.filter((m) => m.to === targetSquare);
  if (toTarget.length === 0) return null;
  const match = toTarget.find((m) => m.promotion === "q") ?? toTarget[0];
  const promo = match.promotion ?? "";
  return `${match.from}${match.to}${promo}`;
}

export function ChessBoardView({
  fen,
  busy,
  myTurn,
  boardOrientation,
  onUciMove,
}: ChessBoardViewProps) {
  const canDrag = myTurn && !busy;

  const onPieceDrop = useCallback(
    ({
      sourceSquare,
      targetSquare,
    }: {
      sourceSquare: string;
      targetSquare: string | null;
    }) => {
      if (!targetSquare || !canDrag) return false;
      const uci = tryLegalUci(fen, sourceSquare, targetSquare);
      if (!uci) return false;
      onUciMove(uci);
      return true;
    },
    [fen, canDrag, onUciMove],
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
      onPieceDrop,
    }),
    [fen, boardOrientation, canDrag, onPieceDrop],
  );

  return (
    <div className="mx-auto w-full max-w-[min(100%,28rem)]">
      <ChessboardProvider options={options}>
        <Chessboard />
      </ChessboardProvider>
      <p className="mt-3 text-center text-xs text-cyan-100/65">
        Drag pieces to move. Promotion defaults to queen when you drop on the back rank.
      </p>
    </div>
  );
}
