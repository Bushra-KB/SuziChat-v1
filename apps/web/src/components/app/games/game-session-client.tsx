"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckersBoardView } from "@/components/app/games/checkers-board-view";
import { ChessBoardView } from "@/components/app/games/chess-board-view";
import { Connect4BoardView } from "@/components/app/games/connect4-board-view";
import { GameFrame } from "@/components/app/games/game-frame";
import { gameTypeToId } from "@/components/app/games/game-meta";
import { PokerTableView } from "@/components/app/games/poker-table-view";
import { Panel } from "@/components/ui/suzi-primitives";
import { getStoredAuthSession } from "@/lib/auth-client";
import { getGameSession, postGameAction, type ApiGameSession } from "@/lib/games-client";
import { joinSessionChannel, openGamesSocket, postGameSessionAction } from "@/lib/games-realtime";

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function GameSessionClient({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState<ApiGameSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [socketReady, setSocketReady] = useState(false);
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
      const socket = openGamesSocket(auth.accessToken);
      if (socket.connected) {
        try {
          const next = await postGameSessionAction(socket, sessionId, payload, kind);
          setSession(next);
          return;
        } catch {
          /* fall back to HTTP */
        }
      }
      const next = await postGameAction(auth.accessToken, sessionId, payload, kind);
      setSession(next);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  const meId = auth?.user.id ?? "";
  const state = (session?.state ?? {}) as Record<string, unknown>;
  const isTurn = session?.turnUserId === meId;
  const turnSeatUser =
    session?.lobby?.seats?.find((seat) => seat.userId === session?.turnUserId)?.user ?? null;
  const turnDisplay =
    turnSeatUser?.displayName?.trim() ||
    turnSeatUser?.username ||
    session?.turnUserId ||
    "…";

  const seatUserIds =
    session?.lobby.seats
      .filter((s) => s.userId)
      .sort((a, b) => a.seatIndex - b.seatIndex)
      .map((s) => s.userId as string) ?? [];
  const boardOrientation: "white" | "black" =
    seatUserIds[0] === meId ? "white" : seatUserIds[1] === meId ? "black" : "white";

  const rawCheckers = asArray(state.board);
  const checkersBoard = Array.from({ length: 8 }, (_, r) =>
    Array.from({ length: 8 }, (_, c) => {
      const row = asArray(rawCheckers[r]);
      const cell = row[c];
      return cell == null || cell === "" ? null : String(cell);
    }),
  );

  const rawC4 = asArray(state.board);
  const connect4Board = Array.from({ length: 6 }, (_, r) =>
    Array.from({ length: 7 }, (_, c) => Number(asArray(rawC4[r])[c] ?? 0)),
  );

  const gamePlayers = asArray(state.players).map(String);

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
              subtitle={
                session.status === "ACTIVE"
                  ? isTurn
                    ? "Your turn"
                    : `Waiting for ${turnDisplay}`
                  : "Finished"
              }
              reconnecting={!socketReady}
            >
              {error ? <p className="mb-3 rounded-lg border border-pink-400/30 bg-pink-500/12 px-3 py-2 text-sm text-pink-100">{error}</p> : null}
              {session.gameType === "CHESS" ? (
                <ChessBoardView
                  fen={String(state.fen ?? "")}
                  busy={busy}
                  myTurn={session.status === "ACTIVE" && isTurn}
                  boardOrientation={boardOrientation}
                  onUciMove={(move: string) => void runAction({ move })}
                />
              ) : null}
              {session.gameType === "CHECKERS" && gamePlayers.length >= 2 ? (
                <CheckersBoardView
                  board={checkersBoard}
                  players={gamePlayers}
                  meId={meId}
                  myTurn={session.status === "ACTIVE" && isTurn}
                  busy={busy}
                  active={session.status === "ACTIVE"}
                  onMove={(from, to) => void runAction({ from, to })}
                />
              ) : null}
              {session.gameType === "CONNECT4" && gamePlayers.length >= 2 ? (
                <Connect4BoardView
                  board={connect4Board}
                  players={gamePlayers}
                  meId={meId}
                  myTurn={session.status === "ACTIVE" && isTurn}
                  busy={busy}
                  active={session.status === "ACTIVE"}
                  onDrop={(column) => void runAction({ column })}
                />
              ) : null}
              {session.gameType === "POKER_HOLDEM" ? (
                <PokerTableView
                  lobbySeats={session.lobby.seats}
                  state={state}
                  busy={busy}
                  meId={meId}
                  onAction={(kind, amount) => void runAction({ kind, amount })}
                />
              ) : null}
            </GameFrame>

            <Panel className="flex min-h-0 flex-col p-4">
              <h3 className="text-lg font-semibold text-white">Session Info</h3>
              <p className="mt-2 text-sm text-cyan-100/72">Status: {session.status}</p>
              <p className="text-sm text-cyan-100/72">
                Turn: {session.turnUserId ? `${turnDisplay}` : "—"}
              </p>
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
