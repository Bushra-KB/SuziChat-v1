"use client";

import { useEffect, useRef } from "react";
import {
  playPokerBetSound,
  playPokerCheckSound,
  playPokerDealSound,
  playPokerFoldSound,
  playPokerTurnSound,
  playPokerWinSound,
  startPokerAmbient,
  stopPokerAmbient,
} from "@/lib/poker-arcade-sounds";

export function usePokerArcadeSfx(
  enabled: boolean,
  state: Record<string, unknown>,
  myTurn: boolean,
  meId: string,
) {
  const prev = useRef<{
    boardLen: number;
    pot: number;
    phase: string;
    myTurn: boolean;
    handComplete: boolean;
    moveCount: number;
  } | null>(null);
  const board = Array.isArray(state.board) ? state.board : [];
  const handLog = Array.isArray(state.handLog) ? state.handLog : [];
  const pot = Number(state.pot ?? 0);
  const phase = String(state.phase ?? "PREFLOP");
  const handComplete = phase === "COMPLETE";

  useEffect(() => {
    if (!enabled) {
      stopPokerAmbient();
      return;
    }
    startPokerAmbient();
    return () => stopPokerAmbient();
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const snapshot = {
      boardLen: board.length,
      pot,
      phase,
      myTurn,
      handComplete,
      moveCount: handLog.length,
    };
    if (!prev.current) {
      prev.current = snapshot;
      return;
    }

    const p = prev.current;
    if (board.length > p.boardLen) playPokerDealSound();
    else if (handLog.length > p.moveCount) {
      const last = handLog[handLog.length - 1] as { kind?: string; seatIndex?: number };
      const players = Array.isArray(state.players) ? state.players : [];
      const mySeat = (
        players as Array<{ userId?: string; seatIndex?: number }>
      ).find((row) => String(row.userId ?? "") === meId)?.seatIndex;
      const actorSeat = Number(last.seatIndex ?? -1);
      if (mySeat !== undefined && actorSeat !== mySeat) {
        playPokerActionSound(String(last.kind ?? "BET"));
      } else if (pot > p.pot + 5) {
        playPokerBetSound();
      }
    } else if (pot > p.pot + 5) playPokerBetSound();

    if (myTurn && !p.myTurn && meId) playPokerTurnSound();

    if (handComplete && !p.handComplete) {
      const winners = Array.isArray(state.winners) ? state.winners : [];
      const iWon = winners.some((w) => String((w as { userId?: string }).userId ?? "") === meId);
      if (iWon) playPokerWinSound();
    }

    prev.current = snapshot;
  }, [enabled, board.length, pot, phase, myTurn, handComplete, meId, state.winners, handLog.length]);
}

export function playPokerActionSound(kind: string) {
  const k = kind.toUpperCase();
  if (k === "FOLD") playPokerFoldSound();
  else if (k === "CHECK") playPokerCheckSound();
  else if (k === "CALL" || k === "BET" || k === "RAISE" || k === "ALL_IN") playPokerBetSound();
}
