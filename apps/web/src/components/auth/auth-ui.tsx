"use client";

import Link from "next/link";
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

export function AuthCard({
  eyebrow,
  title,
  description,
  children,
  footer,
  className = "",
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`mx-auto w-full max-w-[34rem] rounded-[1.45rem] border border-white/14 bg-[linear-gradient(180deg,rgba(50,12,86,0.86),rgba(29,7,52,0.9))] p-4 shadow-[0_24px_80px_rgba(8,0,24,0.52),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl sm:rounded-[1.8rem] sm:p-6 ${className}`}>
      <p className="text-[0.55rem] font-semibold uppercase tracking-[0.26em] text-cyan-100/70 sm:text-[0.62rem] sm:tracking-[0.32em]">{eyebrow}</p>
      <h2 className="mt-3 text-[1.38rem] font-semibold leading-tight tracking-tight text-white sm:text-[2rem]">{title}</h2>
      <p className="mt-2 text-[0.78rem] leading-5 text-white/68 sm:mt-2.5 sm:text-[0.9rem] sm:leading-6">{description}</p>
      <div className="mt-5 sm:mt-7">{children}</div>
      {footer ? <div className="mt-5 text-[0.78rem] text-blue-100/72 sm:mt-6 sm:text-[0.86rem]">{footer}</div> : null}
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
      <span className="text-[0.76rem] font-semibold text-white sm:text-[0.82rem]">{label}</span>
      <input
        {...props}
        className="mt-2 w-full rounded-[0.9rem] border border-white/10 bg-[#3b0a59]/82 px-4 py-2.5 text-[0.86rem] text-white outline-none transition placeholder:text-white/36 focus:border-cyan-300/45 focus:bg-[#461066]/88 sm:rounded-[1rem] sm:py-3 sm:text-[0.94rem]"
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
      <span className="text-[0.76rem] font-semibold text-white sm:text-[0.82rem]">{label}</span>
      <textarea
        {...props}
        className="mt-2 w-full rounded-[0.9rem] border border-white/10 bg-[#3b0a59]/82 px-4 py-2.5 text-[0.86rem] text-white outline-none transition placeholder:text-white/36 focus:border-cyan-300/45 focus:bg-[#461066]/88 sm:rounded-[1rem] sm:py-3 sm:text-[0.94rem]"
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
      className={`rounded-[0.9rem] border px-4 py-2.5 text-[0.78rem] leading-5 sm:rounded-[1rem] sm:py-3 sm:text-[0.86rem] sm:leading-6 ${
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
      className="w-full rounded-[0.95rem] border border-cyan-300/20 bg-[linear-gradient(90deg,#7f10c9,#8744f6_52%,#3f89d3)] px-5 py-2.5 text-[0.88rem] font-semibold text-white shadow-[0_16px_36px_rgba(88,49,224,0.34)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 sm:rounded-[1rem] sm:py-3 sm:text-[0.95rem]"
    >
      {children}
    </button>
  );
}

export function AuthDivider() {
  return (
    <div className="flex items-center gap-3 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-white/44 sm:text-[0.7rem] sm:tracking-[0.22em]">
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
