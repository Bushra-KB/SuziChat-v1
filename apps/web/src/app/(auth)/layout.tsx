import type { ReactNode } from "react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,108,214,0.26),_transparent_24%),radial-gradient(circle_at_15%_20%,_rgba(122,125,255,0.42),_transparent_30%),radial-gradient(circle_at_82%_18%,_rgba(86,208,255,0.18),_transparent_26%),linear-gradient(180deg,_#1b2aaa_0%,_#321f96_38%,_#22124b_100%)]" />
      <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(rgba(255,255,255,0.8)_0.65px,transparent_0.65px)] [background-size:24px_24px]" />
      <div className="absolute left-1/2 top-28 h-px w-[85%] -translate-x-1/2 bg-[linear-gradient(90deg,transparent,rgba(255,168,243,0.95),transparent)] shadow-[0_0_22px_rgba(255,140,230,0.85)]" />

      <section className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8 sm:px-10 lg:px-12">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="w-fit rounded-[1.65rem] border border-pink-300/65 bg-[linear-gradient(180deg,rgba(231,97,255,0.68),rgba(111,47,255,0.5))] px-6 py-4 text-center shadow-[0_0_36px_rgba(255,69,214,0.48),inset_0_0_18px_rgba(255,255,255,0.2)] backdrop-blur-xl sm:px-8"
          >
            <span className="text-3xl font-semibold leading-none tracking-tight text-white drop-shadow-[0_0_18px_rgba(255,255,255,0.45)] sm:text-4xl">
              Suzi Chat
            </span>
          </Link>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/login"
              className="rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-medium text-white/90 backdrop-blur-md transition hover:bg-white/16"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="rounded-full border border-pink-300/45 bg-pink-400/16 px-5 py-2.5 text-sm font-medium text-white shadow-[0_0_22px_rgba(255,86,214,0.22)] backdrop-blur-md transition hover:bg-pink-400/22"
            >
              Create account
            </Link>
          </div>
        </div>

        <div className="mt-10 grid flex-1 items-center gap-8 lg:grid-cols-[0.88fr_1.12fr]">
          <section className="rounded-[2rem] border border-white/18 bg-[linear-gradient(180deg,rgba(79,87,255,0.24),rgba(45,28,127,0.3))] p-6 shadow-[0_0_28px_rgba(78,102,255,0.22),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-xl sm:p-8">
            <p className="text-xs font-medium uppercase tracking-[0.45em] text-cyan-100/78">
              Auth Preview
            </p>
            <h1 className="mt-5 max-w-md text-4xl font-semibold leading-tight sm:text-5xl">
              Sign in to the next phase of Suzi Chat.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-8 text-blue-100/78 sm:text-lg">
              This is the first auth shell for the web experience. It follows
              the same neon-glass style as the preview page and sets up the
              route structure for the real auth flow.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.4rem] border border-cyan-300/30 bg-cyan-400/10 p-4 backdrop-blur-md">
                <p className="text-xs uppercase tracking-[0.35em] text-cyan-100/70">
                  Web-first
                </p>
                <p className="mt-2 text-lg font-semibold">Responsive auth UI</p>
              </div>
              <div className="rounded-[1.4rem] border border-pink-300/30 bg-pink-400/10 p-4 backdrop-blur-md">
                <p className="text-xs uppercase tracking-[0.35em] text-pink-100/70">
                  V1
                </p>
                <p className="mt-2 text-lg font-semibold">Simple, direct flow</p>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              {["Login", "Register", "Password reset", "18+ community"].map(
                (item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/18 bg-white/8 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur-md"
                  >
                    {item}
                  </span>
                ),
              )}
            </div>
          </section>

          {children}
        </div>
      </section>
    </main>
  );
}
