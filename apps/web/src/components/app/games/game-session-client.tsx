"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CheckersBoardView } from "@/components/app/games/checkers-board-view";
import { ChessBoardView } from "@/components/app/games/chess-board-view";
import { Connect4BoardView } from "@/components/app/games/connect4-board-view";
import { GameFrame } from "@/components/app/games/game-frame";
import { gameTypeToId } from "@/components/app/games/game-meta";
import { PokerTableView } from "@/components/app/games/poker-table-view";
import { Panel } from "@/components/ui/suzi-primitives";
import { getStoredAuthSession } from "@/lib/auth-client";
import { formatMoveListForSession, getLastChessMoveSquares } from "@/lib/format-game-move";
import { getGameSession, postGameAction, type ApiGameSession } from "@/lib/games-client";
import { getGameSoundEnabled, playMoveSound, playYourTurnSound, setGameSoundEnabled } from "@/lib/game-sounds";
import { joinSessionChannel, openGamesSocket, postGameSessionAction } from "@/lib/games-realtime";

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

const RECONNECT_HINT = "Moves will apply when you’re back online. We’ll refresh the table as soon as the live link is restored.";

export function GameSessionClient({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState<ApiGameSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [socketReady, setSocketReady] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [soundOn, setSoundOn] = useState(false);
  const soundInitialized = useRef(false);
  const prevMovesLen = useRef(0);
  const prevTurnId = useRef<string | null>(null);

  const auth = useMemo(() => getStoredAuthSession(), []);

  useEffect(() => {
    setSoundOn(getGameSoundEnabled());
  }, []);

  const refresh = useCallback(async () => {
    if (!auth?.accessToken) return;
    try {
      const next = await getGameSession(auth.accessToken, sessionId);
      setSession(next);
      setError("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load session.");
    }
  }, [auth?.accessToken, sessionId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    soundInitialized.current = false;
  }, [sessionId]);

  useEffect(() => {
    if (!soundOn) {
      soundInitialized.current = false;
    }
  }, [soundOn]);

  useEffect(() => {
    if (!auth?.accessToken) return;
    const s = openGamesSocket(auth.accessToken);
    const onConnect = () => {
      setSocketReady(true);
      joinSessionChannel(s, sessionId);
      void refresh();
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
  }, [auth?.accessToken, sessionId, refresh]);

  const meId = auth?.user.id ?? "";

  useEffect(() => {
    if (!session || !soundOn) return;

    if (!soundInitialized.current) {
      soundInitialized.current = true;
      prevMovesLen.current = session.moves.length;
      prevTurnId.current = session.turnUserId;
      return;
    }

    if (session.moves.length > prevMovesLen.current) {
      playMoveSound();
    }
    prevMovesLen.current = session.moves.length;

    if (
      session.status === "ACTIVE" &&
      meId &&
      session.turnUserId === meId &&
      prevTurnId.current !== meId
    ) {
      playYourTurnSound();
    }
    prevTurnId.current = session.turnUserId;
  }, [session, soundOn, meId]);

  async function runAction(payload: Record<string, unknown>, kind?: string) {
    if (!auth?.accessToken) {
      setError("Login required.");
      return;
    }
    const seated =
      session?.lobby.seats.some((s) => s.userId === auth.user.id) ?? false;
    if (session && !seated) {
      setError("Take a seat in the lobby to play.");
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
      const msg = e instanceof Error ? e.message : "Action failed.";
      setError(msg);
      setShakeKey((k) => k + 1);
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate(40);
      }
    } finally {
      setBusy(false);
    }
  }

  const state = (session?.state ?? {}) as Record<string, unknown>;
  const isTurn = session?.turnUserId === meId;
  const turnSeatUser =
    session?.lobby?.seats?.find((seat) => seat.userId === session?.turnUserId)?.user ?? null;
  const turnDisplay =
    turnSeatUser?.displayName?.trim() ||
    turnSeatUser?.username ||
    session?.turnUserId ||
    "…";

  const isSeated = Boolean(meId && session?.lobby.seats.some((s) => s.userId === meId));
  const spectator = Boolean(session && meId && !isSeated);

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

  const moveLines = useMemo(
    () => (session ? formatMoveListForSession(session) : []),
    [session],
  );

  const lastChessMove =
    session?.gameType === "CHESS" ? getLastChessMoveSquares(session.moves) : null;

  const frameSubtitle = !session
    ? undefined
    : spectator
      ? "You’re watching — open a seat in the lobby to play."
      : session.status === "ACTIVE"
        ? isTurn
          ? "Your turn"
          : `Waiting for ${turnDisplay}`
        : "Finished";

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
              subtitle={frameSubtitle}
              reconnecting={!socketReady}
              reconnectHint={RECONNECT_HINT}
            >
              <div key={shakeKey} className={shakeKey > 0 ? "suzi-game-shake" : undefined}>
                {error ? (
                  <p
                    className="mb-3 rounded-lg border border-pink-400/30 bg-pink-500/12 px-3 py-2 text-sm text-pink-100"
                    role="alert"
                    aria-live="polite"
                  >
                    {error}
                  </p>
                ) : null}
                {session.gameType === "CHESS" ? (
                  <ChessBoardView
                    fen={String(state.fen ?? "")}
                    busy={busy}
                    myTurn={session.status === "ACTIVE" && isTurn}
                    boardOrientation={boardOrientation}
                    readOnly={spectator}
                    lastMove={lastChessMove}
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
                    spectator={spectator}
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
                    spectator={spectator}
                    onDrop={(column) => void runAction({ column })}
                  />
                ) : null}
                {session.gameType === "POKER_HOLDEM" ? (
                  <PokerTableView
                    lobbySeats={session.lobby.seats}
                    state={state}
                    busy={busy}
                    meId={meId}
                    readOnly={spectator}
                    onAction={(kind, amount) => void runAction({ kind, amount })}
                  />
                ) : null}
              </div>
            </GameFrame>

            <Panel className="flex min-h-0 flex-col p-4">
              <h3 className="text-lg font-semibold text-white">Session Info</h3>
              <p className="mt-2 text-sm text-cyan-100/72">Status: {session.status}</p>
              <p className="text-sm text-cyan-100/72">
                Turn: {session.turnUserId ? `${turnDisplay}` : "—"}
              </p>
              <p className="text-sm text-cyan-100/72">Winner: {session.winnerUserId ?? "—"}</p>

              <label className="mt-4 flex cursor-pointer items-center gap-2 text-xs text-cyan-100/80">
                <input
                  type="checkbox"
                  className="rounded border-cyan-400/40"
                  checked={soundOn}
                  onChange={(e) => {
                    const on = e.target.checked;
                    setSoundOn(on);
                    setGameSoundEnabled(on);
                    if (on) {
                      soundInitialized.current = false;
                    }
                  }}
                />
                Game sounds (move tick & your-turn chime)
              </label>

              <div className="mt-4 space-y-2">
                <Link
                  href={`/app/games/${gameTypeToId(session.gameType)}`}
                  className="suzi-secondary-btn block px-3 py-2 text-center text-sm"
                >
                  Back to lobby
                </Link>
                {!spectator ? (
                  <button
                    type="button"
                    onClick={() => void runAction({ type: "resign" }, "RESIGN")}
                    className="w-full rounded-lg border border-pink-300/34 bg-pink-500/18 px-3 py-2 text-sm font-semibold text-pink-100"
                  >
                    Resign
                  </button>
                ) : null}
              </div>
              <div className="suzi-scrollbar mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                <p className="text-[0.65rem] font-medium uppercase tracking-wider text-cyan-100/50">
                  Moves
                </p>
                {session.moves.map((move, idx) => {
                  const mover =
                    session.lobby.seats.find((s) => s.userId === move.userId)?.user?.username ??
                    move.userId.slice(0, 8);
                  return (
                    <div
                      key={move.id}
                      className="rounded-lg border border-cyan-300/20 bg-[rgba(21,14,66,0.6)] px-2.5 py-2 text-xs text-cyan-100/85"
                    >
                      <p className="font-semibold text-cyan-50/95">{moveLines[idx] ?? `#${move.ply}`}</p>
                      <p className="mt-0.5 text-[0.65rem] text-cyan-100/55">
                        {move.kind}
                        {mover ? ` · ${mover}` : ""}
                      </p>
                    </div>
                  );
                })}
              </div>
            </Panel>
          </div>
        )}
      </div>
    </section>
  );
}
