import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { AuthSessionRedirect } from "@/components/auth/auth-session-redirect";

const twinkleStars = [
  { left: "11%", top: "18%", size: 6, delay: "0.2s", duration: "2.5s" },
  { left: "22%", top: "72%", size: 5, delay: "1.1s", duration: "3.2s" },
  { left: "34%", top: "58%", size: 8, delay: "0.8s", duration: "2.9s" },
  { left: "58%", top: "16%", size: 7, delay: "1.7s", duration: "3.1s" },
  { left: "71%", top: "68%", size: 5, delay: "0.5s", duration: "2.7s" },
  { left: "82%", top: "26%", size: 8, delay: "2.2s", duration: "3.4s" },
  { left: "88%", top: "80%", size: 6, delay: "1.4s", duration: "2.8s" },
  { left: "63%", top: "44%", size: 7, delay: "0.9s", duration: "2.6s" },
  { left: "76%", top: "54%", size: 6, delay: "1.9s", duration: "3.3s" },
];

const shootingStars = [
  { left: "18%", top: "26%", width: 220, delay: "1.1s", duration: "6.6s" },
  { left: "63%", top: "15%", width: 240, delay: "3.8s", duration: "7.2s" },
  { left: "48%", top: "72%", width: 180, delay: "5.4s", duration: "6.1s" },
  { left: "74%", top: "36%", width: 160, delay: "2.4s", duration: "5.8s" },
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="suzi-hybrid-bg relative h-screen overflow-x-hidden overflow-y-auto text-white">
      <AuthSessionRedirect to="/app" />
      <div className="absolute inset-0 opacity-12 [background-image:radial-gradient(rgba(255,255,255,0.6)_0.7px,transparent_0.7px)] [background-size:28px_28px]" />
      <div className="absolute left-[-8%] top-[-6%] h-[34rem] w-[34rem] rounded-full bg-sky-300/14 blur-[150px]" />
      <div className="absolute right-[-5%] top-[8%] h-[28rem] w-[28rem] rounded-full bg-blue-400/10 blur-[130px]" />
      <div className="absolute bottom-[-8%] left-[18%] h-[26rem] w-[26rem] rounded-full bg-indigo-500/14 blur-[140px]" />
      <div className="index-aurora absolute inset-0 bg-[radial-gradient(circle_at_20%_42%,rgba(133,223,255,0.2),transparent_24%),radial-gradient(circle_at_74%_30%,rgba(112,168,255,0.18),transparent_22%),radial-gradient(circle_at_56%_76%,rgba(171,97,255,0.14),transparent_26%)]" />
      {twinkleStars.map((star) => (
        <span
          key={`${star.left}-${star.top}`}
          className="index-twinkle-star"
          style={{
            left: star.left,
            top: star.top,
            width: `${star.size}px`,
            height: `${star.size}px`,
            animationDelay: star.delay,
            animationDuration: star.duration,
          }}
        />
      ))}
      {shootingStars.map((star) => (
        <span
          key={`${star.left}-${star.top}`}
          className="index-shooting-star"
          style={{
            left: star.left,
            top: star.top,
            width: `${star.width}px`,
            animationDelay: star.delay,
            animationDuration: star.duration,
          }}
        />
      ))}

      <section className="relative mx-auto flex min-h-full w-full max-w-[1400px] flex-col px-4 py-6 sm:px-8 lg:px-12">
        <div className="index-reveal-header flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-3.5">
            <span className="relative block h-[2.8rem] w-[8.8rem] overflow-hidden sm:h-[3rem] sm:w-[9.8rem]">
              <Image
                src="/logo/logo.png"
                alt="Suzi Chat logo"
                width={1536}
                height={1024}
                priority
                className="absolute left-1/2 top-1/2 h-[214%] w-auto max-w-none -translate-x-1/2 -translate-y-[52%] drop-shadow-[0_0_16px_rgba(232,77,255,0.3)]"
              />
            </span>
            <div>
              <p className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Suzi Chat
              </p>
              <p className="mt-1 text-[0.68rem] uppercase tracking-[0.45em] text-white/45 sm:text-[0.72rem]">
                SOCIAL PLATFORM
              </p>
            </div>
          </Link>

          <Link
            href="/"
            className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-white/58 transition hover:text-white sm:text-xs"
          >
            Back to home
          </Link>
        </div>

        <section className="relative mt-8 flex items-start justify-center pb-8 lg:mt-4">
          <div className="index-reveal-card w-full max-w-[34rem]">
            {children}
          </div>
        </section>
      </section>
    </main>
  );
}
