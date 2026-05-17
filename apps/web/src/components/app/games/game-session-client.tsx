"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CheckersBoardView } from "@/components/app/games/checkers-board-view";
import { ChessBoardView } from "@/components/app/games/chess-board-view";
import { Connect4BoardView } from "@/components/app/games/connect4-board-view";
import { GameFrame } from "@/components/app/games/game-frame";
import { gameTypeToId } from "@/components/app/games/game-meta";
import { PokerTableView } from "@/components/app/games/poker-table-view";
import { Panel, cx } from "@/components/ui/suzi-primitives";
import { getStoredAuthSession } from "@/lib/auth-client";
import { formatMoveListForSession, getLastChessMoveSquares } from "@/lib/format-game-move";
import {
  getGameSession,
  listGameSessionChat,
  postGameAction,
  sendGameSessionChat,
  type ApiGameChatMessage,
  type ApiGameSession,
} from "@/lib/games-client";
import { getGameSoundEnabled, playMoveSound, playYourTurnSound, setGameSoundEnabled } from "@/lib/game-sounds";
import { joinSessionChannel, openGamesSocket, postGameSessionAction, postGameSessionChat } from "@/lib/games-realtime";

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

const RECONNECT_HINT = "Moves and chat sync automatically as soon as the live link is restored.";

