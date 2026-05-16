"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { usePokerArcadeSfx, playPokerActionSound } from "@/components/app/games/use-poker-arcade-sfx";
import { gameLobbyArtForId } from "@/lib/game-icons";
import type { ApiGameLobby } from "@/lib/games-client";

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

const SUIT: Record<string, string> = { c: "♣", d: "♦", h: "♥", s: "♠" };

function seatAngle(index: number, total: number, myIndex: number) {
  const rel = (index - myIndex + total) % total;
  const start = Math.PI / 2;
  return start + (rel / total) * Math.PI * 2;
}

function seatPosition(index: number, total: number, myIndex: number) {
  const a = seatAngle(index, total, myIndex);
  const rx = total <= 2 ? 38 : 44;
  const ry = total <= 2 ? 34 : 40;
  return {
    left: `${50 + rx * Math.cos(a)}%`,
    top: `${50 + ry * Math.sin(a)}%`,
    transform: `translate(-50%, -50%) rotate(${(a * 180) / Math.PI + 90}deg)`,
  };
}

function ArcadeCard({
  code,
  dealIndex = 0,
  faceDown = false,
  large = false,
}: {
  code: string;
  dealIndex?: number;
  faceDown?: boolean;
  large?: boolean;
}) {
  const size = large ? "suzi-poker-card--lg" : "";
  if (faceDown || code === "BACK") {
    return (
      <div
        className={`suzi-poker-card suzi-poker-card--back ${size}`}
        style={{ animationDelay: `${dealIndex * 70}ms` }}
        aria-hidden
      >
        <span className="suzi-poker-card-back-gem" />
        <span className="suzi-poker-card-back-label">SUZI</span>
      </div>
    );
  }
  const rank = code.slice(0, 1);
  const suitKey = code.slice(1, 2);
  const suit = SUIT[suitKey] ?? suitKey;
  const red = suitKey === "h" || suitKey === "d";
  return (
    <div
      className={`suzi-poker-card suzi-poker-card--face ${red ? "is-red" : ""} ${size}`}
      style={{ animationDelay: `${dealIndex * 70}ms` }}
    >
      <span className="suzi-poker-card-rank">{rank}</span>
      <span className="suzi-poker-card-suit">{suit}</span>
      <span className="suzi-poker-card-rank suzi-poker-card-rank--bl">{rank}</span>
    </div>
  );
}

export type PokerArcadeTableProps = {
  lobbySeats: ApiGameLobby["seats"];
  state: Record<string, unknown>;
  busy: boolean;
  meId: string;
  myTurn: boolean;
  soundOn?: boolean;
  gameRouteId?: string;
  readOnly?: boolean;
  onAction: (kind: string, amount?: number) => void;
  onNextHand?: () => void;
};

