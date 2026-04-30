"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Socket } from "socket.io-client";
import { GameFrame } from "@/components/app/games/game-frame";
import { gameTypeToId } from "@/components/app/games/game-meta";
import { Panel } from "@/components/ui/suzi-primitives";
import { getStoredAuthSession } from "@/lib/auth-client";
import { getGameSession, postGameAction, type ApiGameSession } from "@/lib/games-client";
import { joinSessionChannel, openGamesSocket, sendSessionAction } from "@/lib/games-realtime";

type BoardCell = string | number | null;

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function GameSessionClient({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState<ApiGameSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [socketReady, setSocketReady] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const auth = useMemo(() => getStoredAuthSession(), []);

  async function refresh() {
    if (!auth?.accessToken) return;
    try {
      const next = await getGameSession(auth.accessToken, sessionId);
      setSession(next);
      setError("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load session.");
    }
  }

  useEffect(() => {
    void refresh();
  }, [sessionId]);

  useEffect(() => {
    if (!auth?.accessToken) return;
    const s = openGamesSocket(auth.accessToken);
    setSocket(s);
    const onConnect = () => {
      setSocketReady(true);
      joinSessionChannel(s, sessionId);
    };
    const onDisconnect = () => setSocketReady(false);
    const onState = (next: ApiGameSession) => {
      if (next.id === sessionId) {
        setSession(next);
      }
    };
    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    s.on("game:state", onState);
    if (s.connected) onConnect();
    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.off("game:state", onState);
    };
  }, [auth?.accessToken, sessionId]);

  async function runAction(payload: Record<string, unknown>, kind?: string) {
    if (!auth?.accessToken) {
      setError("Login required.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const next = await postGameAction(auth.accessToken, sessionId, payload, kind);
      setSession(next);
      if (socket) {
        sendSessionAction(socket, sessionId, payload);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  const meId = auth?.user.id ?? "";
  const state = (session?.state ?? {}) as Record<string, unknown>;
  const isTurn = session?.turnUserId === meId;

  return (
    <section className="suzi-app-frame-fill">
      <div className="suzi-app-frame-scroll suzi-scrollbar pr-1">
        {!session ? (
          <Panel className="p-6">
            <p className="text-sm text-cyan-100/75">Loading session...</p>
            {error ? <p className="mt-2 text-sm text-pink-100">{error}</p> : null}
          </Panel>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
            <GameFrame
              title={`${session.gameType.replace("_", " ")} Session`}
              subtitle={session.status === "ACTIVE" ? (isTurn ? "Your turn" : "Waiting for opponent") : "Finished"}
              reconnecting={!socketReady}
            >
              {error ? <p className="mb-3 rounded-lg border border-pink-400/30 bg-pink-500/12 px-3 py-2 text-sm text-pink-100">{error}</p> : null}
              {session.gameType === "CHESS" ? (
                <ChessBoard state={state} busy={busy} onMove={(move) => void runAction({ move })} />
              ) : null}
              {session.gameType === "CHECKERS" ? (
                <CheckersBoard state={state} busy={busy} onMove={(from, to) => void runAction({ from, to })} />
              ) : null}
              {session.gameType === "CONNECT4" ? (
                <Connect4Board state={state} busy={busy} onDrop={(column) => void runAction({ column })} />
              ) : null}
              {session.gameType === "POKER_HOLDEM" ? (
                <PokerTable state={state} busy={busy} onAction={(kind, amount) => void runAction({ kind, amount })} />
              ) : null}
            </GameFrame>

            <Panel className="flex min-h-0 flex-col p-4">
              <h3 className="text-lg font-semibold text-white">Session Info</h3>
              <p className="mt-2 text-sm text-cyan-100/72">Status: {session.status}</p>
              <p className="text-sm text-cyan-100/72">Turn: {session.turnUserId ?? "—"}</p>
              <p className="text-sm text-cyan-100/72">Winner: {session.winnerUserId ?? "—"}</p>
              <div className="mt-4 space-y-2">
                <Link href={`/app/games/${gameTypeToId(session.gameType)}`} className="suzi-secondary-btn block px-3 py-2 text-center text-sm">
                  Back to lobby
                </Link>
                <button
                  type="button"
                  onClick={() => void runAction({ type: "resign" }, "RESIGN")}
                  className="rounded-lg border border-pink-300/34 bg-pink-500/18 px-3 py-2 text-sm font-semibold text-pink-100"
                >
                  Resign
                </button>
              </div>
              <div className="suzi-scrollbar mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                {session.moves.map((move) => (
                  <div key={move.id} className="rounded-lg border border-cyan-300/20 bg-[rgba(21,14,66,0.6)] px-2.5 py-2 text-xs text-cyan-100/85">
                    <p className="font-semibold">#{move.ply} {move.kind}</p>
                    <p className="mt-1 break-all text-cyan-100/70">{JSON.stringify(move.payload)}</p>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        )}
      </div>
    </section>
  );
}

function ChessBoard({ state, busy, onMove }: { state: Record<string, unknown>; busy: boolean; onMove: (move: string) => void }) {
  const fen = String(state.fen ?? "");
  const boardPart = fen.split(" ")[0] ?? "";
  const rows = boardPart.split("/").map((row) => {
    const expanded: BoardCell[] = [];
    for (const char of row.split("")) {
      if (/\d/.test(char)) {
        const count = Number(char);
        for (let i = 0; i < count; i += 1) expanded.push(null);
      } else {
        expanded.push(char);
      }
    }
    return expanded;
  });
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  return (
    <div>
      <div className="grid max-w-[26rem] grid-cols-8 overflow-hidden rounded-xl border border-cyan-300/24">
        {rows.flatMap((row, r) =>
          row.map((cell, c) => (
            <div key={`${r}-${c}`} className={`flex h-10 items-center justify-center text-sm font-semibold ${((r + c) % 2 === 0 ? "bg-[#2b235c]" : "bg-[#3c2d79]")} text-white`}>
              {cell || ""}
            </div>
          )),
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="text-xs text-cyan-100/70">
          From
          <input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="e2" className="suzi-input mt-1 h-9 w-20 px-2 text-sm" />
        </label>
        <label className="text-xs text-cyan-100/70">
          To
          <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="e4" className="suzi-input mt-1 h-9 w-20 px-2 text-sm" />
        </label>
        <button type="button" disabled={busy} onClick={() => onMove(`${from}${to}`)} className="suzi-primary-btn h-9 px-3 text-sm disabled:opacity-60">
          Move
        </button>
      </div>
    </div>
  );
}

function CheckersBoard({
  state,
  busy,
  onMove,
}: {
  state: Record<string, unknown>;
  busy: boolean;
  onMove: (from: string, to: string) => void;
}) {
  const board = asArray(state.board).map((row) => asArray(row));
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  return (
    <div>
      <div className="grid max-w-[26rem] grid-cols-8 overflow-hidden rounded-xl border border-cyan-300/24">
        {board.flatMap((row, r) =>
          row.map((cell, c) => (
            <div key={`${r}-${c}`} className={`flex h-10 items-center justify-center text-base font-semibold ${((r + c) % 2 === 0 ? "bg-[#2b235c]" : "bg-[#3c2d79]")} text-white`}>
              {String(cell ?? "").replace("null", "")}
            </div>
          )),
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="text-xs text-cyan-100/70">
          From row,col
          <input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="5,0" className="suzi-input mt-1 h-9 w-24 px-2 text-sm" />
        </label>
        <label className="text-xs text-cyan-100/70">
          To row,col
          <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="4,1" className="suzi-input mt-1 h-9 w-24 px-2 text-sm" />
        </label>
        <button type="button" disabled={busy} onClick={() => onMove(from, to)} className="suzi-primary-btn h-9 px-3 text-sm disabled:opacity-60">
          Move
        </button>
      </div>
    </div>
  );
}

function Connect4Board({
  state,
  busy,
  onDrop,
}: {
  state: Record<string, unknown>;
  busy: boolean;
  onDrop: (column: number) => void;
}) {
  const board = asArray(state.board).map((row) => asArray(row).map((cell) => Number(cell)));
  return (
    <div>
      <div className="grid max-w-[30rem] grid-cols-7 gap-1 rounded-xl border border-cyan-300/24 bg-[#261f56] p-2">
        {board.flatMap((row, r) =>
          row.map((cell, c) => (
            <button
              key={`${r}-${c}`}
              type="button"
              disabled={busy}
              onClick={() => onDrop(c)}
              className="flex h-11 items-center justify-center rounded-full border border-cyan-300/18 bg-[#1d1748] text-sm text-white transition hover:border-cyan-300/42"
            >
              {cell === 1 ? "🟡" : cell === 2 ? "🔴" : ""}
            </button>
          )),
        )}
      </div>
      <p className="mt-3 text-xs text-cyan-100/68">Click a column cell to drop your disc.</p>
    </div>
  );
}

function PokerTable({
  state,
  busy,
  onAction,
}: {
  state: Record<string, unknown>;
  busy: boolean;
  onAction: (kind: string, amount?: number) => void;
}) {
  const board = asArray(state.board).map(String);
  const players = asArray(state.players) as Array<Record<string, unknown>>;
  const [amount, setAmount] = useState(100);
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-fuchsia-300/24 bg-[rgba(35,18,88,0.7)] p-3">
        <p className="text-sm text-cyan-100/74">Board: {board.join(" ") || "—"}</p>
        <p className="text-sm text-cyan-100/74">Pot: {String(state.pot ?? 0)} • Current bet: {String(state.currentBet ?? 0)}</p>
        <p className="text-sm text-cyan-100/74">Phase: {String(state.phase ?? "PREFLOP")}</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {players.map((player, idx) => (
          <div key={idx} className="rounded-lg border border-cyan-300/18 bg-[rgba(20,13,62,0.62)] px-3 py-2 text-xs text-cyan-100/88">
            <p className="font-semibold">{String(player.userId ?? "Unknown")} (seat {String(player.seatIndex ?? "?")})</p>
            <p>Stack: {String(player.stack ?? 0)} • Committed: {String(player.committed ?? 0)}</p>
            <p>{Boolean(player.folded) ? "Folded" : Boolean(player.allIn) ? "All-in" : "Active"}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={busy} className="suzi-secondary-btn px-3 py-2 text-xs" onClick={() => onAction("CHECK")}>
          Check
        </button>
        <button type="button" disabled={busy} className="suzi-secondary-btn px-3 py-2 text-xs" onClick={() => onAction("CALL")}>
          Call
        </button>
        <button type="button" disabled={busy} className="suzi-secondary-btn px-3 py-2 text-xs" onClick={() => onAction("FOLD")}>
          Fold
        </button>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="suzi-input h-9 w-28 px-2 text-sm"
        />
        <button type="button" disabled={busy} className="suzi-primary-btn px-3 py-2 text-xs" onClick={() => onAction("BET", amount)}>
          Bet
        </button>
        <button type="button" disabled={busy} className="suzi-primary-btn px-3 py-2 text-xs" onClick={() => onAction("RAISE", amount)}>
          Raise
        </button>
        <button type="button" disabled={busy} className="rounded-lg border border-pink-300/35 bg-pink-500/22 px-3 py-2 text-xs font-semibold text-pink-100" onClick={() => onAction("ALL_IN")}>
          All-in
        </button>
      </div>
    </div>
  );
}
