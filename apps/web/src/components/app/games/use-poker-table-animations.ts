"use client";

import { useEffect, useRef, useState } from "react";
import { asArray } from "@/components/app/games/poker-table-shared";

export type PokerTableAnim = {
  potPulse: boolean;
  streetFlash: boolean;
  newBoardIndices: number[];
  actedSeatIndex: number | null;
  actionFlash: string | null;
  newHand: boolean;
  chipFlySeat: number | null;
};

const IDLE: PokerTableAnim = {
  potPulse: false,
  streetFlash: false,
  newBoardIndices: [],
  actedSeatIndex: null,
  actionFlash: null,
  newHand: false,
  chipFlySeat: null,
};

export function usePokerTableAnimations(
  state: Record<string, unknown>,
  sessionId: string,
) {
  const [anim, setAnim] = useState<PokerTableAnim>(IDLE);
  const prev = useRef<{
    sessionId: string;
    boardLen: number;
    pot: number;
    phase: string;
    handNumber: number;
    moveCount: number;
  } | null>(null);

  useEffect(() => {
    const board = asArray(state.board);
    const pot = Number(state.pot ?? 0);
    const phase = String(state.phase ?? "PREFLOP");
    const handNumber = Number(state.handNumber ?? 1);
    const handLog = asArray(state.handLog);
    const lastLog = handLog[handLog.length - 1] as Record<string, unknown> | undefined;
    const actedSeatIndex =
      lastLog && typeof lastLog.seatIndex === "number"
        ? Number(lastLog.seatIndex)
        : null;
    const actionFlash =
      lastLog && typeof lastLog.kind === "string" ? String(lastLog.kind) : null;

    const snap = {
      sessionId,
      boardLen: board.length,
      pot,
      phase,
      handNumber,
      moveCount: handLog.length,
    };

    if (!prev.current || prev.current.sessionId !== sessionId) {
      prev.current = snap;
      return;
    }

    const p = prev.current;
    const newBoardIndices: number[] = [];
    if (board.length > p.boardLen) {
      for (let i = p.boardLen; i < board.length; i += 1) {
        newBoardIndices.push(i);
      }
    }

    const newHand =
      (p.phase === "COMPLETE" && phase === "PREFLOP") ||
      handNumber > p.handNumber;

    const next: PokerTableAnim = {
      potPulse: pot > p.pot + 0.5,
      streetFlash:
        phase !== p.phase &&
        phase !== "COMPLETE" &&
        ["FLOP", "TURN", "RIVER", "SHOWDOWN"].includes(phase),
      newBoardIndices,
      actedSeatIndex:
        handLog.length > p.moveCount && actedSeatIndex !== null
          ? actedSeatIndex
          : null,
      actionFlash:
        handLog.length > p.moveCount ? actionFlash : null,
      newHand,
      chipFlySeat:
        pot > p.pot + 0.5 && actedSeatIndex !== null ? actedSeatIndex : null,
    };

    if (
      next.potPulse ||
      next.streetFlash ||
      next.newBoardIndices.length > 0 ||
      next.actedSeatIndex !== null ||
      next.newHand
    ) {
      setAnim(next);
      const t = window.setTimeout(() => setAnim(IDLE), 900);
      prev.current = snap;
      return () => window.clearTimeout(t);
    }

    prev.current = snap;
  }, [state, sessionId]);

  return anim;
}
