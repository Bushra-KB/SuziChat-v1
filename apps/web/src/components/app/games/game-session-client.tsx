"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { CheckersBoardView } from "@/components/app/games/checkers-board-view";
import { ChessBoardView } from "@/components/app/games/chess-board-view";
import { Connect4BoardView } from "@/components/app/games/connect4-board-view";
import { DotsAndBoxesBoardView } from "@/components/app/games/dots-and-boxes-board-view";
import { GameFrame } from "@/components/app/games/game-frame";
import { gameMeta, gameTypeToId } from "@/components/app/games/game-meta";
import { GomokuBoardView } from "@/components/app/games/gomoku-board-view";
import {
  homeBtnPrimary,
  homeBtnSecondary,
  homePanelHeader,
  homePanelIcon,
  listL2,
  listMeta,
  listSection,
  panelTitle,
} from "@/components/app/home-typography";
import { Panel, cx } from "@/components/ui/suzi-primitives";
import { getStoredAuthSession } from "@/lib/auth-client";
import { formatMoveListForSession, getLastChessMoveSquares } from "@/lib/format-game-move";
import {
  getGameSession,
  leaveGameLobby,
  listGameSessionChat,
  postGameAction,
  sendGameSessionChat,
  startGameSession,
  updateGameLobbySettings,
  type ApiGameChatMessage,
  type ApiGameSession,
} from "@/lib/games-client";
import { parseGameLobbySettings } from "@/lib/game-lobby-settings";
import { getGameSoundEnabled, playMoveSound, playYourTurnSound, setGameSoundEnabled } from "@/lib/game-sounds";
import {
  GameSocketApplicationError,
  joinSessionChannel,
  openGamesSocket,
  postGameLobbyStart,
  postGameLobbySettings,
  postGameSessionAction,
  postGameSessionChat,
} from "@/lib/games-realtime";

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

const RECONNECT_HINT = "Moves and chat sync automatically as soon as the live link is restored.";
const CHECKERS_MOVE_NOTICE_MESSAGES = new Set([
  "Invalid from/to coordinates.",
  "Checkers moves only on dark squares.",
  "You must continue the capture with the same piece.",
  "No piece on source square.",
  "You can only move your own pieces.",
  "Target square is occupied.",
  "Illegal checkers move.",
  "A capture is available and must be taken.",
  "Capture move requires opponent piece in between.",
  "It is not your turn.",
]);

function isCheckersMoveNotice(message: string) {
  return CHECKERS_MOVE_NOTICE_MESSAGES.has(message);
}

function boardFitForStage(gameType: ApiGameSession["gameType"] | undefined, width: number, height: number) {
  if (width <= 0 || height <= 0) {
    return 0;
  }

  const safeHeight = height > 160 ? height : window.innerHeight * 0.58;
  const fit = (max: number, reservedHeight: number, heightRatio = 1) =>
    Math.floor(Math.max(240, Math.min(width, (safeHeight - reservedHeight) / heightRatio, max)));

  switch (gameType) {
    case "CHESS":
      return fit(520, 28);
    case "CHECKERS":
      return fit(456, 30);
    case "GOMOKU":
      return fit(430, 72);
    case "DOTS_AND_BOXES":
      return fit(400, 86);
    case "CONNECT4":
      return fit(300, 138, 0.86);
    default:
      return fit(520, 40);
  }
}

