"use client";

import { useState } from "react";
import type { ApiGameLobby } from "@/lib/games-client";

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

const SUIT: Record<string, string> = {
  c: "♣",
  d: "♦",
  h: "♥",
  s: "♠",
};

function PlayingCard({ code }: { code: string }) {
  if (code === "BACK") {
    return (
      <div className="flex h-16 w-11 items-center justify-center rounded-md border border-indigo-400/35 bg-gradient-to-br from-indigo-950 via-[#1e1058] to-[#12082f] shadow-inner">
        <span className="text-[0.6rem] tracking-[0.2em] text-indigo-200/55">SUZI</span>
      </div>
    );
  }
  const rank = code.slice(0, 1);
  const suitKey = code.slice(1, 2);
  const suit = SUIT[suitKey] ?? suitKey;
  const red = suitKey === "h" || suitKey === "d";
  return (
    <div
      className={`flex h-16 w-11 flex-col items-center justify-between rounded-md border bg-gradient-to-b from-white to-slate-100 px-1 py-1 shadow-md ${
        red ? "border-rose-300/40 text-rose-700" : "border-slate-400/40 text-slate-900"
      }`}
    >
      <span className="self-start text-xs font-bold leading-none">{rank}</span>
      <span className="text-lg leading-none">{suit}</span>
      <span className="self-end rotate-180 text-xs font-bold leading-none">{rank}</span>
    </div>
  );
}

type PokerTableViewProps = {
  lobbySeats: ApiGameLobby["seats"];
  state: Record<string, unknown>;
  busy: boolean;
  meId: string;
  onAction: (kind: string, amount?: number) => void;
};

export function PokerTableView({ lobbySeats, state, busy, meId, onAction }: PokerTableViewProps) {
  const board = asArray(state.board).map(String);
  const players = asArray(state.players) as Array<Record<string, unknown>>;
  const [amount, setAmount] = useState(100);
  const pot = Number(state.pot ?? 0);
  const currentBet = Number(state.currentBet ?? 0);
  const phase = String(state.phase ?? "PREFLOP");

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-[2rem] border border-emerald-700/35 bg-gradient-to-b from-[#0f4d3a] via-[#0a3528] to-[#061f18] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
        <div className="pointer-events-none absolute inset-6 rounded-[1.5rem] border border-emerald-400/15 bg-[radial-gradient(ellipse_at_center,rgba(16,90,70,0.45),transparent_70%)]" />
        <div className="relative mx-auto max-w-lg space-y-4">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {board.length === 0 ? (
              <p className="text-sm text-emerald-100/65">Community cards not dealt yet.</p>
            ) : (
              board.map((card, i) => (
                <PlayingCard key={`${String(card)}-${i}`} code={String(card)} />
              ))
            )}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-emerald-50/90">
            <span className="rounded-full bg-black/25 px-4 py-2 font-semibold ring-1 ring-amber-400/25">
              Pot: <span className="text-amber-200">{pot}</span>
            </span>
            <span className="rounded-full bg-black/20 px-3 py-2 ring-1 ring-white/10">
              Bet: {currentBet}
            </span>
            <span className="rounded-full bg-black/20 px-3 py-2 ring-1 ring-white/10">{phase}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {players.map((player, idx) => {
          const uid = String(player.userId ?? "");
          const isMe = Boolean(meId && uid === meId);
          const seatRow = lobbySeats.find((s) => s.userId === uid);
          const displayName =
            seatRow?.user?.displayName?.trim() || seatRow?.user?.username || `Seat ${String(player.seatIndex ?? "?")}`;
          const rawCards = asArray(player.cards).map(String);
          const masked = rawCards.length > 0 && rawCards.every((c) => c === "BACK");
          return (
            <div
              key={idx}
              className={`rounded-xl border p-4 ${
                isMe
                  ? "border-emerald-400/45 bg-[rgba(14,60,48,0.55)]"
                  : "border-cyan-300/20 bg-[rgba(20,13,62,0.88)]"
              }`}
            >
              <p className="font-semibold text-white">{isMe ? "You" : displayName}</p>
              <div className="mt-3 flex min-h-[4.5rem] flex-wrap gap-2">
                {rawCards.length === 0 ? (
                  <p className="text-xs text-cyan-100/55">No hole cards</p>
                ) : isMe ? (
                  rawCards.map((c, i) => <PlayingCard key={i} code={String(c)} />)
                ) : masked ? (
                  <>
                    <PlayingCard code="BACK" />
                    <PlayingCard code="BACK" />
                  </>
                ) : (
                  rawCards.map((c, i) => <PlayingCard key={i} code={String(c)} />)
                )}
              </div>
              <p className="mt-2 text-xs text-cyan-100/78">
                Stack: {String(player.stack ?? 0)} • In pot: {String(player.committed ?? 0)}
              </p>
              <p className="text-xs text-cyan-100/65">
                {Boolean(player.folded) ? "Folded" : Boolean(player.allIn) ? "All-in" : "In hand"}
              </p>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-fuchsia-400/20 bg-[rgba(35,18,88,0.45)] p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-fuchsia-200/80">Actions</p>
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
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="suzi-input h-9 w-24 px-2 text-sm"
            />
            <button type="button" disabled={busy} className="suzi-primary-btn px-3 py-2 text-xs" onClick={() => onAction("BET", amount)}>
              Bet
            </button>
            <button type="button" disabled={busy} className="suzi-primary-btn px-3 py-2 text-xs" onClick={() => onAction("RAISE", amount)}>
              Raise
            </button>
          </div>
          <button
            type="button"
            disabled={busy}
            className="rounded-lg border border-pink-300/35 bg-pink-500/22 px-3 py-2 text-xs font-semibold text-pink-100"
            onClick={() => onAction("ALL_IN")}
          >
            All-in
          </button>
        </div>
        <p className="mt-3 text-xs text-cyan-100/55">
          Betting uses the same realtime session as the board — state updates over the socket when it is your turn.
        </p>
      </div>
    </div>
  );
}
