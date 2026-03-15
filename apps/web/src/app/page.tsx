export default function Home() {
  const features = [
    "Chat rooms",
    "Direct messaging",
    "Friends",
    "Dating",
    "Snaps",
    "Reels",
    "Games",
  ];

  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,108,214,0.3),_transparent_28%),radial-gradient(circle_at_20%_20%,_rgba(122,125,255,0.45),_transparent_32%),radial-gradient(circle_at_80%_30%,_rgba(86,208,255,0.22),_transparent_28%),linear-gradient(180deg,_#1f2fba_0%,_#3322a3_35%,_#24145f_100%)]" />
      <div className="absolute inset-0 opacity-35 [background-image:radial-gradient(rgba(255,255,255,0.9)_0.7px,transparent_0.7px)] [background-size:26px_26px]" />
      <div className="absolute left-1/2 top-36 h-px w-[88%] -translate-x-1/2 bg-[linear-gradient(90deg,transparent,rgba(255,168,243,0.95),transparent)] shadow-[0_0_22px_rgba(255,140,230,0.85)]" />

      <section className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-10 sm:px-10 lg:px-12">
        <div className="mx-auto mt-4 w-fit rounded-[2rem] border border-pink-300/70 bg-[linear-gradient(180deg,rgba(231,97,255,0.68),rgba(111,47,255,0.5))] px-8 py-5 text-center shadow-[0_0_45px_rgba(255,69,214,0.55),inset_0_0_18px_rgba(255,255,255,0.24)] backdrop-blur-xl sm:px-14 sm:py-7">
          <p className="text-[clamp(3rem,8vw,5.6rem)] font-semibold leading-none tracking-tight text-white drop-shadow-[0_0_18px_rgba(255,255,255,0.45)]">
            Suzi Chat
          </p>
        </div>

        <section className="mt-12 text-center">
          <p className="animate-pulse text-3xl font-extrabold uppercase tracking-[0.45em] text-pink-100 drop-shadow-[0_0_18px_rgba(255,126,224,0.7)] sm:text-4xl">
            ComingSoon
          </p>
        </section>

        <div className="mt-12">
          <section className="rounded-[2rem] border border-white/20 bg-[linear-gradient(180deg,rgba(78,89,255,0.34),rgba(47,33,135,0.36))] p-6 shadow-[0_0_30px_rgba(78,102,255,0.28),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-xl sm:p-8">
            <p className="text-xs font-medium uppercase tracking-[0.45em] text-cyan-100/80">
              Web Preview
            </p>
            <div className="flex flex-col items-center text-center">
              <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
                A social platform for adults, built around live chat,
                connection, and playful community.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-blue-100/78 sm:text-lg">
                Suzi Chat is launching first on the web with a responsive
                experience focused on chat rooms, direct messaging, dating,
                media sharing, and casual games.
              </p>

              <div className="mt-8 flex flex-wrap justify-center gap-3">
                {features.map((feature) => (
                  <span
                    key={feature}
                    className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white/92 shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_0_18px_rgba(78,136,255,0.18)] backdrop-blur-md"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <article className="rounded-[1.5rem] border border-cyan-300/35 bg-cyan-400/10 p-4 backdrop-blur-md">
                <p className="text-xs uppercase tracking-[0.35em] text-cyan-100/70">
                  Realtime
                </p>
                <p className="mt-2 text-xl font-semibold">Rooms and DMs</p>
              </article>
              <article className="rounded-[1.5rem] border border-pink-300/35 bg-pink-400/10 p-4 backdrop-blur-md">
                <p className="text-xs uppercase tracking-[0.35em] text-pink-100/70">
                  Social
                </p>
                <p className="mt-2 text-xl font-semibold">Snaps and reels</p>
              </article>
              <article className="rounded-[1.5rem] border border-amber-300/35 bg-amber-300/10 p-4 backdrop-blur-md">
                <p className="text-xs uppercase tracking-[0.35em] text-amber-50/75">
                  Play
                </p>
                <p className="mt-2 text-xl font-semibold">Dating and games</p>
              </article>
            </div>
            <div className="mt-10 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <section className="rounded-[1.75rem] border border-white/20 bg-[linear-gradient(180deg,rgba(86,61,255,0.28),rgba(61,22,137,0.3))] p-5 shadow-[0_0_26px_rgba(116,79,255,0.24)] backdrop-blur-md">
                <p className="text-sm font-medium uppercase tracking-[0.35em] text-pink-100/75">
                  Coming Soon
                </p>
                <p className="mt-4 text-2xl font-semibold leading-tight">
                  Private preview deployment in progress.
                </p>
                <p className="mt-4 max-w-2xl text-base leading-7 text-blue-100/80">
                  The first live version will focus on a polished web
                  experience, fast navigation, and a clear product direction
                  for client review.
                </p>
              </section>

              <section className="rounded-[1.75rem] border border-pink-300/25 bg-[linear-gradient(180deg,rgba(191,57,255,0.24),rgba(82,21,135,0.3))] p-5 shadow-[0_0_24px_rgba(255,86,214,0.22)] backdrop-blur-md">
                <p className="text-sm font-medium uppercase tracking-[0.35em] text-pink-100/75">
                  V1 Focus
                </p>
                <ul className="mt-4 space-y-3 text-base text-white/88">
                  <li>Responsive web-first experience</li>
                  <li>Simple, stable modular monolith architecture</li>
                  <li>Chat-first product with clear social features</li>
                </ul>
              </section>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
