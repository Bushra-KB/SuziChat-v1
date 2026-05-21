"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  playArcadeGoalSound,
  playArcadeHitSound,
} from "@/lib/game-sounds";

type Vec = { x: number; y: number };
type HockeyPlayer = {
  userId: string;
  paddle: Vec;
  score: number;
};
type HockeyState = {
  players?: HockeyPlayer[];
  puck?: Vec & { vx?: number; vy?: number };
  status?: string;
  winnerUserId?: string | null;
  targetScore?: number;
  lastEvent?: { type?: string; at?: number; byUserId?: string | null } | null;
};

function num(value: unknown, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function pct(value: number) {
  return `${value}%`;
}

export function NeonHockeyArena({
  state,
  meId,
  active,
  spectator,
  soundOn,
  onControl,
}: {
  state: Record<string, unknown>;
  meId: string;
  active: boolean;
  spectator?: boolean;
  soundOn: boolean;
  onControl: (payload: Record<string, unknown>) => void;
}) {
  const arenaRef = useRef<HTMLDivElement | null>(null);
  const lastSent = useRef(0);
  const target = useRef<Vec | null>(null);
  const lastSoundAt = useRef<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const s = state as HockeyState;
  const players = Array.isArray(s.players) ? s.players : [];
  const meIndex = players.findIndex((p) => p.userId === meId);
  const canPlay = active && !spectator && meIndex >= 0;
  const puck = s.puck ?? { x: 50, y: 50, vx: 0, vy: 0 };
  const targetScore = num(s.targetScore, 5);

  const hint = useMemo(() => {
    if (spectator) return "Watching live. Neon collisions and goals sync from the server.";
    if (!active) return "Match complete.";
    if (canPlay) return "Drag your paddle. First to five goals wins.";
    return "Take a seat in the lobby to play.";
  }, [active, canPlay, spectator]);

  useEffect(() => {
    if (!soundOn || !s.lastEvent?.at || s.lastEvent.at === lastSoundAt.current) return;
    lastSoundAt.current = s.lastEvent.at;
    if (s.lastEvent.type === "goal") {
      playArcadeGoalSound();
    } else if (s.lastEvent.type === "hit" || s.lastEvent.type === "wall") {
      playArcadeHitSound();
    }
  }, [s.lastEvent, soundOn]);

  useEffect(() => {
    if (!canPlay) return;
    const id = window.setInterval(() => {
      const now = Date.now();
      if (now - lastSent.current < 70) return;
      const current = target.current ?? players[meIndex]?.paddle ?? { x: meIndex === 0 ? 18 : 82, y: 30 };
      lastSent.current = now;
      onControl({ type: "paddle", x: current.x, y: current.y });
    }, 85);
    return () => window.clearInterval(id);
  }, [canPlay, meIndex, onControl, players]);

  function updateTarget(event: React.PointerEvent<HTMLDivElement>) {
    if (!canPlay || !arenaRef.current) return;
    const rect = arenaRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 60;
    target.current = {
      x: meIndex === 0 ? Math.min(44, Math.max(8, x)) : Math.min(92, Math.max(56, x)),
      y: Math.min(53, Math.max(7, y)),
    };
  }

  return (
    <div className="flex h-full min-h-[28rem] flex-col">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[var(--fs-xs)] font-semibold uppercase tracking-[0.18em] text-cyan-100/60">
            Suzi Neon Hockey
          </p>
          <p className="text-sm text-cyan-50/78">{hint}</p>
        </div>
        <div className="flex items-center gap-2">
          {players.map((player, idx) => (
            <div
              key={player.userId || idx}
              className={`rounded-2xl border px-3 py-2 text-center ${
                idx === 0
                  ? "border-cyan-300/30 bg-cyan-400/10"
                  : "border-fuchsia-300/30 bg-fuchsia-400/10"
              }`}
            >
              <p className="text-[0.65rem] uppercase tracking-[0.18em] text-white/45">
                {player.userId === meId ? "You" : `P${idx + 1}`}
              </p>
              <p className="text-2xl font-black text-white">
                {num(player.score, 0)}
                <span className="ml-1 text-xs text-white/35">/{targetScore}</span>
              </p>
            </div>
          ))}
        </div>
      </div>

      <div
        ref={arenaRef}
        className="relative min-h-0 flex-1 touch-none overflow-hidden rounded-[2rem] border border-cyan-200/25 bg-[radial-gradient(circle_at_50%_50%,rgba(0,229,255,0.16),transparent_28%),linear-gradient(135deg,rgba(9,8,43,0.98),rgba(55,9,108,0.94))] shadow-[0_24px_70px_rgba(0,0,0,0.44),inset_0_0_50px_rgba(0,229,255,0.12)]"
        onPointerDown={(e) => {
          setDragging(true);
          updateTarget(e);
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            /* ignore */
          }
        }}
        onPointerMove={(e) => {
          if (dragging) updateTarget(e);
        }}
        onPointerUp={(e) => {
          setDragging(false);
          updateTarget(e);
        }}
        onPointerCancel={() => setDragging(false)}
      >
        <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-cyan-200/30 shadow-[0_0_18px_rgba(0,229,255,0.7)]" />
        <div className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/25" />
        <div className="absolute inset-y-[18%] left-0 w-1 rounded-r-full bg-cyan-300/70 shadow-[0_0_18px_rgba(0,229,255,0.9)]" />
        <div className="absolute inset-y-[18%] right-0 w-1 rounded-l-full bg-fuchsia-300/70 shadow-[0_0_18px_rgba(255,32,121,0.9)]" />

        {players.map((player, idx) => (
          <div
            key={player.userId || idx}
            className={`absolute h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-[left,top] duration-75 ${
              idx === 0
                ? "border-cyan-100 bg-cyan-300 shadow-[0_0_24px_rgba(0,229,255,0.75)]"
                : "border-fuchsia-100 bg-fuchsia-400 shadow-[0_0_24px_rgba(255,32,121,0.75)]"
            } ${player.userId === meId ? "ring-4 ring-white/20" : ""}`}
            style={{ left: pct(num(player.paddle?.x, idx === 0 ? 18 : 82)), top: pct((num(player.paddle?.y, 30) / 60) * 100) }}
          >
            <span className="absolute inset-2 rounded-full bg-white/40 blur-[1px]" />
          </div>
        ))}

        <div
          className="absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/80 bg-white shadow-[0_0_22px_rgba(255,255,255,0.95),0_0_42px_rgba(0,229,255,0.65)] transition-[left,top] duration-75"
          style={{ left: pct(num(puck.x, 50)), top: pct((num(puck.y, 30) / 60) * 100) }}
        />

        {s.status === "finished" ? (
          <div className="absolute inset-0 grid place-items-center bg-black/45 backdrop-blur-sm">
            <div className="rounded-[1.5rem] border border-white/15 bg-[#160b3f]/90 px-7 py-5 text-center shadow-[0_0_30px_rgba(255,32,121,0.28)]">
              <p className="text-xs uppercase tracking-[0.25em] text-cyan-100/55">Match complete</p>
              <p className="mt-1 text-2xl font-black text-white">
                {s.winnerUserId === meId ? "You win" : "Winner locked"}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
