import Image from "next/image";
import type { ReactNode } from "react";

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function Icon({
  path,
  className = "h-4 w-4",
}: {
  path: string;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={path} />
    </svg>
  );
}

export function Panel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={cx("suzi-panel", className)}>{children}</section>;
}

export function PanelMuted({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={cx("suzi-panel-muted", className)}>{children}</section>;
}

export function Chip({
  children,
  active = false,
  tone = "default",
  className,
}: {
  children: ReactNode;
  active?: boolean;
  tone?: "default" | "cyan" | "pink" | "gold" | "emerald";
  className?: string;
}) {
  const toneClass =
    tone === "cyan"
      ? "border-cyan-300/35 bg-cyan-400/15 text-cyan-100 shadow-[0_0_14px_rgba(0,229,255,0.16)]"
      : tone === "pink"
        ? "border-pink-300/35 bg-pink-400/15 text-pink-100 shadow-[0_0_14px_rgba(255,32,121,0.18)]"
        : tone === "gold"
          ? "border-amber-300/35 bg-amber-400/14 text-amber-100 shadow-[0_0_14px_rgba(255,189,0,0.16)]"
          : tone === "emerald"
            ? "border-emerald-300/35 bg-emerald-400/12 text-emerald-100 shadow-[0_0_14px_rgba(0,255,102,0.14)]"
            : "border-white/14 bg-white/7 text-[var(--text-muted)]";

  return (
    <span
      className={cx(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold tracking-[0.15em] uppercase",
        active && "shadow-[0_0_18px_rgba(255,32,121,0.24)]",
        toneClass,
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  copy,
  action,
}: {
  eyebrow: string;
  title: string;
  copy?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-[0.84rem] font-semibold uppercase tracking-[0.2em] text-cyan-100/75">
          {eyebrow}
        </p>
        <h2 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
          {title}
        </h2>
        {copy ? (
          <p className="mt-2 max-w-2xl text-base leading-7 text-[var(--text-muted)] sm:text-[1rem]">
            {copy}
          </p>
        ) : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div
      className={cx(
        "rounded-[1.4rem] border border-cyan-300/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.09),rgba(255,255,255,0.015))] p-4 shadow-[0_0_14px_rgba(0,229,255,0.12),inset_0_1px_0_rgba(255,255,255,0.1)]",
        tone && `bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_45%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))]`,
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-white">
        {value}
      </p>
    </div>
  );
}

export function Avatar({
  src,
  alt,
  size = 44,
  className,
}: {
  src: string;
  alt: string;
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={cx(
        "rounded-full border border-white/12 object-cover shadow-[0_0_18px_rgba(82,213,255,0.12)]",
        className,
      )}
    />
  );
}

export function StatusDot({
  status,
}: {
  status: "online" | "away" | "busy" | "offline" | undefined;
}) {
  const classes =
    status === "online"
      ? "bg-emerald-300 shadow-[0_0_12px_rgba(110,255,178,0.62)]"
      : status === "busy"
        ? "bg-rose-300 shadow-[0_0_12px_rgba(255,116,164,0.62)]"
        : status === "away"
          ? "bg-amber-300 shadow-[0_0_12px_rgba(255,204,110,0.62)]"
          : "bg-slate-500";

  return <span className={cx("inline-flex h-2.5 w-2.5 rounded-full", classes)} />;
}

export function Divider() {
  return <div className="h-px bg-white/8" />;
}
