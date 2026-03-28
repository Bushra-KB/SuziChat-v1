"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Icon, cx } from "@/components/ui/suzi-primitives";

function labelForTheme(theme: string | undefined) {
  if (theme === "light") {
    return "Day";
  }

  if (theme === "dark") {
    return "Night";
  }

  return "System";
}

export function ModeToggle({
  className,
  fullWidth = false,
}: {
  className?: string;
  fullWidth?: boolean;
}) {
  const { resolvedTheme, setTheme, theme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;

      if (ref.current && !ref.current.contains(target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  const currentTheme = mounted ? theme : "dark";
  const activeLabel = labelForTheme(currentTheme);
  const iconPath =
    mounted && resolvedTheme === "light"
      ? "M12 3v2.2M12 18.8V21M4.93 4.93l1.56 1.56M17.5 17.5l1.57 1.57M3 12h2.2M18.8 12H21M4.93 19.07l1.56-1.56M17.5 6.5l1.57-1.57M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8"
      : "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z";

  const options = [
    {
      value: "light",
      label: "Day",
      icon: "M12 3v2.2M12 18.8V21M4.93 4.93l1.56 1.56M17.5 17.5l1.57 1.57M3 12h2.2M18.8 12H21M4.93 19.07l1.56-1.56M17.5 6.5l1.57-1.57M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
    },
    {
      value: "dark",
      label: "Night",
      icon: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z",
    },
    {
      value: "system",
      label: "System",
      icon: "M4 5h16v11H4zM8 19h8M10 16h4",
    },
  ] as const;

  return (
    <div ref={ref} className={cx("relative", className)}>
      <button
        type="button"
        aria-label="Toggle theme"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cx(
          "suzi-icon-btn inline-flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-medium shadow-[0_0_0_1px_rgba(255,255,255,0.03)] focus:outline-none focus:ring-2 focus:ring-fuchsia-400/60",
          fullWidth && "w-full justify-between",
        )}
      >
        <span className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-fuchsia-500/10 text-fuchsia-200">
            <Icon path={iconPath} className="h-4 w-4" />
          </span>
          <span>{activeLabel}</span>
        </span>
        <Icon
          path={open ? "M7 14l5-5 5 5" : "M7 10l5 5 5-5"}
          className="h-4 w-4 text-[var(--text-muted)]"
        />
      </button>

      {open ? (
        <div className="suzi-overlay-panel absolute right-0 top-[calc(100%+0.7rem)] z-50 min-w-[12rem] rounded-[1.2rem] p-2">
          {options.map((option) => {
            const isActive = currentTheme === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setTheme(option.value);
                  setOpen(false);
                }}
                className={cx(
                  "flex w-full items-center gap-3 rounded-[0.95rem] px-3 py-2.5 text-left text-sm font-medium transition",
                  isActive
                    ? "bg-fuchsia-400/12 text-white"
                    : "text-[var(--text-muted)] hover:bg-white/6 hover:text-white",
                )}
              >
                <span
                  className={cx(
                    "flex h-8 w-8 items-center justify-center rounded-full border",
                    isActive
                      ? "border-fuchsia-400/20 bg-fuchsia-400/12 text-fuchsia-100"
                      : "border-white/10 bg-white/5 text-cyan-100",
                  )}
                >
                  <Icon path={option.icon} className="h-4 w-4" />
                </span>
                <span>{option.label}</span>
                {isActive ? (
                  <span className="ml-auto text-[0.62rem] uppercase tracking-[0.22em] text-fuchsia-200">
                    Active
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
