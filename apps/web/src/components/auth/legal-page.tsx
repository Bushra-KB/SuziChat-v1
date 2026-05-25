import Link from "next/link";
import type { ReactNode } from "react";

export function LegalPage({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="suzi-hybrid-bg min-h-screen px-4 py-8 text-white sm:px-8">
      <section className="mx-auto max-w-3xl rounded-[2rem] border border-white/14 bg-[linear-gradient(180deg,rgba(50,12,86,0.86),rgba(29,7,52,0.9))] p-5 shadow-[0_24px_80px_rgba(8,0,24,0.52),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl sm:p-8">
        <Link href="/register" className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100/72 transition hover:text-white">
          Back to signup
        </Link>
        <p className="mt-8 text-[0.68rem] font-semibold uppercase tracking-[0.36em] text-cyan-100/70">{eyebrow}</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h1>
        <div className="mt-6 space-y-5 text-sm leading-7 text-white/72 sm:text-base">{children}</div>
      </section>
    </main>
  );
}
