import type { ReactNode } from "react";
import Link from "next/link";

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
    <main className="relative min-h-screen overflow-hidden text-white">
      <div
        className="index-scene-drift absolute inset-0 bg-cover bg-left-top bg-no-repeat"
        style={{ backgroundImage: "url('/loginpg.png')" }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(21,3,45,0.36)_0%,rgba(36,5,62,0.46)_38%,rgba(28,2,47,0.9)_62%,rgba(28,2,47,0.98)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_58%,rgba(194,37,255,0.2),transparent_28%),radial-gradient(circle_at_78%_24%,rgba(93,197,255,0.16),transparent_22%)]" />
      <div className="index-aurora absolute inset-0 bg-[radial-gradient(circle_at_22%_48%,rgba(222,66,255,0.22),transparent_22%),radial-gradient(circle_at_70%_32%,rgba(90,208,255,0.16),transparent_20%),radial-gradient(circle_at_82%_72%,rgba(144,84,255,0.12),transparent_24%)]" />
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

      <section className="relative mx-auto flex min-h-screen w-full max-w-[1400px] flex-col px-6 py-8 sm:px-8 lg:px-12">
        <div className="index-reveal-header flex items-center justify-between gap-4">
          <Link href="/" className="block">
            <p className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Suzi Chat
            </p>
            <p className="mt-1 text-[0.68rem] uppercase tracking-[0.45em] text-white/45 sm:text-[0.72rem]">
              SOCIAL PLATFORM
            </p>
          </Link>

          <Link
            href="/"
            className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-white/58 transition hover:text-white sm:text-xs"
          >
            Back to home
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center py-10 lg:justify-end">
          <div className="index-reveal-card w-full max-w-[34rem]">{children}</div>
        </div>
      </section>
    </main>
  );
}
