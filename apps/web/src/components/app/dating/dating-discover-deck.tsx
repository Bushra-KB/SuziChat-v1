"use client";

import { useCallback, useRef } from "react";
import { cx } from "@/components/ui/suzi-primitives";
import type { DatingDiscoverItem } from "@/lib/dating-client";
import { cardImageUrl, getCircularOffset, getLayerForOffset } from "@/components/app/dating/dating-utils";

type DragState = {
  pointerId: number | null;
  startX: number;
  dragging: boolean;
  didMove: boolean;
};

export function DatingDiscoverDeck({
  deck,
  activeIndex,
  hasProfile,
  busy,
  accessToken,
  onRotate,
  onInterested,
  onPass,
  onRefresh,
  onOpenProfile,
}: {
  deck: DatingDiscoverItem[];
  activeIndex: number;
  hasProfile: boolean;
  busy: boolean;
  accessToken: string | null;
  onRotate: (step: number) => void;
  onInterested: () => void;
  onPass: () => void;
  onRefresh: () => void;
  onOpenProfile: () => void;
}) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState>({ pointerId: null, startX: 0, dragging: false, didMove: false });
  const wheelLockRef = useRef(0);
  const activeCard = deck[activeIndex] ?? null;

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) {
      return;
    }
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      dragging: true,
      didMove: false,
    };
    stageRef.current?.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d.dragging || e.pointerId !== d.pointerId) {
      return;
    }
    if (Math.abs(e.clientX - d.startX) > 12) {
      d.didMove = true;
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d.dragging || e.pointerId !== d.pointerId) {
      return;
    }
    d.dragging = false;
    try {
      stageRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    if (!d.didMove) {
      return;
    }
    const dx = e.clientX - d.startX;
    if (dx > 48) {
      onInterested();
    } else if (dx < -48) {
      onPass();
    }
  };

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      const now = Date.now();
      if (now - wheelLockRef.current < 220) {
        return;
      }
      const dominant = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (Math.abs(dominant) < 8) {
        return;
      }
      wheelLockRef.current = now;
      onRotate(dominant > 0 ? 1 : -1);
      e.preventDefault();
    },
    [onRotate],
  );

  return (
    <div className="min-w-0 flex-1 space-y-4">
      <div
        ref={stageRef}
        className="relative isolate overflow-hidden rounded-[1.05rem] border border-fuchsia-300/16 [perspective:1200px]"
        style={{ touchAction: "pan-y", transformStyle: "preserve-3d" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
      >
        <div className="h-[22rem] sm:h-[36rem]" style={{ transformStyle: "preserve-3d" }}>
          {deck.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="text-sm text-slate-300/88">
                {hasProfile ? "No profiles match these filters right now." : "Set up your profile to start discovering."}
              </p>
              {!hasProfile ? (
                <button type="button" onClick={onOpenProfile} className="suzi-primary-btn px-4 py-2.5 text-sm">
                  Create profile
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!accessToken}
                  onClick={onRefresh}
                  className="suzi-secondary-btn px-4 py-2.5 text-sm"
                >
                  Refresh deck
                </button>
              )}
            </div>
          ) : (
            deck.map((item, index) => {
              const offset = getCircularOffset(index, activeIndex, deck.length);
              const layer = getLayerForOffset(offset);
              if (!layer) {
                return null;
              }
              const img = cardImageUrl(item);
              const name = item.user.displayName ?? item.user.username;
              return (
                <div
                  key={item.userId}
                  className="pointer-events-none absolute inset-0 flex items-center justify-center [transform-style:preserve-3d]"
                >
                  <div
                    className={cx(
                      "pointer-events-auto relative aspect-[9/16] overflow-hidden rounded-[1.45rem] border text-left transition-all duration-500 ease-in-out",
                      layer.isActive
                        ? "h-[84%] max-h-[40rem] w-auto max-w-[86vw] border-fuchsia-300/72 shadow-[0_0_48px_rgba(232,77,255,0.28)] sm:max-w-[22rem]"
                        : "h-[78%] max-h-[36rem] w-auto max-w-[80vw] border-fuchsia-300/20 sm:max-w-[19rem]",
                    )}
                    style={{
                      transform: layer.transform,
                      opacity: layer.opacity,
                      zIndex: layer.zIndex,
                      transformStyle: "preserve-3d",
                      willChange: "transform, opacity",
                    }}
                  >
                    <div className="absolute inset-0 bg-[rgba(6,9,28,0.35)]">
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-fuchsia-900/40 to-slate-900/80 text-4xl text-white/40">
                          {name.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,12,24,0.02),rgba(10,12,24,0.62))]" />
                    <div className="absolute inset-x-0 bottom-0 space-y-2 p-4">
                      <p className="text-lg font-semibold text-white">
                        {name}
                        {item.age != null ? `, ${item.age}` : ""}
                      </p>
                      {item.user.country ? <p className="text-xs text-slate-300/80">{item.user.country}</p> : null}
                      {item.headline ? <p className="text-sm text-slate-200/85">{item.headline}</p> : null}
                      {layer.isActive ? (
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={onPass}
                            className="suzi-secondary-btn flex-1 px-3 py-2.5 text-sm"
                          >
                            Not interested
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={onInterested}
                            className="suzi-primary-btn flex-1 px-3 py-2.5 text-sm"
                          >
                            Interested
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {activeCard && hasProfile ? (
        <p className="text-xs text-slate-400/85">
          @{activeCard.user.username} · drag right for interested, left to pass, or scroll the wheel to browse
        </p>
      ) : null}
    </div>
  );
}
