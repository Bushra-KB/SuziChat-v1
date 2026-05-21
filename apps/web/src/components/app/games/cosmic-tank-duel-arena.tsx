"use client";

import { useEffect, useRef, useState } from "react";
import {
  playArcadeExplosionSound,
  playArcadeHitSound,
  playArcadeLaserSound,
} from "@/lib/game-sounds";

type Vec = { x: number; y: number };
type TankPlayer = {
  userId: string;
  pos: Vec;
  angle: number;
  hp: number;
  score: number;
};
type Shot = Vec & { id: string; ownerId: string };
type Obstacle = { x: number; y: number; w: number; h: number };
type TankState = {
  players?: TankPlayer[];
  shots?: Shot[];
  obstacles?: Obstacle[];
  status?: string;
  winnerUserId?: string | null;
  targetScore?: number;
  lastEvent?: { type?: string; at?: number; byUserId?: string | null; targetUserId?: string | null } | null;
};

function num(value: unknown, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function pct(value: number) {
  return `${value}%`;
}

function keyFor(code: string) {
  return ["KeyW", "ArrowUp", "KeyA", "ArrowLeft", "KeyS", "ArrowDown", "KeyD", "ArrowRight", "Space"].includes(code);
}

export function CosmicTankDuelArena({
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
  const keys = useRef(new Set<string>());
  const aimAngle = useRef(0);
  const fireQueued = useRef(false);
  const lastSent = useRef(0);
  const lastSoundAt = useRef<number | null>(null);
  const [touchDir, setTouchDir] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const s = state as TankState;
  const players = Array.isArray(s.players) ? s.players : [];
  const shots = Array.isArray(s.shots) ? s.shots : [];
  const obstacles = Array.isArray(s.obstacles) ? s.obstacles : [];
  const meIndex = players.findIndex((p) => p.userId === meId);
  const me = meIndex >= 0 ? players[meIndex] : null;
  const canPlay = active && !spectator && Boolean(me);
  const targetScore = num(s.targetScore, 3);

  useEffect(() => {
    if (!soundOn || !s.lastEvent?.at || s.lastEvent.at === lastSoundAt.current) return;
    lastSoundAt.current = s.lastEvent.at;
    if (s.lastEvent.type === "fire") playArcadeLaserSound();
    if (s.lastEvent.type === "hit" || s.lastEvent.type === "spark") playArcadeHitSound();
    if (s.lastEvent.type === "ko") playArcadeExplosionSound();
  }, [s.lastEvent, soundOn]);

  useEffect(() => {
    if (!canPlay) return;
    const onDown = (event: KeyboardEvent) => {
      if (!keyFor(event.code)) return;
      event.preventDefault();
      if (event.code === "Space") fireQueued.current = true;
      keys.current.add(event.code);
    };
    const onUp = (event: KeyboardEvent) => {
      keys.current.delete(event.code);
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [canPlay]);

  useEffect(() => {
    if (!canPlay) return;
    const id = window.setInterval(() => {
      const now = Date.now();
      if (now - lastSent.current < 70) return;
      lastSent.current = now;
      const dx =
        (keys.current.has("KeyD") || keys.current.has("ArrowRight") ? 1 : 0) -
        (keys.current.has("KeyA") || keys.current.has("ArrowLeft") ? 1 : 0) +
        touchDir.dx;
      const dy =
        (keys.current.has("KeyS") || keys.current.has("ArrowDown") ? 1 : 0) -
        (keys.current.has("KeyW") || keys.current.has("ArrowUp") ? 1 : 0) +
        touchDir.dy;
      const fire = fireQueued.current || keys.current.has("Space");
      fireQueued.current = false;
      onControl({ type: "drive", dx, dy, angle: aimAngle.current || me?.angle || 0, fire });
    }, 85);
    return () => window.clearInterval(id);
  }, [canPlay, me?.angle, onControl, touchDir.dx, touchDir.dy]);

  function updateAim(event: React.PointerEvent<HTMLDivElement>) {
    if (!arenaRef.current || !me) return;
    const rect = arenaRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 64;
    aimAngle.current = Math.atan2(y - me.pos.y, x - me.pos.x);
  }

  const hint = spectator
    ? "Watching the duel. Shots, shields, and KOs sync live."
    : canPlay
      ? "WASD or arrows to move. Aim with pointer. Space or Fire to shoot."
      : "Take a seat in the lobby to pilot a tank.";

  return (
    <div className="flex h-full min-h-[28rem] flex-col">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[var(--fs-xs)] font-semibold uppercase tracking-[0.18em] text-fuchsia-100/65">
            Suzi Cosmic Tank Duel
          </p>
          <p className="text-sm text-cyan-50/78">{hint}</p>
        </div>
        <div className="flex items-center gap-2">
          {players.map((player, idx) => (
            <div
              key={player.userId || idx}
              className={`min-w-[6.5rem] rounded-2xl border px-3 py-2 ${
                idx === 0
                  ? "border-emerald-300/30 bg-emerald-400/10"
                  : "border-pink-300/30 bg-pink-400/10"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[0.65rem] uppercase tracking-[0.18em] text-white/45">
                  {player.userId === meId ? "You" : `P${idx + 1}`}
                </span>
                <span className="text-sm font-black text-white">
                  {num(player.score, 0)}/{targetScore}
                </span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-fuchsia-300"
                  style={{ width: pct(Math.max(0, Math.min(100, num(player.hp, 100)))) }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        ref={arenaRef}
        className="relative min-h-0 flex-1 touch-none overflow-hidden rounded-[2rem] border border-fuchsia-200/24 bg-[radial-gradient(circle_at_50%_45%,rgba(255,32,121,0.16),transparent_28%),linear-gradient(135deg,rgba(11,9,40,0.98),rgba(42,8,88,0.95))] shadow-[0_24px_70px_rgba(0,0,0,0.45),inset_0_0_60px_rgba(255,32,121,0.1)]"
        onPointerMove={updateAim}
        onPointerDown={(event) => {
          updateAim(event);
          fireQueued.current = true;
        }}
      >
        <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:10%_12.5%]" />

        {obstacles.map((o, index) => (
          <div
            key={`${o.x}-${o.y}-${index}`}
            className="absolute rounded-md border border-cyan-200/25 bg-cyan-300/14 shadow-[0_0_18px_rgba(0,229,255,0.2)]"
            style={{ left: pct(o.x), top: pct((o.y / 64) * 100), width: pct(o.w), height: pct((o.h / 64) * 100) }}
          />
        ))}

        {shots.map((shot) => (
          <div
            key={shot.id}
            className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_16px_rgba(255,255,255,0.9),0_0_30px_rgba(255,32,121,0.75)] transition-[left,top] duration-75"
            style={{ left: pct(num(shot.x, 50)), top: pct((num(shot.y, 32) / 64) * 100) }}
          />
        ))}

        {players.map((player, idx) => (
          <div
            key={player.userId || idx}
            className={`absolute h-12 w-16 -translate-x-1/2 -translate-y-1/2 rounded-[1rem] border-2 transition-[left,top,transform] duration-75 ${
              idx === 0
                ? "border-emerald-100 bg-emerald-400 shadow-[0_0_24px_rgba(52,211,153,0.65)]"
                : "border-pink-100 bg-pink-500 shadow-[0_0_24px_rgba(255,32,121,0.7)]"
            } ${player.userId === meId ? "ring-4 ring-white/20" : ""}`}
            style={{
              left: pct(num(player.pos?.x, idx === 0 ? 16 : 84)),
              top: pct((num(player.pos?.y, 32) / 64) * 100),
              transform: `translate(-50%, -50%) rotate(${num(player.angle, 0)}rad)`,
            }}
          >
            <span className="absolute left-1/2 top-1/2 h-2 w-8 -translate-y-1/2 rounded-full bg-white/80 shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
            <span className="absolute inset-2 rounded-[0.7rem] border border-black/20 bg-black/12" />
          </div>
        ))}

        {s.status === "finished" ? (
          <div className="absolute inset-0 grid place-items-center bg-black/48 backdrop-blur-sm">
            <div className="rounded-[1.5rem] border border-white/15 bg-[#160b3f]/90 px-7 py-5 text-center shadow-[0_0_30px_rgba(0,229,255,0.22)]">
              <p className="text-xs uppercase tracking-[0.25em] text-cyan-100/55">Duel complete</p>
              <p className="mt-1 text-2xl font-black text-white">
                {s.winnerUserId === meId ? "You win" : "Winner locked"}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {canPlay ? (
        <div className="mt-3 flex items-center justify-between gap-3 xl:hidden">
          <div className="grid grid-cols-3 gap-1.5">
            <span />
            <button className="suzi-secondary-btn px-3 py-2 text-xs" onPointerDown={() => setTouchDir({ dx: 0, dy: -1 })} onPointerUp={() => setTouchDir({ dx: 0, dy: 0 })}>Up</button>
            <span />
            <button className="suzi-secondary-btn px-3 py-2 text-xs" onPointerDown={() => setTouchDir({ dx: -1, dy: 0 })} onPointerUp={() => setTouchDir({ dx: 0, dy: 0 })}>Left</button>
            <button className="suzi-secondary-btn px-3 py-2 text-xs" onPointerDown={() => setTouchDir({ dx: 0, dy: 1 })} onPointerUp={() => setTouchDir({ dx: 0, dy: 0 })}>Down</button>
            <button className="suzi-secondary-btn px-3 py-2 text-xs" onPointerDown={() => setTouchDir({ dx: 1, dy: 0 })} onPointerUp={() => setTouchDir({ dx: 0, dy: 0 })}>Right</button>
          </div>
          <button
            type="button"
            className="suzi-primary-btn px-6 py-3 text-sm"
            onClick={() => {
              fireQueued.current = true;
            }}
          >
            Fire
          </button>
        </div>
      ) : null}
    </div>
  );
}
