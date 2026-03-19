import Link from "next/link";
import { LoginPanel } from "@/components/auth/login-panel";

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

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#1d0434] text-white">
      <div
        className="index-scene-drift absolute inset-0 bg-cover bg-left-top bg-no-repeat"
        style={{ backgroundImage: "url('/loginpg.png')" }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(21,3,45,0.28)_0%,rgba(36,5,62,0.38)_40%,rgba(28,2,47,0.9)_62%,rgba(28,2,47,0.98)_100%)]" />
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

      <section className="relative mx-auto flex min-h-screen max-w-[1400px] flex-col px-6 py-8 sm:px-8 lg:px-12">
        <header className="index-reveal-header flex items-center justify-between gap-4">
          <div>
            <p className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Suzi Chat
            </p>
            <p className="mt-1 text-[0.68rem] uppercase tracking-[0.45em] text-white/45 sm:text-[0.72rem]">
              SOCIAL PLATFORM
            </p>
          </div>
          <div className="text-right text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-white/58 sm:text-xs">
            <span>Need an account? </span>
            <Link href="/register" className="text-white transition hover:text-cyan-100">
              Sign up
            </Link>
          </div>
        </header>

        <section className="relative mt-10 flex flex-1 items-center lg:mt-0 lg:justify-end">
          <div className="grid w-full gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,520px)] lg:items-center">
            <section className="index-reveal-hero flex min-h-[420px] items-end pb-4 max-lg:hidden">
              <div className="max-w-xl">
                <p className="text-sm font-semibold uppercase tracking-[0.5em] text-cyan-100/58">
                  ENTER SUZI CHAT
                </p>
                <h1 className="mt-5 text-6xl font-semibold leading-[0.95] tracking-tight text-white">
                  Sign in to your
                  <span className="block bg-[linear-gradient(90deg,#ffffff_0%,#ff58d1_34%,#8d47ff_72%)] bg-clip-text text-transparent">
                    social world
                  </span>
                </h1>
                <p className="mt-6 max-w-lg text-lg leading-8 text-white/70">
                  Continue your rooms, messages, friends, dating, and game
                  lobby activity from one account.
                </p>
              </div>
            </section>

            <div className="index-reveal-card mx-auto w-full max-w-[34rem] lg:mx-0 lg:justify-self-end">
              <LoginPanel
                eyebrow="Sign In"
                title="Welcome back"
                description="Use your email or username to access your account."
              />
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