function WinnerCelebrationOverlay({
  winnerName,
  gameName,
  onClose,
}: {
  winnerName: string;
  gameName: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[280] flex items-center justify-center bg-[rgba(4,7,20,0.72)] p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label={`${winnerName} won ${gameName}`}
    >
      <div className="suzi-game-winner-card relative w-full max-w-md overflow-hidden rounded-[1.5rem] border border-orange-200/35 bg-[linear-gradient(160deg,rgba(70,24,22,0.96),rgba(35,15,64,0.97)_52%,rgba(8,12,34,0.98))] px-5 pb-5 pt-6 text-center text-white shadow-[0_24px_80px_rgba(0,0,0,0.58)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,193,7,0.32),transparent_32%),radial-gradient(circle_at_18%_18%,rgba(255,87,34,0.28),transparent_30%),radial-gradient(circle_at_82%_22%,rgba(236,72,153,0.2),transparent_30%)]" />
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/16 bg-white/8 text-white/78 transition hover:bg-white/14 hover:text-white"
          aria-label="Close winner popup"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>

        <div className="relative z-10">
          <div className="suzi-game-fire-art mx-auto" aria-hidden>
            <span className="suzi-game-fire-art__flame suzi-game-fire-art__flame--back" />
            <span className="suzi-game-fire-art__flame suzi-game-fire-art__flame--mid" />
            <span className="suzi-game-fire-art__flame suzi-game-fire-art__flame--front" />
            <span className="suzi-game-fire-art__spark suzi-game-fire-art__spark--one" />
            <span className="suzi-game-fire-art__spark suzi-game-fire-art__spark--two" />
            <span className="suzi-game-fire-art__spark suzi-game-fire-art__spark--three" />
          </div>

          <p className="mt-4 text-[0.7rem] font-black uppercase tracking-[0.32em] text-orange-100/82">
            Winner
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
            {winnerName}
          </h2>
          <p className="mt-2 text-sm font-semibold text-orange-50/84">
            took the win in {gameName}
          </p>

          <div className="mt-5 rounded-[1rem] border border-orange-200/20 bg-white/8 px-4 py-3 text-sm text-orange-50/86">
            Game over. The table is ready for a replay whenever the players are.
          </div>

          <button
            type="button"
            onClick={onClose}
            className="suzi-primary-btn mt-5 px-5 py-2.5 text-sm"
          >
            Back to game
          </button>
        </div>
      </div>
    </div>
  );
}

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
  const [soundOn, setSoundOn] = useState(false);
  const [chatMessages, setChatMessages] = useState<ApiGameChatMessage[]>([]);
  const [chatDraft, setChatDraft] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [watcherCount, setWatcherCount] = useState(0);
  const [allowSpectatorChat, setAllowSpectatorChat] = useState(true);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [dismissedWinnerKey, setDismissedWinnerKey] = useState<string | null>(null);
  const [checkersMoveNotice, setCheckersMoveNotice] = useState<{ id: number; message: string } | null>(null);
  const [mobileDrawer, setMobileDrawer] = useState<"info" | "chat" | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const soundInitialized = useRef(false);
  const prevMovesLen = useRef(0);
  const prevTurnId = useRef<string | null>(null);
  const seatedRef = useRef(false);
  const boardBodyRef = useRef<HTMLDivElement | null>(null);
  const boardStageRef = useRef<HTMLDivElement | null>(null);
  const currentLobbyRef = useRef<{ lobbyId: string; gameId: string } | null>(null);
  const [boardFitPx, setBoardFitPx] = useState(0);

  const auth = useMemo(() => getStoredAuthSession(), []);

  const showCheckersMoveNotice = useCallback((message: string) => {
    setError("");
    setCheckersMoveNotice({ id: Date.now(), message });
  }, []);

  useEffect(() => {
    const body = boardBodyRef.current;
    if (!body || !session?.gameType) return;

    const updateBoardFit = () => {
      const rect = body.getBoundingClientRect();
      const nextFit = boardFitForStage(session.gameType, rect.width, rect.height);
      setBoardFitPx((prev) => (Math.abs(prev - nextFit) > 1 ? nextFit : prev));
    };

    updateBoardFit();
    const observer = new ResizeObserver(updateBoardFit);
    observer.observe(body);
    window.addEventListener("resize", updateBoardFit);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateBoardFit);
    };
  }, [session?.gameType]);

  useEffect(() => {
    if (!checkersMoveNotice) return;
    const timeout = window.setTimeout(() => {
      setCheckersMoveNotice((current) => (
        current?.id === checkersMoveNotice.id ? null : current
      ));
    }, 10_000);
    return () => window.clearTimeout(timeout);
  }, [checkersMoveNotice]);

  useEffect(() => {
    if (session?.gameType !== "CHECKERS") {
      setCheckersMoveNotice(null);
    }
  }, [session?.gameType]);

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
    currentLobbyRef.current = session
      ? {
          lobbyId: session.lobbyId,
          gameId: gameRouteId ?? gameTypeToId(session.gameType),
        }
      : null;
  }, [gameRouteId, session]);

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
      void joinSessionChannel(s, sessionId).then((presence) => {
        if (!presence) return;
        setWatcherCount(presence.watcherCount);
        setAllowSpectatorChat(presence.allowSpectatorChat);
      });
      void refresh();
    };
    const onDisconnect = () => setSocketReady(false);
    const onState = (next: ApiGameSession) => {
      if (next.id === sessionId) {
        setSession(next);
        setError("");
      }
    };
    const onSessionSync = (payload: { sessionId?: string }) => {
      if (payload?.sessionId !== sessionId) return;
      if (seatedRef.current) return;
      void refresh();
    };
    const onPresence = (payload: {
      sessionId?: string;
      watcherCount?: number;
      allowSpectatorChat?: boolean;
    }) => {
      if (payload?.sessionId !== sessionId) return;
      if (typeof payload.watcherCount === "number") {
        setWatcherCount(payload.watcherCount);
      }
      if (typeof payload.allowSpectatorChat === "boolean") {
        setAllowSpectatorChat(payload.allowSpectatorChat);
      }
    };
    const onChat = (message: ApiGameChatMessage) => {
      if (message.sessionId !== sessionId) return;
      setChatMessages((prev) => (
        prev.some((row) => row.id === message.id) ? prev : [...prev, message]
      ));
    };
    const onLobbyDeleted = (payload: { lobbyId?: string }) => {
      const current = currentLobbyRef.current;
      if (!current || payload?.lobbyId !== current.lobbyId) return;
      window.location.href = `/app/games/${current.gameId}`;
    };
    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    s.on("game:state", onState);
    s.on("game:session:sync", onSessionSync);
    s.on("game:session:presence", onPresence);
    s.on("game:chat", onChat);
    s.on("game:lobby:deleted", onLobbyDeleted);
    if (s.connected) onConnect();
    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.off("game:state", onState);
      s.off("game:session:sync", onSessionSync);
      s.off("game:session:presence", onPresence);
      s.off("game:chat", onChat);
      s.off("game:lobby:deleted", onLobbyDeleted);
    };
  }, [auth?.accessToken, refresh, sessionId]);

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
    if (session?.gameType === "CHECKERS") {
      setCheckersMoveNotice(null);
    }
    try {
      const socket = openGamesSocket(auth.accessToken);
      if (socket.connected) {
        try {
          const next = await postGameSessionAction(socket, sessionId, payload, kind);
          setSession(next);
          return;
        } catch (socketError) {
          if (socketError instanceof GameSocketApplicationError) {
            throw socketError;
          }
          /* fall back to HTTP */
        }
      }
      const next = await postGameAction(auth.accessToken, sessionId, payload, kind);
      setSession(next);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Action failed.";
      if (session?.gameType === "CHECKERS" && isCheckersMoveNotice(msg)) {
        showCheckersMoveNotice(msg);
        return;
      }
      setError(msg);
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
  const winnerSeatUser =
    session?.lobby?.seats?.find((seat) => seat.userId === session?.winnerUserId)?.user ?? null;
  const winnerDisplay =
    winnerSeatUser?.displayName?.trim() ||
    winnerSeatUser?.username ||
    (session?.winnerUserId ? session.winnerUserId.slice(0, 8) : "—");

  const isSeated = Boolean(meId && session?.lobby.seats.some((s) => s.userId === meId));
  const spectator = Boolean(session && meId && !isSeated);
  const isLobbyOwner = Boolean(session && meId && session.lobby.ownerId === meId);
  const canChat = Boolean(
    session &&
      meId &&
      (isSeated || isLobbyOwner || (spectator && allowSpectatorChat)),
  );

  useEffect(() => {
    seatedRef.current = isSeated;
  }, [isSeated]);

  useEffect(() => {
    if (!session?.lobby) return;
    setAllowSpectatorChat(parseGameLobbySettings(session.lobby.settings).allowSpectatorChat);
  }, [session?.lobby]);

  async function toggleSpectatorChat(next: boolean) {
    if (!auth?.accessToken || !session?.lobbyId || !isLobbyOwner) return;
    setSettingsBusy(true);
    setError("");
    try {
      const socket = openGamesSocket(auth.accessToken);
      const updated =
        socket.connected
          ? await postGameLobbySettings(socket, session.lobbyId, {
              allowSpectatorChat: next,
            })
          : await updateGameLobbySettings(auth.accessToken, session.lobbyId, {
              allowSpectatorChat: next,
            });
      setAllowSpectatorChat(parseGameLobbySettings(updated.settings).allowSpectatorChat);
      setSession((prev) =>
        prev ? { ...prev, lobby: { ...prev.lobby, settings: updated.settings } } : prev,
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not update chat settings.");
    } finally {
      setSettingsBusy(false);
    }
  }

  async function startFromCurrentLobby(restart: boolean) {
    if (!auth?.accessToken || !session?.lobbyId) return;
    if (restart && session.status === "ACTIVE") {
      const confirmed =
        typeof window === "undefined"
          ? true
          : window.confirm("Restart this game from the beginning?");
      if (!confirmed) return;
    }
    setBusy(true);
    setError("");
    try {
      const socket = openGamesSocket(auth.accessToken);
      const next = socket.connected
        ? await postGameLobbyStart(socket, session.lobbyId, {}, restart)
        : await startGameSession(auth.accessToken, session.lobbyId, {}, restart);
      window.location.href = `/app/games/${gameTypeToId(next.gameType)}/session/${next.id}`;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : restart ? "Could not restart game." : "Could not replay game.");
    } finally {
      setBusy(false);
    }
  }

  async function leaveCurrentTable() {
    if (!auth?.accessToken || !session?.lobbyId) return;
    const confirmed =
      typeof window === "undefined"
        ? true
        : window.confirm(
            isLobbyOwner
              ? "Leave and delete this lobby? Since you created it, leaving removes the table for everyone."
              : "Leave this table?",
          );
    if (!confirmed) return;
    setBusy(true);
    setError("");
    try {
      await leaveGameLobby(auth.accessToken, session.lobbyId);
      window.location.href = `/app/games/${gameTypeToId(session.gameType)}`;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not leave table.");
    } finally {
      setBusy(false);
    }
  }

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
  const checkersForcedFrom =
    typeof state.mustContinueFrom === "string" ? state.mustContinueFrom : null;
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
  const gomokuSize = Number(state.size ?? 15);
  const gomokuBoard = Array.from({ length: gomokuSize }, (_, r) =>
    Array.from({ length: gomokuSize }, (_, c) => Number(asArray(rawC4[r])[c] ?? 0)),
  );
  const dotsSize = Number(state.size ?? 4);
  const rawHorizontalEdges = asArray(state.horizontalEdges);
  const rawVerticalEdges = asArray(state.verticalEdges);
  const rawBoxes = asArray(state.boxes);
  const dotsHorizontalEdges = Array.from({ length: dotsSize + 1 }, (_, r) =>
    Array.from({ length: dotsSize }, (_, c) => Boolean(asArray(rawHorizontalEdges[r])[c])),
  );
  const dotsVerticalEdges = Array.from({ length: dotsSize }, (_, r) =>
    Array.from({ length: dotsSize + 1 }, (_, c) => Boolean(asArray(rawVerticalEdges[r])[c])),
  );
  const dotsBoxes = Array.from({ length: dotsSize }, (_, r) =>
    Array.from({ length: dotsSize }, (_, c) => Number(asArray(rawBoxes[r])[c] ?? 0)),
  );
  const dotsScores = asArray(state.scores).map(Number);

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

  const currentGameName = session
    ? (gameMeta.find((game) => game.id === gameRouteId || game.type === session.gameType)?.name ??
      `${session.gameType.replace("_", " ")} Session`)
    : "Game Session";
  const winnerCelebrationKey =
    session?.status === "FINISHED" && session.winnerUserId
      ? `${session.id}:${session.winnerUserId}:${session.endedAt ?? ""}`
      : null;
  const showWinnerCelebration =
    Boolean(winnerCelebrationKey) && dismissedWinnerKey !== winnerCelebrationKey;
  const frameSubtitle = !session
    ? undefined
    : spectator
      ? "You’re watching — open a seat in the lobby to play."
      : session.status === "ACTIVE"
        ? isTurn
          ? "Your turn"
          : `Waiting for ${turnDisplay}`
        : "Finished";
  const boardStageStyle = useMemo(
    () =>
      boardFitPx > 0
        ? ({ "--suzi-board-fit": `${boardFitPx}px` } as CSSProperties)
        : undefined,
    [boardFitPx],
  );

  return (
    <section className="suzi-app-frame-fill suzi-game-session-page">
      <div className="suzi-game-session-shell h-full min-h-0">
        {!session ? (
          <Panel className="suzi-panel--home p-[var(--panel-pad)]">
            <p className={cx(listL2, "text-cyan-100/75")}>Loading session...</p>
            {error ? <p className={cx(listL2, "mt-2 text-pink-100")}>{error}</p> : null}
          </Panel>
        ) : (
          <div className="suzi-game-session-layout grid h-full min-h-0 gap-[var(--col-gap)] xl:grid-cols-[clamp(14rem,17vw,18rem)_minmax(0,1fr)_clamp(15rem,19vw,20rem)]">
            {mobileDrawer ? (
              <button
                type="button"
                className="suzi-game-mobile-drawer-backdrop"
                aria-label="Close game drawer"
                onClick={() => setMobileDrawer(null)}
              />
            ) : null}

            <div className="suzi-game-mobile-drawer-controls" aria-label="Game panels">
              <button
                type="button"
                className="suzi-game-mobile-drawer-tab suzi-game-mobile-drawer-tab--info"
                onClick={() => setMobileDrawer((current) => (current === "info" ? null : "info"))}
                aria-expanded={mobileDrawer === "info"}
                aria-controls="game-session-info-panel"
              >
                Info
              </button>
              <button
                type="button"
                className="suzi-game-mobile-drawer-tab suzi-game-mobile-drawer-tab--chat"
                onClick={() => setMobileDrawer((current) => (current === "chat" ? null : "chat"))}
                aria-expanded={mobileDrawer === "chat"}
                aria-controls="game-session-chat-panel"
              >
                Chat
              </button>
            </div>

            <Panel
              id="game-session-info-panel"
              data-drawer-open={mobileDrawer === "info" ? "true" : "false"}
              className="suzi-panel--home suzi-game-info-panel flex h-full min-h-0 flex-col overflow-hidden p-[var(--panel-pad)]"
            >
              <div className={cx(homePanelHeader, "flex shrink-0 items-center justify-between gap-2.5")}>
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className={homePanelIcon}>
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2v20M2 12h20M5 5l14 14M19 5 5 19" />
                    </svg>
                  </span>
                  <h3 className={panelTitle}>Session Info</h3>
                </div>
                <button
                  type="button"
                  className="suzi-game-mobile-drawer-close"
                  onClick={() => setMobileDrawer(null)}
                  aria-label="Close session info"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
              </div>
              <div className="mt-3 grid gap-1.5">
                <p className={listL2}>Status: <span className="font-semibold text-white/90">{session.status}</span></p>
                <p className={listL2}>Turn: <span className="font-semibold text-white/90">{session.turnUserId ? `${turnDisplay}` : "—"}</span></p>
                <p className={listL2}>Winner: <span className="font-semibold text-white/90">{winnerDisplay}</span></p>
                <p className={listL2}>
                  Watching:{" "}
                  <span className="font-semibold text-white/90">{watcherCount}</span>
                </p>
              </div>

              {isLobbyOwner ? (
                <label className={cx(listMeta, "mt-3 flex cursor-pointer items-center gap-2 text-cyan-100/80")}>
                  <input
                    type="checkbox"
                    className="rounded border-cyan-400/40"
                    checked={allowSpectatorChat}
                    disabled={settingsBusy}
                    onChange={(e) => void toggleSpectatorChat(e.target.checked)}
                  />
                  Allow watchers to chat
                </label>
              ) : null}

              <label className={cx(listMeta, "mt-3 flex cursor-pointer items-center gap-2 text-cyan-100/80")}>
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

              <div className="mt-4 grid gap-2">
                <Link
                  href={`/app/games/${gameTypeToId(session.gameType)}`}
                  className={cx(homeBtnSecondary, "suzi-game-side-btn suzi-game-side-btn--secondary px-3")}
                  style={{ height: "var(--btn-h-sm)" }}
                >
                  Back to lobby
                </Link>
                {!spectator ? (
                  <button
                    type="button"
                    onClick={() => void runAction({ type: "resign" }, "RESIGN")}
                    className="suzi-game-side-btn suzi-game-side-btn--danger"
                  >
                    Resign
                  </button>
                ) : null}
                {isSeated && session.status !== "ACTIVE" ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void startFromCurrentLobby(false)}
                    className={cx(homeBtnPrimary, "suzi-game-side-btn suzi-game-side-btn--primary w-full px-3 disabled:opacity-60")}
                    style={{ height: "var(--btn-h-sm)" }}
                  >
                    Play again
                  </button>
                ) : null}
                {(session.status === "ACTIVE" ? isLobbyOwner : isSeated || isLobbyOwner) ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void startFromCurrentLobby(true)}
                    className={cx(homeBtnSecondary, "suzi-game-side-btn suzi-game-side-btn--secondary w-full px-3 disabled:opacity-60")}
                    style={{ height: "var(--btn-h-sm)" }}
                  >
                    Restart game
                  </button>
                ) : null}
                {isSeated ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void leaveCurrentTable()}
                    className="suzi-game-side-btn suzi-game-side-btn--warning"
                  >
                    Leave table
                  </button>
                ) : null}
              </div>

              <div className="suzi-home-inset suzi-thin-scroll mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
                <p className={cx(listSection, "text-cyan-100/66")}>
                  Moves
                </p>
                {session.moves.length === 0 ? (
                  <p className={cx(listMeta, "rounded-lg border border-cyan-300/18 bg-[rgba(21,14,66,0.32)] px-2.5 py-2 text-cyan-100/68")}>
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
                      className="rounded-lg border border-cyan-300/20 bg-[rgba(21,14,66,0.38)] px-2.5 py-2"
                    >
                      <p className={cx(listMeta, "font-semibold text-cyan-50/95")}>{moveLines[idx] ?? `#${move.ply}`}</p>
                      <p className={cx(listMeta, "mt-0.5 text-cyan-100/62")}>
                        {move.kind}
                        {mover ? ` · ${mover}` : ""}
                      </p>
                    </div>
                  );
                })}
              </div>
            </Panel>

            <GameFrame
              bodyRef={boardBodyRef}
              className="suzi-game-board-panel"
              title={
                currentGameName
              }
              subtitle={frameSubtitle}
              reconnecting={!socketReady}
              reconnectHint={RECONNECT_HINT}
              lobbyHref={`/app/games/${gameRouteId ?? gameTypeToId(session.gameType)}`}
              watcherCount={watcherCount}
            >
              <div
                ref={boardStageRef}
                data-game-type={session.gameType}
                style={boardStageStyle}
                className={cx(
                  "suzi-game-board-stage",
                  "relative",
                  session.gameType === "CHESS" ? "suzi-chess-session-wrap" : "h-full min-h-0",
                )}
              >
                {error ? (
                  <p
                    className={cx(listL2, "mb-3 rounded-lg border border-pink-400/30 bg-pink-500/12 px-3 py-2 text-pink-100")}
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
                    forcedFrom={checkersForcedFrom}
                    moveNotice={checkersMoveNotice}
                    onInvalidMove={showCheckersMoveNotice}
                    onDismissMoveNotice={() => setCheckersMoveNotice(null)}
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
                {session.gameType === "GOMOKU" && gamePlayers.length >= 2 ? (
                  <GomokuBoardView
                    board={gomokuBoard}
                    players={gamePlayers}
                    meId={meId}
                    myTurn={session.status === "ACTIVE" && isTurn}
                    busy={busy}
                    active={session.status === "ACTIVE"}
                    spectator={spectator}
                    onPlace={(row, col) => void runAction({ row, col })}
                  />
                ) : null}
                {session.gameType === "DOTS_AND_BOXES" && gamePlayers.length >= 2 ? (
                  <DotsAndBoxesBoardView
                    size={dotsSize}
                    horizontalEdges={dotsHorizontalEdges}
                    verticalEdges={dotsVerticalEdges}
                    boxes={dotsBoxes}
                    scores={dotsScores}
                    players={gamePlayers}
                    meId={meId}
                    myTurn={session.status === "ACTIVE" && isTurn}
                    busy={busy}
                    active={session.status === "ACTIVE"}
                    spectator={spectator}
                    onClaimEdge={(orientation, row, col) =>
                      void runAction({ orientation, row, col })
                    }
                  />
                ) : null}
              </div>
            </GameFrame>

            <Panel
              id="game-session-chat-panel"
              data-drawer-open={mobileDrawer === "chat" ? "true" : "false"}
              className="suzi-panel--home suzi-game-chat-panel flex h-full min-h-0 flex-col overflow-hidden p-[var(--panel-pad)]"
            >
              <div className={cx(homePanelHeader, "flex shrink-0 items-center justify-between gap-2")}>
                <div className="flex items-center gap-2.5">
                  <span className={homePanelIcon}>
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
                    </svg>
                  </span>
                  <h3 className={panelTitle}>Game Chat</h3>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={cx(listMeta, "inline-flex items-center gap-1.5", socketReady ? "text-emerald-100/80" : "text-amber-100/80")}>
                    {socketReady ? <span className="suzi-live-dot" aria-hidden /> : null}
                    {socketReady ? "Live" : "Syncing"}
                  </span>
                  <button
                    type="button"
                    className="suzi-game-mobile-drawer-close"
                    onClick={() => setMobileDrawer(null)}
                    aria-label="Close game chat"
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 6l12 12M18 6 6 18" />
                    </svg>
                  </button>
                </div>
              </div>
              {spectator && !allowSpectatorChat ? (
                <p className={cx(listMeta, "mt-2 text-amber-100/85")}>
                  Watchers cannot chat in this game.
                </p>
              ) : null}

              <div
                ref={chatScrollRef}
                className="suzi-chat-log suzi-thin-scroll mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto rounded-[var(--panel-radius)] bg-white p-2 shadow-[inset_0_2px_8px_rgba(7,4,28,0.22),inset_0_0_0_1px_rgba(0,0,0,0.04)]"
              >
                {chatMessages.length === 0 ? (
                  <p className={cx(listMeta, "px-1 py-2 text-center text-slate-500")}>
                    No game chat yet.
                  </p>
                ) : null}
                {chatMessages.map((message) => {
                  const mine = message.userId === meId;
                  const label = message.user?.displayName?.trim() || message.user?.username || "Player";
                  return (
                    <div
                      key={message.id}
                      className={`rounded-lg border px-2.5 py-2 ${listMeta} ${
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
                  placeholder={
                    canChat
                      ? spectator
                        ? "Message as watcher..."
                        : "Message players..."
                      : "Chat disabled for watchers"
                  }
                  disabled={!canChat}
                  className="suzi-input min-w-0 flex-1 px-3 disabled:opacity-55"
                  style={{ height: "var(--btn-h-sm)" }}
                  maxLength={500}
                />
                <button
                  type="submit"
                  disabled={chatBusy || !chatDraft.trim() || !canChat}
                  className={cx(homeBtnPrimary, "suzi-game-chat-send px-3 disabled:opacity-60")}
                  style={{ height: "var(--btn-h-sm)" }}
                >
                  Send
                </button>
              </form>
            </Panel>
          </div>
        )}
      </div>
      {showWinnerCelebration && winnerCelebrationKey ? (
        <WinnerCelebrationOverlay
          winnerName={winnerDisplay}
          gameName={currentGameName}
          onClose={() => setDismissedWinnerKey(winnerCelebrationKey)}
        />
      ) : null}
    </section>
  );
}
