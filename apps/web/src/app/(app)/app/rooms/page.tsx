export default function AppRoomsPage() {
  return (
    <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <div className="rounded-[2rem] border border-white/18 bg-[linear-gradient(180deg,rgba(88,70,255,0.34),rgba(57,24,121,0.38))] p-6 shadow-[0_0_30px_rgba(117,84,255,0.28),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-xl sm:p-8">
        <p className="text-sm font-medium uppercase tracking-[0.35em] text-pink-100/78">
          Rooms
        </p>
        <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">
          Room discovery shell
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-8 text-blue-100/78">
          This is a placeholder route for the protected rooms area. It gives the
          app shell a second real destination while the rooms backend is still
          pending.
        </p>

        <div className="mt-8 space-y-4">
          {[
            ["General Chat", "Adults talking friendly"],
            ["Music Lounge", "Share tunes and chat"],
            ["Late Night Chat", "Relaxed conversations after hours"],
          ].map(([title, copy]) => (
            <div
              key={title}
              className="rounded-[1.4rem] border border-white/14 bg-white/8 px-5 py-4 backdrop-blur-md"
            >
              <p className="text-lg font-semibold text-white">{title}</p>
              <p className="mt-1 text-sm text-blue-100/74">{copy}</p>
            </div>
          ))}
        </div>
      </div>

      <aside className="rounded-[2rem] border border-white/18 bg-[linear-gradient(180deg,rgba(255,94,214,0.2),rgba(79,40,149,0.32))] p-6 shadow-[0_0_28px_rgba(255,86,214,0.22),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-xl">
        <p className="text-sm font-medium uppercase tracking-[0.35em] text-cyan-100/78">
          Planned V1
        </p>
        <div className="mt-5 space-y-4 text-sm leading-7 text-blue-100/78">
          <p>Public and private persistent rooms.</p>
          <p>User-created rooms with admin-defined categories.</p>
          <p>Moderation actions like mute, ban, and message deletion.</p>
        </div>
      </aside>
    </section>
  );
}
