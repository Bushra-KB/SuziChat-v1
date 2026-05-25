"use client";

import Link from "next/link";
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

export function AuthCard({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-white/14 bg-[linear-gradient(180deg,rgba(50,12,86,0.86),rgba(29,7,52,0.9))] p-5 shadow-[0_24px_80px_rgba(8,0,24,0.52),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl sm:p-7">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.36em] text-cyan-100/70">{eyebrow}</p>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-white/68 sm:text-base">{description}</p>
      <div className="mt-7">{children}</div>
      {footer ? <div className="mt-6 text-sm text-blue-100/72">{footer}</div> : null}
    </section>
  );
}

export function AuthField({
  label,
  error,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-white">{label}</span>
      <input
        {...props}
        className="mt-2 w-full rounded-[1rem] border border-white/10 bg-[#3b0a59]/82 px-4 py-3.5 text-white outline-none transition placeholder:text-white/36 focus:border-cyan-300/45 focus:bg-[#461066]/88"
      />
      {error ? <span className="mt-2 block text-xs font-medium text-amber-100">{error}</span> : null}
    </label>
  );
}

export function AuthTextarea({
  label,
  error,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-white">{label}</span>
      <textarea
        {...props}
        className="mt-2 w-full rounded-[1rem] border border-white/10 bg-[#3b0a59]/82 px-4 py-3.5 text-white outline-none transition placeholder:text-white/36 focus:border-cyan-300/45 focus:bg-[#461066]/88"
      />
      {error ? <span className="mt-2 block text-xs font-medium text-amber-100">{error}</span> : null}
    </label>
  );
}

export function AuthMessage({
  tone,
  children,
}: {
  tone: "success" | "error" | "info";
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-[1rem] border px-4 py-3 text-sm leading-6 ${
        tone === "error"
          ? "border-amber-200/24 bg-amber-300/10 text-amber-50"
          : tone === "success"
            ? "border-emerald-200/24 bg-emerald-300/10 text-emerald-50"
            : "border-cyan-200/24 bg-cyan-300/10 text-cyan-50"
      }`}
    >
      {children}
    </div>
  );
}

export function PrimaryAuthButton({
  children,
  disabled,
}: {
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="w-full rounded-[1rem] border border-cyan-300/20 bg-[linear-gradient(90deg,#7f10c9,#8744f6_52%,#3f89d3)] px-5 py-3.5 text-base font-semibold text-white shadow-[0_16px_36px_rgba(88,49,224,0.34)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {children}
    </button>
  );
}

export function AuthDivider() {
  return (
    <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.24em] text-white/44">
      <span className="h-px flex-1 bg-white/12" />
      or
      <span className="h-px flex-1 bg-white/12" />
    </div>
  );
}

export function AuthTextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="font-semibold text-white transition hover:text-cyan-100">
      {children}
    </Link>
  );
}

export function validateEmail(value: string) {
  return /^\S+@\S+\.\S+$/.test(value.trim());
}

export function validatePassword(value: string) {
  return value.length >= 8;
}
