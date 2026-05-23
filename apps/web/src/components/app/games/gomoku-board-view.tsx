"use client";

type GomokuBoardViewProps = {
  board: number[][];
  players: string[];
  meId: string;
  myTurn: boolean;
  busy: boolean;
  active: boolean;
  spectator?: boolean;
  onPlace: (row: number, col: number) => void;
};

export function GomokuBoardView({
  board,
  players,
  meId,
  myTurn,
  busy,
  active,
  spectator = false,
  onPlace,
}: GomokuBoardViewProps) {
  const mySlot = players[0] === meId ? 1 : players[1] === meId ? 2 : 0;
  const canPlay = active && myTurn && !busy && mySlot > 0 && !spectator;
  const size = board.length || 15;

  return (
    <div className="mx-auto w-full max-w-[min(100%,42rem)] select-none">
      <div className="overflow-hidden rounded-[1.6rem] border border-emerald-300/24 bg-[linear-gradient(135deg,rgba(13,148,136,0.25),rgba(17,24,39,0.96)_35%,rgba(88,28,135,0.42))] p-3 shadow-[0_18px_60px_rgba(0,0,0,0.45)] sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/8 px-3 py-2 text-xs text-cyan-100/75">
          <span>{spectator ? "Watching this table" : canPlay ? "Place one stone on any open point" : "Waiting for opponent..."}</span>
          <span className="font-semibold text-white">{mySlot === 1 ? "You are Black" : mySlot === 2 ? "You are White" : "Spectator"}</span>
        </div>

        <div className="rounded-[1.25rem] border border-amber-200/25 bg-[radial-gradient(circle_at_20%_20%,rgba(253,230,138,0.52),transparent_24%),linear-gradient(135deg,#d8a65a,#8a5523)] p-2 shadow-inner sm:p-3">
          <div className="grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}>
            {board.map((row, r) =>
              row.map((cell, c) => {
                const disabled = !canPlay || cell !== 0;
                return (
                  <button
                    key={`${r}-${c}`}
                    type="button"
                    disabled={disabled}
                    onClick={() => onPlace(r, c)}
                    className="group relative aspect-square rounded-sm bg-black/5 disabled:cursor-not-allowed"
                    aria-label={`Row ${r + 1}, column ${c + 1}`}
                  >
                    <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-stone-900/35" />
                    <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-stone-900/35" />
                    {cell !== 0 ? (
                      <span
                        className={`absolute inset-[13%] rounded-full shadow-[inset_0_2px_6px_rgba(255,255,255,0.2),0_8px_18px_rgba(0,0,0,0.35)] ${
                          cell === 1
                            ? "bg-[radial-gradient(circle_at_35%_28%,#6b7280,#050510_58%)]"
                            : "bg-[radial-gradient(circle_at_35%_28%,#ffffff,#d8dee9_62%)]"
                        }`}
                      />
                    ) : canPlay ? (
                      <span
                        className={`absolute inset-[22%] rounded-full opacity-0 ring-2 transition group-hover:opacity-70 ${
                          mySlot === 1 ? "bg-slate-950 ring-slate-800" : "bg-white ring-cyan-100"
                        }`}
                      />
                    ) : null}
                  </button>
                );
              }),
            )}
          </div>
        </div>

        <p className="mt-3 text-center text-xs text-cyan-100/62">
          First player to connect five stones horizontally, vertically, or diagonally wins.
        </p>
      </div>
    </div>
  );
}
