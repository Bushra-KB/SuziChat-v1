"use client";

import { Panel, cx } from "@/components/ui/suzi-primitives";

export function GameFrame({
  title,
  subtitle,
  reconnecting = false,
  children,
}: {
  title: string;
  subtitle?: string;
  reconnecting?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Panel className="flex h-full min-h-0 flex-col overflow-hidden p-4 sm:p-5">
      <div className="shrink-0 border-b border-cyan-300/20 pb-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-white sm:text-2xl">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm text-cyan-100/72">{subtitle}</p> : null}
          </div>
          <div
            className={cx(
              "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
              reconnecting
                ? "border-amber-300/35 bg-amber-400/14 text-amber-100"
                : "border-emerald-300/30 bg-emerald-400/12 text-emerald-100",
            )}
          >
            {reconnecting ? "Reconnecting..." : "Live"}
          </div>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto pt-3">{children}</div>
    </Panel>
  );
}
