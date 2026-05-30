"use client";

import Link from "next/link";
import type { RefObject } from "react";
import {
  homeBtnSecondary,
  homePanelHeader,
  listL2,
  listMeta,
  panelTitle,
} from "@/components/app/home-typography";
import { Panel, cx } from "@/components/ui/suzi-primitives";

export function GameFrame({
  title,
  subtitle,
  reconnecting = false,
  reconnectHint,
  immersive = false,
  lobbyHref,
  watcherCount,
  className,
  bodyRef,
  children,
}: {
  title: string;
  subtitle?: string;
  reconnecting?: boolean;
  reconnectHint?: string;
  immersive?: boolean;
  /** When set, shows a back link above the board (all game types). */
  lobbyHref?: string;
  /** Live spectator count (not seated at the table). */
  watcherCount?: number;
  className?: string;
  bodyRef?: RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
}) {
  return (
    <Panel
      className={cx(
        "suzi-panel--home flex h-full min-h-0 flex-col overflow-hidden",
        immersive ? "p-2 sm:p-2.5" : "p-[var(--panel-pad)]",
        className,
      )}
    >
      <div
        className={cx(
          homePanelHeader,
          "shrink-0",
          immersive && "pb-2",
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className={cx(panelTitle, "truncate")}>
              {title}
            </h2>
            {subtitle ? (
              <p
                className={cx(
                  listL2,
                  "mt-1 truncate text-cyan-100/82",
                )}
              >
                {subtitle}
              </p>
            ) : null}
            {reconnecting && reconnectHint ? (
              <p className={cx(listL2, "mt-2 max-w-xl leading-relaxed text-amber-100/85")}>{reconnectHint}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {typeof watcherCount === "number" ? (
              <span
                className={cx(listMeta, "suzi-game-board-pill suzi-home-stat-pill inline-flex items-center gap-1 px-2 py-1 font-semibold")}
                title="Spectators watching this game"
              >
                <span aria-hidden>👁</span>
                {watcherCount} watching
              </span>
            ) : null}
            {lobbyHref ? (
              <Link
                href={lobbyHref}
                className={cx(homeBtnSecondary, "suzi-game-board-top-btn whitespace-nowrap px-2.5")}
                style={{ height: "var(--btn-h-sm)" }}
              >
                ← Lobby
              </Link>
            ) : null}
            <span
              className={cx(
                listMeta,
                "suzi-game-live-pill inline-flex items-center gap-1.5 rounded-full border px-2 py-1 font-semibold",
                reconnecting
                  ? "border-amber-300/35 bg-amber-400/14 text-amber-100"
                  : "border-emerald-300/30 bg-emerald-400/12 text-emerald-100",
              )}
            >
              {!reconnecting ? <span className="suzi-live-dot" aria-hidden /> : null}
              {reconnecting ? "Reconnecting..." : "Live"}
            </span>
          </div>
        </div>
      </div>
      <div
        ref={bodyRef}
        className={cx("min-h-0 flex-1", immersive ? "overflow-hidden pt-1" : "overflow-hidden pt-3")}
      >
        {children}
      </div>
    </Panel>
  );
}
