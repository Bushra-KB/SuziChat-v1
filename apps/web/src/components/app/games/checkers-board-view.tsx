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
  onMove: (from: string, to: string) => void;
};

function isMyPiece(piece: Piece, imBlack: boolean): boolean {
  if (!piece) return false;
  if (imBlack) return piece === "b" || piece === "B";
  return piece === "r" || piece === "R";
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
  onMove,
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
      onMove(`${start.r},${start.c}`, `${tr},${tc}`);
    },
    [canInteract, onMove, removeUpListener],
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
    [board, canInteract, finishDrag, imBlack, logicalAtDisplay],
  );

  return (
    <div className="mx-auto w-full max-w-[min(100%,28rem)] select-none">
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
