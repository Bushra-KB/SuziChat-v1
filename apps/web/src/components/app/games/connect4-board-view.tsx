"use client";

import { useCallback, useRef, useState } from "react";

type Connect4BoardViewProps = {
  board: number[][];
  players: string[];
  meId: string;
  myTurn: boolean;
  busy: boolean;
  active: boolean;
  onDrop: (column: number) => void;
};

/** Board rows: 0 = top, 5 = bottom; values 0 empty, 1 player0, 2 player1 */
export function Connect4BoardView({
  board,
  players,
  meId,
  myTurn,
  busy,
  active,
  onDrop,
}: Connect4BoardViewProps) {
  const mySlot = players[0] === meId ? 1 : players[1] === meId ? 2 : 0;
  const canPlay = active && myTurn && !busy && mySlot > 0;

  const [dragging, setDragging] = useState(false);
  const [dragCol, setDragCol] = useState<number | null>(null);
  const dragRef = useRef(false);

  const discColor = mySlot === 1 ? "from-amber-300 to-amber-600" : "from-fuchsia-400 to-rose-700";
  const discBorder = mySlot === 1 ? "border-amber-900/40" : "border-rose-900/40";

  const pickColumn = useCallback(
    (clientX: number, clientY: number) => {
      const el = document.elementFromPoint(clientX, clientY);
      const zone = el?.closest("[data-connect4-col]");
      if (!zone) return null;
      const col = Number(zone.getAttribute("data-connect4-col"));
      return Number.isFinite(col) ? col : null;
    },
    [],
  );

  const handleDiscPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!canPlay) return;
      dragRef.current = true;
      setDragging(true);
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    },
    [canPlay],
  );

  const handleDiscPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return;
      const col = pickColumn(e.clientX, e.clientY);
      setDragCol(col);
    },
    [pickColumn],
  );

  const finishDisc = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return;
      dragRef.current = false;
      setDragging(false);
      setDragCol(null);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      if (!canPlay) return;
      const col = pickColumn(e.clientX, e.clientY);
      if (col !== null) onDrop(col);
    },
    [canPlay, onDrop, pickColumn],
  );

  const cols = 7;
  const rows = 6;

  return (
    <div className="mx-auto w-full max-w-[min(100%,32rem)] select-none">
      <div className="rounded-2xl border border-cyan-300/24 bg-gradient-to-b from-[#1a1245] to-[#0f0a2e] p-3 shadow-[0_16px_48px_rgba(0,0,0,0.45)]">
        <p className="mb-2 text-center text-xs font-medium text-cyan-100/70">
          {canPlay ? "Drag your disc onto a column." : "Waiting for opponent…"}
        </p>

        {/* Drop targets — tall hit areas above board */}
        <div className="mb-2 grid grid-cols-7 gap-1.5">
          {Array.from({ length: cols }, (_, c) => (
            <button
              key={`drop-${c}`}
              type="button"
              data-connect4-col={c}
              disabled={!canPlay}
              onClick={() => canPlay && onDrop(c)}
              className={`flex min-h-11 items-end justify-center rounded-lg border border-dashed transition ${
                dragging && dragCol === c
                  ? "border-emerald-300/70 bg-emerald-500/15"
                  : "border-cyan-400/15 bg-[#231858]/40"
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <span className="pb-1 text-[0.65rem] text-cyan-100/45">{c + 1}</span>
            </button>
          ))}
        </div>

        {/* Board: top row = r=0 */}
        <div className="grid grid-rows-6 gap-1.5">
          {Array.from({ length: rows }, (_, displayRi) => {
            const r = displayRi;
            return (
              <div key={r} className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: cols }, (_, c) => {
                  const v = board[r]?.[c] ?? 0;
                  return (
                    <div
                      key={`${r}-${c}`}
                      data-connect4-col={c}
                      className="flex aspect-square items-center justify-center rounded-full bg-[#0d0828]/90 ring-1 ring-inset ring-white/8"
                    >
                      {v === 0 ? null : (
                        <div
                          className={`h-[78%] w-[78%] rounded-full border-2 shadow-inner ${
                            v === 1
                              ? "border-amber-900/50 bg-gradient-to-b from-amber-300 to-amber-600"
                              : "border-rose-900/50 bg-gradient-to-b from-fuchsia-400 to-rose-700"
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Draggable “hand” disc */}
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            disabled={!canPlay}
            onPointerDown={handleDiscPointerDown}
            onPointerMove={handleDiscPointerMove}
            onPointerUp={finishDisc}
            onPointerCancel={finishDisc}
            className={`relative h-14 w-14 rounded-full border-2 bg-gradient-to-b shadow-lg disabled:cursor-not-allowed disabled:opacity-40 ${discBorder} ${discColor} ${
              canPlay ? "cursor-grab touch-none active:cursor-grabbing" : ""
            }`}
            aria-label="Drag disc to column"
          />
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-cyan-100/55">Columns numbered 1–7. Match ends on four in a row.</p>
    </div>
  );
}