export function GameSessionClient({
  sessionId,
  gameRouteId,
}: {
  sessionId: string;
  gameRouteId?: string;
}) {
  const [session, setSession] = useState<ApiGameSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [socketReady, setSocketReady] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [soundOn, setSoundOn] = useState(false);
  const [chatMessages, setChatMessages] = useState<ApiGameChatMessage[]>([]);
  const [chatDraft, setChatDraft] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
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
    if (!auth?.accessToken) return;
    let cancelled = false;
    void listGameSessionChat(auth.accessToken, sessionId)
      .then((rows) => {
        if (!cancelled) setChatMessages(rows);
      })
      .catch(() => {
        if (!cancelled) setChatMessages([]);
      });
    return () => {
      cancelled = true;
    };
  }, [auth?.accessToken, sessionId]);

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
    const onChat = (message: ApiGameChatMessage) => {
      if (message.sessionId !== sessionId) return;
      setChatMessages((prev) => (
        prev.some((row) => row.id === message.id) ? prev : [...prev, message]
      ));
    };
    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    s.on("game:state", onState);
    s.on("game:chat", onChat);
    if (s.connected) onConnect();
    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.off("game:state", onState);
      s.off("game:chat", onChat);
    };
  }, [auth?.accessToken, sessionId, refresh]);

  useEffect(() => {
    chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight });
  }, [chatMessages.length]);

  const meId = auth?.user.id ?? "";

  useEffect(() => {
    if (!session || !soundOn) return;

    if (!soundInitialized.current) {
      soundInitialized.current = true;
      prevMovesLen.current = session.moves.length;
      prevTurnId.current = session.turnUserId;
      return;
    }

    if (session.gameType !== "POKER_HOLDEM" && session.moves.length > prevMovesLen.current) {
      playMoveSound();
    }
    prevMovesLen.current = session.moves.length;

    if (
      session.gameType !== "POKER_HOLDEM" &&
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

  async function sendChat() {
    const body = chatDraft.trim();
    if (!body || !auth?.accessToken) return;
    setChatBusy(true);
    setError("");
    try {
      const socket = openGamesSocket(auth.accessToken);
      if (socket.connected) {
        try {
          await postGameSessionChat(socket, sessionId, body);
          setChatDraft("");
          return;
        } catch {
          /* fall back to HTTP */
        }
      }
      const message = await sendGameSessionChat(auth.accessToken, sessionId, body);
      setChatMessages((prev) => (
        prev.some((row) => row.id === message.id) ? prev : [...prev, message]
      ));
      setChatDraft("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Message failed.");
    } finally {
      setChatBusy(false);
    }
  }

  const state = (session?.state ?? {}) as Record<string, unknown>;
  const stateTurnUserId =
    typeof state.turnUserId === "string" ? state.turnUserId : null;
  const isTurn =
    session?.turnUserId === meId ||
    (session?.turnUserId == null && stateTurnUserId === meId);
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
  const whitePlayerId =
    typeof state.whitePlayerId === "string" ? state.whitePlayerId : seatUserIds[0];
  const blackPlayerId =
    typeof state.blackPlayerId === "string" ? state.blackPlayerId : seatUserIds[1];
  const boardOrientation: "white" | "black" =
    whitePlayerId === meId ? "white" : blackPlayerId === meId ? "black" : "white";

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

  const gamePlayers = (() => {
    const fromState = asArray(state.players).map(String).filter(Boolean);
    return fromState.length >= 2 ? fromState : seatUserIds;
  })();

  const moveLines = useMemo(
    () => (session ? formatMoveListForSession(session) : []),
    [session],
  );

  const lastChessMove =
    session?.gameType === "CHESS" ? getLastChessMoveSquares(session.moves) : null;

  const pokerPhase = session?.gameType === "POKER_HOLDEM" ? String(state.phase ?? "") : "";
  const frameSubtitle = !session
    ? undefined
    : spectator
      ? "You’re watching — open a seat in the lobby to play."
      : session.gameType === "POKER_HOLDEM" && pokerPhase === "COMPLETE"
        ? "Hand complete — deal next hand when ready"
        : session.status === "ACTIVE"
          ? isTurn
            ? "Your turn"
            : `Waiting for ${turnDisplay}`
          : "Finished";

  return (
    <section className="suzi-app-frame-fill suzi-game-session-page">
      <div className="h-full min-h-0">
        {!session ? (
          <Panel className="p-6">
            <p className="text-sm text-cyan-100/75">Loading session...</p>
            {error ? <p className="mt-2 text-sm text-pink-100">{error}</p> : null}
          </Panel>
        ) : (
          <div className="grid h-full min-h-0 gap-[var(--col-gap)] xl:grid-cols-[clamp(14rem,17vw,18rem)_minmax(0,1fr)_clamp(15rem,19vw,20rem)]">
            <Panel className="flex h-full min-h-0 flex-col overflow-hidden p-4">
              <h3 className="text-[var(--fs-lg)] font-semibold text-white">Session Info</h3>
              <div className="mt-3 grid gap-2 text-[var(--fs-xs)] text-cyan-100/72">
                <p>Status: <span className="font-semibold text-white/90">{session.status}</span></p>
                <p>Turn: <span className="font-semibold text-white/90">{session.turnUserId ? `${turnDisplay}` : "—"}</span></p>
                <p>Winner: <span className="font-semibold text-white/90">{session.winnerUserId ?? "—"}</span></p>
              </div>

              <label className="mt-4 flex cursor-pointer items-center gap-2 text-[var(--fs-2xs)] text-cyan-100/80">
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
                Game sounds
              </label>

              <div className="mt-4 space-y-2">
                <Link
                  href={`/app/games/${gameTypeToId(session.gameType)}`}
                  className="suzi-secondary-btn block px-3 py-2 text-center text-[var(--fs-xs)]"
                >
                  Back to lobby
                </Link>
                {!spectator && session.gameType !== "POKER_HOLDEM" ? (
                  <button
                    type="button"
                    onClick={() => void runAction({ type: "resign" }, "RESIGN")}
                    className="w-full rounded-lg border border-pink-300/34 bg-pink-500/18 px-3 py-2 text-[var(--fs-xs)] font-semibold text-pink-100"
                  >
                    Resign
                  </button>
                ) : null}
              </div>

              <div className="suzi-scrollbar mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                <p className="text-[0.65rem] font-medium uppercase tracking-wider text-cyan-100/50">
                  Moves
                </p>
                {session.moves.length === 0 ? (
                  <p className="rounded-lg border border-cyan-300/18 bg-[rgba(21,14,66,0.45)] px-2.5 py-2 text-[var(--fs-2xs)] text-cyan-100/58">
                    No moves yet.
                  </p>
                ) : null}
                {session.moves.map((move, idx) => {
                  const mover =
                    session.lobby.seats.find((s) => s.userId === move.userId)?.user?.username ??
                    move.userId.slice(0, 8);
                  return (
                    <div
                      key={move.id}
                      className="rounded-lg border border-cyan-300/20 bg-[rgba(21,14,66,0.6)] px-2.5 py-2 text-[var(--fs-2xs)] text-cyan-100/85"
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

            <GameFrame
              title={
                session.gameType === "POKER_HOLDEM"
                  ? gameRouteId === "texasholdem"
                    ? "Texas Hold'em"
                    : "Poker"
                  : `${session.gameType.replace("_", " ")} Session`
              }
              subtitle={frameSubtitle}
              reconnecting={!socketReady}
              reconnectHint={RECONNECT_HINT}
              immersive={session.gameType === "POKER_HOLDEM"}
              lobbyHref={`/app/games/${gameRouteId ?? gameTypeToId(session.gameType)}`}
            >
              <div
                key={shakeKey}
                className={cx(
                  session.gameType === "CHESS" ? "suzi-chess-session-wrap" : "h-full min-h-0",
                  shakeKey > 0 ? "suzi-game-shake" : undefined,
                  session.gameType === "POKER_HOLDEM" ? "suzi-poker-arcade-frame" : undefined,
                )}
              >
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
                    myTurn={session.status === "ACTIVE" && isTurn}
                    soundOn={soundOn}
                    gameRouteId={gameRouteId ?? gameTypeToId(session.gameType)}
                    readOnly={spectator}
                    onAction={(kind, amount) => void runAction({ kind, amount }, "POKER_ACTION")}
                    onNextHand={() => void runAction({ kind: "NEXT_HAND" }, "POKER_ACTION")}
                  />
                ) : null}
              </div>
            </GameFrame>

            <Panel className="flex h-full min-h-0 flex-col overflow-hidden p-4">
              <div className="flex shrink-0 items-center justify-between gap-2">
                <h3 className="text-[var(--fs-lg)] font-semibold text-white">Game Chat</h3>
                <span className={socketReady ? "text-[var(--fs-2xs)] text-emerald-100/80" : "text-[var(--fs-2xs)] text-amber-100/80"}>
                  {socketReady ? "Live" : "Syncing"}
                </span>
              </div>

              <div
                ref={chatScrollRef}
                className="suzi-thin-scroll mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto rounded-[var(--panel-radius)] bg-white p-2 shadow-[inset_0_2px_8px_rgba(7,4,28,0.22),inset_0_0_0_1px_rgba(0,0,0,0.04)]"
              >
                {chatMessages.length === 0 ? (
                  <p className="px-1 py-2 text-center text-[var(--fs-2xs)] text-slate-500">
                    No game chat yet.
                  </p>
                ) : null}
                {chatMessages.map((message) => {
                  const mine = message.userId === meId;
                  const label = message.user?.displayName?.trim() || message.user?.username || "Player";
                  return (
                    <div
                      key={message.id}
                      className={`rounded-lg border px-2.5 py-2 text-[var(--fs-2xs)] ${
                        mine
                          ? "ml-4 border-fuchsia-200/90 bg-fuchsia-50/95"
                          : "mr-4 border-slate-200 bg-slate-50/95"
                      }`}
                    >
                      <p
                        className={`truncate font-semibold ${
                          mine ? "text-fuchsia-800" : "text-sky-800"
                        }`}
                      >
                        {label}
                      </p>
                      <p className="mt-0.5 whitespace-pre-wrap break-words leading-relaxed text-slate-700">
                        {message.body}
                      </p>
                    </div>
                  );
                })}
              </div>

              <form
                className="mt-3 flex shrink-0 items-center gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void sendChat();
                }}
              >
                <input
                  value={chatDraft}
                  onChange={(event) => setChatDraft(event.target.value)}
                  placeholder="Message players..."
                  className="suzi-input h-9 min-w-0 flex-1 px-3 text-[var(--fs-xs)]"
                  maxLength={500}
                />
                <button
                  type="submit"
                  disabled={chatBusy || !chatDraft.trim()}
                  className="suzi-primary-btn h-9 px-3 text-[var(--fs-2xs)] disabled:opacity-60"
                >
                  Send
                </button>
              </form>
            </Panel>
          </div>
        )}
      </div>
    </section>
  );
}
