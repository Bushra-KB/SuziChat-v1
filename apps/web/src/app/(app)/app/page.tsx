import Link from "next/link";

export default function AppHomePage() {
  return (
    <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-[2rem] border border-white/18 bg-[linear-gradient(180deg,rgba(88,70,255,0.34),rgba(57,24,121,0.38))] p-6 shadow-[0_0_30px_rgba(117,84,255,0.28),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-xl sm:p-8">
        <p className="text-sm font-medium uppercase tracking-[0.35em] text-pink-100/78">
          Protected Preview
        </p>
        <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">
          You are inside the authenticated web area.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-8 text-blue-100/78">
          This route is guarded on the client with the current local token
          session. It is the first placeholder for the real in-app experience
          after login and registration.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            ["Friends", "Mutual requests and presence"],
            ["Rooms", "Persistent public and private chat rooms"],
            ["Dating", "Browse and mutual interest flow"],
          ].map(([title, copy]) => (
            <div
              key={title}
              className="rounded-[1.4rem] border border-white/14 bg-white/8 p-4 backdrop-blur-md"
            >
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-100/70">
                Module
              </p>
              <p className="mt-3 text-lg font-semibold text-white">{title}</p>
              <p className="mt-2 text-sm leading-6 text-blue-100/76">{copy}</p>
            </div>
          ))}
        </div>
      </div>

      <aside className="rounded-[2rem] border border-white/18 bg-[linear-gradient(180deg,rgba(255,94,214,0.2),rgba(79,40,149,0.32))] p-6 shadow-[0_0_28px_rgba(255,86,214,0.22),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-xl">
        <p className="text-sm font-medium uppercase tracking-[0.35em] text-cyan-100/78">
          Next Steps
        </p>
        <div className="mt-5 space-y-4 text-sm leading-7 text-blue-100/78">
          <p>Connect these protected routes to real feature data.</p>
          <p>Swap local-storage auth for cookie-based SSR auth later.</p>
          <p>Extend route protection to chat, profile, and admin sections.</p>
        </div>

        <Link
          href="/"
          className="mt-8 inline-flex rounded-full border border-white/18 bg-white/10 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/16"
        >
          Back to landing page
        </Link>
      </aside>
    </section>
  );
}
