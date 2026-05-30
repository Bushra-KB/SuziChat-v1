"use client";

import { useCallback, useRef } from "react";

type Piece = string | null;

type CheckersBoardViewProps = {
  board: Piece[][];
  players: string[];
  meId: string;
  myTurn: boolean;
  busy: boolean;
  active: boolean;
  /** Logged in but not seated — view only */
  spectator?: boolean;
  forcedFrom?: string | null;
  moveNotice?: { id: number; message: string } | null;
  onMove: (from: string, to: string) => void;
  onInvalidMove?: (message: string) => void;
  onDismissMoveNotice?: () => void;
};

function isMyPiece(piece: Piece, imBlack: boolean): boolean {
  if (!piece) return false;
  if (imBlack) return piece === "b" || piece === "B";
  return piece === "r" || piece === "R";
}

function inBounds(r: number, c: number) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function pieceSets(piece: Piece) {
  if (!piece) return { mine: [] as Piece[], theirs: [] as Piece[] };
  const black = piece === "b" || piece === "B";
  return black
    ? { mine: ["b", "B"] as Piece[], theirs: ["r", "R"] as Piece[] }
    : { mine: ["r", "R"] as Piece[], theirs: ["b", "B"] as Piece[] };
}

function captureDirections(piece: Piece): Array<[number, number]> {
  if (piece === "B" || piece === "R") {
    return [
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ];
  }
  if (piece === "b") return [[1, 1], [1, -1]];
  if (piece === "r") return [[-1, 1], [-1, -1]];
  return [];
}

function canCaptureFrom(board: Piece[][], r: number, c: number) {
  const piece = board[r]?.[c] ?? null;
  if (!piece) return false;
  const { theirs } = pieceSets(piece);
  return captureDirections(piece).some(([dr, dc]) => {
    const mr = r + dr;
    const mc = c + dc;
    const tr = r + dr * 2;
    const tc = c + dc * 2;
    return (
      inBounds(tr, tc) &&
      theirs.includes(board[mr]?.[mc] ?? null) &&
      (board[tr]?.[tc] ?? null) === null
    );
  });
}

function playerHasCapture(board: Piece[][], mine: Piece[]) {
  return board.some((row, r) =>
    row.some((piece, c) => Boolean(piece && mine.includes(piece) && canCaptureFrom(board, r, c))),
  );
}

function validateCheckersMove(
  board: Piece[][],
  imBlack: boolean,
  from: { r: number; c: number },
  to: { r: number; c: number },
): string | null {
  if (!inBounds(from.r, from.c) || !inBounds(to.r, to.c)) {
    return "Invalid from/to coordinates.";
  }
  if ((from.r + from.c) % 2 === 0 || (to.r + to.c) % 2 === 0) {
    return "Checkers moves only on dark squares.";
  }
  const piece = board[from.r]?.[from.c] ?? null;
  if (!piece || !isMyPiece(piece, imBlack)) {
    return "You can only move your own pieces.";
  }
  if (board[to.r]?.[to.c] != null) {
    return "Target square is occupied.";
  }

  const mine = imBlack ? (["b", "B"] as Piece[]) : (["r", "R"] as Piece[]);
  const dir = imBlack ? 1 : -1;
  const rowDelta = to.r - from.r;
  const colDelta = to.c - from.c;
  const absRow = Math.abs(rowDelta);
  const absCol = Math.abs(colDelta);
  const isKing = piece === "B" || piece === "R";
  const isCapture = absRow === 2;
  const validStep = isKing
    ? absCol === absRow && (absRow === 1 || absRow === 2)
    : absCol === absRow &&
      (absRow === 1 || absRow === 2) &&
      (rowDelta === dir || rowDelta === dir * 2);

  if (!validStep) {
    return "Illegal checkers move.";
  }
  if (!isCapture && playerHasCapture(board, mine)) {
    return "A capture is available and must be taken.";
  }
  if (isCapture) {
    const mr = from.r + rowDelta / 2;
    const mc = from.c + colDelta / 2;
    const jumped = board[mr]?.[mc] ?? null;
    if (!jumped || mine.includes(jumped)) {
      return "Capture move requires opponent piece in between.";
    }
  }

  return null;
}

function PieceDisc({ piece }: { piece: Piece }) {
  if (!piece) return null;
  const black = piece === "b" || piece === "B";
  const king = piece === "B" || piece === "R";
  return (
    <div
      className={`flex h-[82%] w-[82%] items-center justify-center rounded-full border-2 shadow-lg ${
        black
          ? "border-slate-700/90 bg-gradient-to-b from-slate-600 to-slate-900"
          : "border-rose-300/50 bg-gradient-to-b from-rose-400 to-rose-900"
      }`}
    >
      {king ? <span className="text-[0.65rem] leading-none text-amber-200 drop-shadow">♔</span> : null}
    </div>
  );
}

