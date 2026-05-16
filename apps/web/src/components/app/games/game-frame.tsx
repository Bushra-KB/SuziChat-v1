"use client";

import { Panel, cx } from "@/components/ui/suzi-primitives";

export function GameFrame({
  title,
  subtitle,
  reconnecting = false,
  reconnectHint,
  immersive = false,
  children,
}: {
  title: string;
  subtitle?: string;
  reconnecting?: boolean;
  reconnectHint?: string;
  immersive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Panel
      className={cx(
        "flex h-full min-h-0 flex-col overflow-hidden",
        immersive ? "p-2 sm:p-2.5" : "p-4 sm:p-5",
      )}
    >
      <div
        className={cx(
          "shrink-0",
          immersive ? "border-b border-cyan-300/12 pb-2" : "border-b border-cyan-300/20 pb-3",
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2
              className={cx(
                "font-bold text-white",
                immersive ? "truncate text-base sm:text-lg" : "text-xl sm:text-2xl",
              )}
            >
              {title}
            </h2>
            {subtitle ? (
              <p
                className={cx(
                  "text-cyan-100/72",
                  immersive ? "mt-0.5 truncate text-[0.68rem]" : "mt-1 text-sm",
                )}
              >
                {subtitle}
              </p>
            ) : null}
            {reconnecting && reconnectHint ? (
              <p className="mt-2 max-w-xl text-xs leading-relaxed text-amber-100/85">{reconnectHint}</p>
            ) : null}
          </div>
          <div
            className={cx(
              "inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
              reconnecting
                ? "border-amber-300/35 bg-amber-400/14 text-amber-100"
                : "border-emerald-300/30 bg-emerald-400/12 text-emerald-100",
            )}
          >
            {reconnecting ? "Reconnecting..." : "Live"}
          </div>
        </div>
      </div>
      <div className={cx("min-h-0 flex-1", immersive ? "overflow-hidden pt-1" : "overflow-auto pt-3")}>
        {children}
      </div>
    </Panel>
  );
}