export function PokerArcadeTable({
  lobbySeats,
  state,
  busy,
  meId,
  myTurn,
  soundOn = false,
  gameRouteId = "poker",
  readOnly = false,
  onAction,
  onNextHand,
}: PokerArcadeTableProps) {
  const board = asArray(state.board).map(String);
  const players = asArray(state.players) as Array<Record<string, unknown>>;
  const winners = asArray(state.winners) as Array<Record<string, unknown>>;
  const [amount, setAmount] = useState(100);
  const [potPulse, setPotPulse] = useState(false);

  const pot = Number(state.pot ?? 0);
  const currentBet = Number(state.currentBet ?? 0);
  const minRaise = Number(state.minRaise ?? 20);
  const phase = String(state.phase ?? "PREFLOP");
  const handComplete = phase === "COMPLETE";
  const buttonSeat = Number(state.buttonSeatIndex ?? 0);
  const smallBlindSeat = Number(state.smallBlindSeatIndex ?? 0);
  const bigBlindSeat = Number(state.bigBlindSeatIndex ?? 0);
  const tableArt = gameLobbyArtForId(gameRouteId);
  const variant = gameRouteId === "texasholdem" ? "texas" : "poker";

  const me = useMemo(
    () => players.find((p) => String(p.userId ?? "") === meId),
    [players, meId],
  );
  const myCommitted = Number(me?.committed ?? 0);
  const toCall = Math.max(0, currentBet - myCommitted);
  const canCheck = toCall <= 0;
  const minBet = currentBet > 0 ? currentBet + minRaise : minRaise;
  const controlsDisabled = readOnly || busy || !myTurn || handComplete;

  usePokerArcadeSfx(soundOn, state, myTurn, meId);

  useEffect(() => {
    setAmount(Math.max(minBet, minRaise * 2));
  }, [minBet, minRaise, phase]);

  useEffect(() => {
    setPotPulse(true);
    const t = window.setTimeout(() => setPotPulse(false), 520);
    return () => window.clearTimeout(t);
  }, [pot]);

  const roleLabel = (seatIndex: number) => {
    if (seatIndex === buttonSeat) return "D";
    if (seatIndex === smallBlindSeat && smallBlindSeat !== buttonSeat) return "SB";
    if (seatIndex === bigBlindSeat) return "BB";
    return null;
  };

  const fireAction = (kind: string, betAmount?: number) => {
    if (soundOn) playPokerActionSound(kind);
    onAction(kind, betAmount);
  };

  const sortedPlayers = [...players].sort(
    (a, b) => Number(a.seatIndex ?? 0) - Number(b.seatIndex ?? 0),
  );
  const myIndex = Math.max(
    0,
    sortedPlayers.findIndex((p) => String(p.userId ?? "") === meId),
  );

  return (
    <div className={`suzi-poker-arcade suzi-poker-arcade--${variant}`} data-phase={phase}>
      {readOnly ? (
        <p className="suzi-poker-arcade-banner suzi-poker-arcade-banner--watch">
          Spectating — take a seat in the lobby to play
        </p>
      ) : null}
      {!readOnly && !handComplete && !myTurn ? (
        <p className="suzi-poker-arcade-banner">Waiting for another player…</p>
      ) : null}
      {myTurn && !handComplete && !readOnly ? (
        <p className="suzi-poker-arcade-banner suzi-poker-arcade-banner--turn">Your turn</p>
      ) : null}

      {handComplete && winners.length > 0 ? (
        <div className="suzi-poker-arcade-win-sheet">
          <p className="suzi-poker-arcade-win-title">Showdown</p>
          <ul className="suzi-poker-arcade-win-list">
            {winners.map((row, i) => {
              const uid = String(row.userId ?? "");
              const seat = lobbySeats.find((s) => s.userId === uid);
              const name =
                seat?.user?.displayName?.trim() || seat?.user?.username || uid.slice(0, 8);
              return (
                <li key={`${uid}-${i}`}>
                  {name} · {String(row.rankName ?? "Winner")} (+{String(row.amount ?? 0)})
                </li>
              );
            })}
          </ul>
          {!readOnly && onNextHand ? (
            <button
              type="button"
              disabled={busy}
              className="suzi-poker-arcade-btn suzi-poker-arcade-btn--gold"
              onClick={onNextHand}
            >
              Deal next hand
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="suzi-poker-arcade-scene">
        <div className="suzi-poker-arcade-scene-perspective">
          <div className="suzi-poker-arcade-table-shell">
            <div className="suzi-poker-arcade-rail" />
            <div className="suzi-poker-arcade-felt">
              <Image src={tableArt} alt="" fill className="object-cover opacity-55" sizes="800px" />
              <div className="suzi-poker-arcade-felt-shine" aria-hidden />
            </div>

            <div className={`suzi-poker-arcade-pot ${potPulse ? "is-pulse" : ""}`}>
              <span className="suzi-poker-arcade-pot-label">Pot</span>
              <span className="suzi-poker-arcade-pot-value">{pot}</span>
              {currentBet > 0 ? (
                <span className="suzi-poker-arcade-pot-bet">Bet {currentBet}</span>
              ) : null}
            </div>

            <div className="suzi-poker-arcade-board">
              {board.length === 0 ? (
                <span className="suzi-poker-arcade-board-placeholder">Board</span>
              ) : (
                board.map((card, i) => (
                  <ArcadeCard key={`${card}-${i}`} code={String(card)} dealIndex={i} large />
                ))
              )}
            </div>

            <div className="suzi-poker-arcade-phase-pill">{phase.replace("_", " ")}</div>

            {sortedPlayers.map((player, index) => {
              const uid = String(player.userId ?? "");
              const isMe = uid === meId;
              const seatIndex = Number(player.seatIndex ?? index);
              const seatRow = lobbySeats.find((s) => s.userId === uid);
              const displayName =
                seatRow?.user?.displayName?.trim() ||
                seatRow?.user?.username ||
                `Seat ${seatIndex}`;
              const avatarUrl = seatRow?.user?.avatarUrl;
              const rawCards = asArray(player.cards).map(String);
              const reveal =
                isMe || phase === "SHOWDOWN" || phase === "COMPLETE";
              const folded = Boolean(player.folded);
              const allIn = Boolean(player.allIn);
              const role = roleLabel(seatIndex);
              const committed = Number(player.committed ?? 0);
              const stack = Number(player.stack ?? 0);
              const pos = seatPosition(index, sortedPlayers.length, myIndex);
              const isActor =
                !handComplete &&
                Number(state.currentTurnSeatIndex ?? -1) === seatIndex;

              return (
                <div
                  key={uid || index}
                  className={`suzi-poker-arcade-seat ${isMe ? "is-me" : ""} ${folded ? "is-folded" : ""} ${isActor ? "is-active" : ""}`}
                  style={{ left: pos.left, top: pos.top }}
                >
                  <div className="suzi-poker-arcade-seat-inner" style={{ transform: pos.transform }}>
                    <div className="suzi-poker-arcade-avatar-wrap">
                      {avatarUrl ? (
                        <Image
                          src={avatarUrl}
                          alt=""
                          width={48}
                          height={48}
                          className="suzi-poker-arcade-avatar"
                        />
                      ) : (
                        <span className="suzi-poker-arcade-avatar suzi-poker-arcade-avatar--fallback">
                          {displayName.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      {role ? <span className="suzi-poker-arcade-role">{role}</span> : null}
                    </div>
                    <p className="suzi-poker-arcade-seat-name">{isMe ? "You" : displayName}</p>
                    <p className="suzi-poker-arcade-seat-stack">{stack}</p>
                    {committed > 0 ? (
                      <div className="suzi-poker-arcade-chips">
                        <span className="suzi-poker-arcade-chip" />
                        <span className="suzi-poker-arcade-chip suzi-poker-arcade-chip--2" />
                        <span className="suzi-poker-arcade-bet-amt">{committed}</span>
                      </div>
                    ) : null}
                    <div className="suzi-poker-arcade-hole">
                      {rawCards.length === 0 ? null : reveal ? (
                        rawCards.map((c, i) => (
                          <ArcadeCard key={i} code={String(c)} dealIndex={i} />
                        ))
                      ) : (
                        <>
                          <ArcadeCard code="BACK" dealIndex={0} faceDown />
                          <ArcadeCard code="BACK" dealIndex={1} faceDown />
                        </>
                      )}
                    </div>
                    {allIn ? <span className="suzi-poker-arcade-tag">ALL IN</span> : null}
                    {folded ? <span className="suzi-poker-arcade-tag suzi-poker-arcade-tag--fold">FOLD</span> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {!handComplete ? (
        <div className="suzi-poker-arcade-dock">
          <div className="suzi-poker-arcade-dock-inner">
            <button
              type="button"
              disabled={controlsDisabled || !canCheck}
              className="suzi-poker-arcade-btn"
              onClick={() => fireAction("CHECK")}
            >
              Check
            </button>
            <button
              type="button"
              disabled={controlsDisabled || canCheck}
              className="suzi-poker-arcade-btn"
              onClick={() => fireAction("CALL")}
            >
              {toCall > 0 ? `Call ${toCall}` : "Call"}
            </button>
            <button
              type="button"
              disabled={controlsDisabled}
              className="suzi-poker-arcade-btn suzi-poker-arcade-btn--fold"
              onClick={() => fireAction("FOLD")}
            >
              Fold
            </button>
            <div className="suzi-poker-arcade-raise-wrap">
              <input
                type="number"
                min={minBet}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                disabled={readOnly || handComplete}
                className="suzi-poker-arcade-raise-input"
              />
              <button
                type="button"
                disabled={controlsDisabled || currentBet > 0}
                className="suzi-poker-arcade-btn suzi-poker-arcade-btn--gold"
                onClick={() => fireAction("BET", amount)}
              >
                Bet
              </button>
              <button
                type="button"
                disabled={controlsDisabled || currentBet <= 0}
                className="suzi-poker-arcade-btn suzi-poker-arcade-btn--gold"
                onClick={() => fireAction("RAISE", amount)}
              >
                Raise
              </button>
            </div>
            <button
              type="button"
              disabled={controlsDisabled}
              className="suzi-poker-arcade-btn suzi-poker-arcade-btn--allin"
              onClick={() => fireAction("ALL_IN")}
            >
              All-in
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
