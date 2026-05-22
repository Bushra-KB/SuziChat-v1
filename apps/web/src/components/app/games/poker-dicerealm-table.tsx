"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { PokerDicerealmControls } from "@/components/app/games/poker-dicerealm-controls";
import {
  asArray,
  displayIndexForSeat,
  formatChips,
  formatRank,
  lastActionForSeat,
  parsePokerPlayers,
  POKER_SUITS,
  seatDisplayName,
  vintageSeatPosition,
  type PokerTableViewProps,
} from "@/components/app/games/poker-table-shared";
import { usePokerArcadeSfx, playPokerActionSound } from "@/components/app/games/use-poker-arcade-sfx";
import { usePokerTableAnimations } from "@/components/app/games/use-poker-table-animations";
import { resolveUserAvatarUrl } from "@/lib/avatar-url";

function DrCard({
  code,
  dealIndex = 0,
  faceDown = false,
  large = false,
  isNew = false,
}: {
  code: string;
  dealIndex?: number;
  faceDown?: boolean;
  large?: boolean;
  isNew?: boolean;
}) {
  if (faceDown || code === "BACK") {
    return (
      <div
        className={`suzi-poker-dr-card suzi-poker-dr-card--back ${large ? "is-lg" : ""} ${isNew ? "is-deal-new" : ""}`}
        style={{ animationDelay: `${dealIndex * 55}ms` }}
        aria-hidden
      >
        <span className="suzi-poker-dr-card-art" />
      </div>
    );
  }
  const rank = formatRank(code.slice(0, 1));
  const suitKey = code.slice(1, 2);
  const suit = POKER_SUITS[suitKey] ?? suitKey;
  const red = suitKey === "h" || suitKey === "d";
  return (
    <div
      className={`suzi-poker-dr-card suzi-poker-dr-card--face ${red ? "is-red" : ""} ${large ? "is-lg" : ""} ${isNew ? "is-deal-new" : ""}`}
      style={{ animationDelay: `${dealIndex * 55}ms` }}
    >
      <span className="suzi-poker-dr-card-rank">{rank}</span>
      <span className="suzi-poker-dr-card-suit">{suit}</span>
    </div>
  );
}

function phaseIcon(phase: string) {
  if (phase === "RIVER" || phase === "TURN") return "◎";
  if (phase === "FLOP") return "◆";
  if (phase === "SHOWDOWN" || phase === "COMPLETE") return "★";
  return "●";
}

