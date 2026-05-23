"use client";

type EdgeOrientation = "h" | "v";

type DotsAndBoxesBoardViewProps = {
  size: number;
  horizontalEdges: boolean[][];
  verticalEdges: boolean[][];
  boxes: number[][];
  scores: number[];
  players: string[];
  meId: string;
  myTurn: boolean;
  busy: boolean;
  active: boolean;
  spectator?: boolean;
  onClaimEdge: (orientation: EdgeOrientation, row: number, col: number) => void;
};

export function DotsAndBoxesBoardView({
  size,
  horizontalEdges,
  verticalEdges,
  boxes,
  scores,
  players,
  meId,
  myTurn,
  busy,
  active,
  spectator = false,
  onClaimEdge,
}: DotsAndBoxesBoardViewProps) {
  const mySlot = players[0] === meId ? 1 : players[1] === meId ? 2 : 0;
  const canPlay = active && myTurn && !busy && mySlot > 0 && !spectator;
  const gridSize = size * 2 + 1;

  return (
    <div className="mx-auto w-full max-w-[min(100%,39rem)] select-none">
      <div className="overflow-hidden rounded-[1.6rem] border border-violet-300/24 bg-[radial-gradient(circle_at_18%_10%,rgba(34,211,238,0.24),transparent_26%),linear-gradient(145deg,#170d3b,#0d0828_55%,#2b124c)] p-3 shadow-[0_18px_60px_rgba(0,0,0,0.45)] sm:p-4">
        <div className="mb-3 grid gap-2 text-xs text-cyan-100/75 sm:grid-cols-[1fr_auto_1fr]">
          <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-3 py-2">
            <span className="block text-cyan-100/55">Player 1</span>
            <span className="font-semibold text-cyan-50">{scores[0] ?? 0} boxes</span>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/8 px-3 py-2 text-center">
            {spectator ? "Watching" : canPlay ? "Draw a line" : "Waiting..."}
          </div>
          <div className="rounded-2xl border border-fuchsia-300/20 bg-fuchsia-400/10 px-3 py-2 text-right">
            <span className="block text-cyan-100/55">Player 2</span>
            <span className="font-semibold text-fuchsia-50">{scores[1] ?? 0} boxes</span>
          </div>
        </div>

        <div
          className="grid rounded-[1.3rem] border border-white/10 bg-[linear-gradient(135deg,rgba(14,165,233,0.12),rgba(168,85,247,0.16))] p-3"
          style={{
            gridTemplateColumns: Array.from({ length: gridSize }, (_, index) => (index % 2 === 0 ? "0.7rem" : "1fr")).join(" "),
            gridTemplateRows: Array.from({ length: gridSize }, (_, index) => (index % 2 === 0 ? "0.7rem" : "1fr")).join(" "),
          }}
        >
          {Array.from({ length: gridSize * gridSize }, (_, index) => {
            const r = Math.floor(index / gridSize);
            const c = index % gridSize;
            const dotRow = r % 2 === 0;
            const dotCol = c % 2 === 0;

            if (dotRow && dotCol) {
              return <span key={index} className="z-10 place-self-center rounded-full bg-white shadow-[0_0_16px_rgba(125,249,255,0.6)]" style={{ width: "0.7rem", height: "0.7rem" }} />;
            }

            if (dotRow) {
              const edgeRow = r / 2;
              const edgeCol = Math.floor(c / 2);
              const claimed = Boolean(horizontalEdges[edgeRow]?.[edgeCol]);
              return (
                <button
                  key={index}
                  type="button"
                  disabled={!canPlay || claimed}
                  onClick={() => onClaimEdge("h", edgeRow, edgeCol)}
                  className={`mx-1 place-self-stretch rounded-full transition disabled:cursor-not-allowed ${
                    claimed
                      ? "bg-cyan-200 shadow-[0_0_16px_rgba(103,232,249,0.6)]"
                      : canPlay
                        ? "bg-white/12 hover:bg-emerald-300/70"
                        : "bg-white/8"
                  }`}
                  aria-label={`Horizontal edge ${edgeRow + 1}-${edgeCol + 1}`}
                />
              );
            }

            if (dotCol) {
              const edgeRow = Math.floor(r / 2);
              const edgeCol = c / 2;
              const claimed = Boolean(verticalEdges[edgeRow]?.[edgeCol]);
              return (
                <button
                  key={index}
                  type="button"
                  disabled={!canPlay || claimed}
                  onClick={() => onClaimEdge("v", edgeRow, edgeCol)}
                  className={`my-1 place-self-stretch rounded-full transition disabled:cursor-not-allowed ${
                    claimed
                      ? "bg-fuchsia-200 shadow-[0_0_16px_rgba(244,114,182,0.55)]"
                      : canPlay
                        ? "bg-white/12 hover:bg-emerald-300/70"
                        : "bg-white/8"
                  }`}
                  aria-label={`Vertical edge ${edgeRow + 1}-${edgeCol + 1}`}
                />
              );
            }

            const boxRow = Math.floor(r / 2);
            const boxCol = Math.floor(c / 2);
            const owner = boxes[boxRow]?.[boxCol] ?? 0;
            return (
              <div
                key={index}
                className={`m-1 flex aspect-square items-center justify-center rounded-xl border text-lg font-black transition sm:text-2xl ${
                  owner === 1
                    ? "border-cyan-200/55 bg-cyan-300/24 text-cyan-50"
                    : owner === 2
                      ? "border-fuchsia-200/55 bg-fuchsia-300/24 text-fuchsia-50"
                      : "border-white/8 bg-white/5 text-white/25"
                }`}
              >
                {owner === 1 ? "P1" : owner === 2 ? "P2" : ""}
              </div>
            );
          })}
        </div>

        <p className="mt-3 text-center text-xs text-cyan-100/62">
          Complete a box to score it and take another turn. Most boxes wins.
        </p>
      </div>
    </div>
  );
}