export function CheckersBoardView({
  board,
  players,
  meId,
  myTurn,
  busy,
  active,
  spectator = false,
  forcedFrom = null,
  moveNotice = null,
  onMove,
  onInvalidMove,
  onDismissMoveNotice,
}: CheckersBoardViewProps) {
  /** players[0] = black (top rows in engine); flip so seated black sees pieces at bottom. */
  const imBlack = players[0] === meId;
  const flip = imBlack;
  const canInteract = active && myTurn && !busy && !spectator;

  const dragStart = useRef<{ r: number; c: number } | null>(null);
  const upListener = useRef<((e: PointerEvent) => void) | null>(null);

  const logicalAtDisplay = useCallback(
    (displayR: number, displayC: number) => {
      const r = flip ? 7 - displayR : displayR;
      const c = displayC;
      return { r, c };
    },
    [flip],
  );

  const removeUpListener = useCallback(() => {
    if (upListener.current) {
      window.removeEventListener("pointerup", upListener.current);
      upListener.current = null;
    }
  }, []);

  const finishDrag = useCallback(
    (clientX: number, clientY: number) => {
      const start = dragStart.current;
      dragStart.current = null;
      removeUpListener();
      if (!start || !canInteract) return;
      const el = document.elementFromPoint(clientX, clientY);
      const cell = el?.closest("[data-checkers-cell]");
      if (!cell) return;
      const tr = Number(cell.getAttribute("data-r"));
      const tc = Number(cell.getAttribute("data-c"));
      if (!Number.isFinite(tr) || !Number.isFinite(tc)) return;
      if (tr === start.r && tc === start.c) return;
      const error = validateCheckersMove(board, imBlack, start, { r: tr, c: tc });
      if (error) {
        onInvalidMove?.(error);
        return;
      }
      onMove(`${start.r},${start.c}`, `${tr},${tc}`);
    },
    [board, canInteract, imBlack, onInvalidMove, onMove, removeUpListener],
  );

  const handlePiecePointerDown = useCallback(
    (e: React.PointerEvent, displayR: number, displayC: number) => {
      if (!canInteract) return;
      const { r, c } = logicalAtDisplay(displayR, displayC);
      if (forcedFrom && forcedFrom !== `${r},${c}`) return;
      const piece = board[r]?.[c] ?? null;
      if (!isMyPiece(piece, imBlack)) return;
      e.preventDefault();
      dragStart.current = { r, c };
      const onUp = (ev: PointerEvent) => {
        finishDrag(ev.clientX, ev.clientY);
      };
      upListener.current = onUp;
      window.addEventListener("pointerup", onUp);
    },
    [board, canInteract, finishDrag, forcedFrom, imBlack, logicalAtDisplay],
  );

  return (
    <div className="suzi-checkers-board-wrap mx-auto w-full max-w-[min(100%,28rem)] select-none">
      {moveNotice ? (
        <div
          key={moveNotice.id}
          className="suzi-checkers-move-popup"
          role="alertdialog"
          aria-modal="false"
          aria-live="polite"
          aria-label="Illegal move notice"
        >
          <p>{moveNotice.message}</p>
          <button
            type="button"
            className="suzi-checkers-move-popup__button"
            onClick={onDismissMoveNotice}
          >
            OK
          </button>
        </div>
      ) : null}
      <div className="overflow-hidden rounded-xl border border-cyan-300/28 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
        <div className="grid aspect-square grid-cols-8">
          {Array.from({ length: 64 }, (_, i) => {
            const displayR = Math.floor(i / 8);
            const displayC = i % 8;
            const { r, c } = logicalAtDisplay(displayR, displayC);
            const piece = board[r]?.[c] ?? null;
            const dark = (r + c) % 2 === 1;
            const isMine = isMyPiece(piece, imBlack);

            return (
              <div
                key={`${displayR}-${displayC}`}
                role="gridcell"
                data-checkers-cell=""
                data-r={r}
                data-c={c}
                className={`relative flex aspect-square items-center justify-center ${
                  dark ? "bg-[#2a1f4a]" : "bg-[#5a5280]/35"
                }`}
              >
                {piece ? (
                  <button
                    type="button"
                    tabIndex={-1}
                    disabled={!canInteract || !isMine}
                    onPointerDown={(e) => handlePiecePointerDown(e, displayR, displayC)}
                    className={`flex h-full w-full items-center justify-center p-0.5 ${
                      canInteract && isMine ? "cursor-grab touch-none active:cursor-grabbing" : "cursor-default"
                    } disabled:opacity-90`}
                  >
                    <PieceDisc piece={piece} />
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-cyan-100/65">
        {spectator
          ? "You’re watching — moves sync live from seated players."
          : forcedFrom
            ? "Continue the capture with the same piece."
            : `Drag your piece to a destination square. You play ${imBlack ? "black" : "red"} — the board is oriented with your side toward you.`}
      </p>
    </div>
  );
}