export function PokerDicerealmTable({
  lobbySeats,
  state,
  sessionId = "",
  busy,
  meId,
  myTurn,
  soundOn = false,
  gameRouteId = "poker",
  readOnly = false,
  onAction,
  onNextHand,
}: PokerTableViewProps) {
  const board = asArray(state.board).map(String);
  const winners = asArray(state.winners) as Array<Record<string, unknown>>;
  const players = parsePokerPlayers(state);
  const [amount, setAmount] = useState(100);
  const animKey = sessionId || `hand-${String(state.handNumber ?? 0)}`;
  const anim = usePokerTableAnimations(state, animKey);

  const pot = Number(state.pot ?? 0);
  const currentBet = Number(state.currentBet ?? 0);
  const minRaise = Number(state.minRaise ?? 20);
  const phase = String(state.phase ?? "PREFLOP");
  const handComplete = phase === "COMPLETE";
  const buttonSeat = Number(state.buttonSeatIndex ?? 0);
  const smallBlindSeat = Number(state.smallBlindSeatIndex ?? 0);
  const bigBlindSeat = Number(state.bigBlindSeatIndex ?? 0);
  const variant = gameRouteId === "texasholdem" ? "texas" : "poker";
  const brandTitle =
    gameRouteId === "texasholdem" ? "TEXAS HOLD'EM" : "SUZI POKER";

  const sortedLobbySeats = useMemo(
    () => [...lobbySeats].sort((a, b) => a.seatIndex - b.seatIndex),
    [lobbySeats],
  );
  const seatCount = Math.max(sortedLobbySeats.length, players.length, 2);
  const mySeatIndex =
    players.find((p) => p.userId === meId)?.seatIndex ??
    sortedLobbySeats.find((s) => s.userId === meId)?.seatIndex ??
    0;

  const me = useMemo(
    () => players.find((p) => p.userId === meId),
    [players, meId],
  );
  const myCommitted = me?.committed ?? 0;
  const myStack = me?.stack ?? 0;
  const toCall = Math.max(0, currentBet - myCommitted);
  const canCheck = toCall <= 0;
  const minBet = currentBet > 0 ? currentBet + minRaise : minRaise;
  const maxBet = myStack + myCommitted;
  const controlsDisabled = readOnly || busy || !myTurn || handComplete;

  usePokerArcadeSfx(soundOn, state, myTurn, meId);

  useEffect(() => {
    setAmount(Math.max(minBet, Math.min(maxBet, minRaise * 2)));
  }, [minBet, minRaise, maxBet, phase]);

  const fireAction = (kind: string, betAmount?: number) => {
    if (soundOn) playPokerActionSound(kind);
    onAction(kind, betAmount);
  };

  const handleRaise = () => {
    if (currentBet > 0) fireAction("RAISE", amount);
    else fireAction("BET", amount);
  };

  return (
    <div className={`suzi-poker-dr suzi-poker-dr--${variant}`} data-phase={phase}>
      <div className="suzi-poker-dr-arena">
        <p className="suzi-poker-dr-brand">{brandTitle}</p>

        {handComplete && winners.length > 0 ? (
          <div className="suzi-poker-dr-win-sheet">
            <p className="suzi-poker-dr-win-title">Showdown</p>
            <ul className="suzi-poker-dr-win-list">
              {winners.map((row, i) => {
                const uid = String(row.userId ?? "");
                const name = seatDisplayName(
                  lobbySeats,
                  uid,
                  Number(players.find((p) => p.userId === uid)?.seatIndex ?? 0),
                );
                return (
                  <li key={`${uid}-${i}`}>
                    {name} · {String(row.rankName ?? "Winner")} (+{formatChips(Number(row.amount ?? 0))})
                  </li>
                );
              })}
            </ul>
            {!readOnly && onNextHand ? (
              <button
                type="button"
                disabled={busy}
                className="suzi-poker-dr-action suzi-poker-dr-action--raise"
                onClick={onNextHand}
              >
                Deal next hand
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="suzi-poker-dr-table-wrap">
          <div
            className={`suzi-poker-dr-table-hex ${anim.newHand ? "is-new-hand" : ""} ${anim.streetFlash ? "is-street-flash" : ""}`}
          >
            <div className="suzi-poker-dr-table-neon" aria-hidden />
            <div className={`suzi-poker-dr-table-felt ${anim.streetFlash ? "is-street-flash" : ""}`}>
              <div className="suzi-poker-dr-center">
                <div className="suzi-poker-dr-center-top">
                  <span
                    className={`suzi-poker-dr-phase-pill ${anim.streetFlash ? "is-street-change" : ""}`}
                  >
                    <span aria-hidden>{phaseIcon(phase)}</span>
                    {phase.replace(/_/g, " ")}
                  </span>
                  <div className={`suzi-poker-dr-main-pot ${anim.potPulse ? "is-pulse" : ""}`}>
                    <span className="suzi-poker-dr-main-pot-label">Main pot</span>
                    <span className="suzi-poker-dr-main-pot-row">
                      <span className="suzi-poker-dr-pot-icon" aria-hidden>
                        💰
                      </span>
                      <span className="suzi-poker-dr-main-pot-value">{formatChips(pot)}</span>
                    </span>
                  </div>
                </div>

                <div className="suzi-poker-dr-board">
                  {board.length === 0
                    ? Array.from({ length: 5 }, (_, i) => (
                        <div key={i} className="suzi-poker-dr-card suzi-poker-dr-card--ghost" />
                      ))
                    : board.map((card, i) => (
                        <DrCard
                          key={`${card}-${i}`}
                          code={card}
                          dealIndex={i}
                          large
                          isNew={anim.newBoardIndices.includes(i)}
                        />
                      ))}
                </div>
              </div>
            </div>

            <div className="suzi-poker-dr-seats-layer">
              {sortedLobbySeats.map((lobbySeat) => {
                const seatIndex = lobbySeat.seatIndex;
                const player = players.find((p) => p.seatIndex === seatIndex);
                const occupied = Boolean(player);
                const displayIndex = displayIndexForSeat(
                  seatIndex,
                  mySeatIndex,
                  seatCount,
                );
                const pos = vintageSeatPosition(displayIndex, seatCount);
                const isMe = player?.userId === meId;
                const isActor =
                  occupied &&
                  !handComplete &&
                  Number(state.currentTurnSeatIndex ?? -1) === seatIndex;
                const reveal =
                  occupied &&
                  (isMe || phase === "SHOWDOWN" || phase === "COMPLETE");
                const lastAction = occupied
                  ? lastActionForSeat(state, seatIndex)
                  : null;
                const displayName = occupied
                  ? isMe
                    ? "You"
                    : seatDisplayName(lobbySeats, player!.userId, seatIndex)
                  : "Empty Seat";
                const avatarUrl = lobbySeat.user?.avatarUrl;
                const avatarSrc = resolveUserAvatarUrl(avatarUrl);
                const role =
                  seatIndex === buttonSeat
                    ? "D"
                    : seatIndex === smallBlindSeat && smallBlindSeat !== buttonSeat
                      ? "SB"
                      : seatIndex === bigBlindSeat
                        ? "BB"
                        : null;

                if (!occupied) {
                  return (
                    <div
                      key={`empty-${seatIndex}`}
                      className="suzi-poker-dr-seat suzi-poker-dr-seat--empty"
                      style={{
                        left: pos.left,
                        top: pos.top,
                        transform: pos.transform,
                      }}
                    >
                      <div className="suzi-poker-dr-empty-ring">
                        <span>Empty</span>
                      </div>
                    </div>
                  );
                }

                const p = player!;
                const actionLabel =
                  isActor && myTurn && isMe
                    ? "Your Turn!"
                    : lastAction ?? (p.allIn ? "All-in" : p.folded ? "Folded" : null);

                const justActed = anim.actedSeatIndex === seatIndex;
                const chipFly = anim.chipFlySeat === seatIndex;

                return (
                  <div
                    key={p.userId}
                    className={`suzi-poker-dr-seat ${isMe ? "is-me" : ""} ${p.folded ? "is-folded" : ""} ${isActor ? "is-active" : ""} ${justActed ? "is-acted" : ""} ${chipFly ? "is-chip-fly" : ""}`}
                    style={{
                      left: pos.left,
                      top: pos.top,
                      transform: pos.transform,
                    }}
                  >
                    {p.committed > 0 ? (
                      <div
                        className={`suzi-poker-dr-action-chip ${lastAction === "Raised" ? "is-raise" : lastAction === "Called" ? "is-call" : ""}`}
                      >
                        <span className="suzi-poker-dr-action-chip-label">
                          {lastAction === "Raised"
                            ? "Raise"
                            : lastAction === "Called"
                              ? "Call"
                              : "Bet"}
                        </span>
                        <span>{formatChips(p.committed)}</span>
                      </div>
                    ) : null}

                    <div className="suzi-poker-dr-seat-top">
                      <div className="suzi-poker-dr-hole">
                        {p.cards.length === 0
                          ? null
                          : reveal
                            ? p.cards.map((c, i) => (
                                <DrCard key={i} code={c} dealIndex={i} />
                              ))
                            : (
                              <>
                                <DrCard code="BACK" dealIndex={0} faceDown />
                                <DrCard code="BACK" dealIndex={1} faceDown />
                              </>
                            )}
                      </div>
                      <div className="suzi-poker-dr-avatar-wrap">
                        <Image
                          src={avatarSrc}
                          alt=""
                          width={56}
                          height={56}
                          unoptimized={Boolean(avatarUrl?.startsWith("http"))}
                          className="suzi-poker-dr-avatar"
                        />
                        {role ? <span className="suzi-poker-dr-role">{role}</span> : null}
                      </div>
                    </div>

                    <div className="suzi-poker-dr-info">
                      <p className="suzi-poker-dr-info-name">{displayName}</p>
                      <p className="suzi-poker-dr-info-stack">
                        <span className="suzi-poker-dr-gem" aria-hidden>
                          ◆
                        </span>
                        {formatChips(p.stack)}
                      </p>
                      {actionLabel ? (
                        <p
                          className={`suzi-poker-dr-info-status ${isActor && isMe ? "is-turn" : ""}`}
                        >
                          {actionLabel}
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {readOnly ? (
          <p className="suzi-poker-dr-hint">Spectating — take a seat in the lobby to play</p>
        ) : null}
        {!readOnly && !handComplete && !myTurn ? (
          <p className="suzi-poker-dr-hint">Waiting for another player…</p>
        ) : null}
      </div>

      {!handComplete ? (
        <PokerDicerealmControls
          disabled={controlsDisabled}
          pending={busy}
          canCheck={canCheck}
          toCall={toCall}
          amount={amount}
          minBet={minBet}
          maxBet={maxBet}
          currentBet={currentBet}
          onAmountChange={setAmount}
          onFold={() => fireAction("FOLD")}
          onCheck={() => fireAction("CHECK")}
          onCall={() => fireAction("CALL")}
          onRaise={handleRaise}
        />
      ) : null}
    </div>
  );
}
