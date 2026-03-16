export default function AppHomePage() {
  return (
    <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-[2rem] border border-white/18 bg-[linear-gradient(180deg,rgba(88,70,255,0.34),rgba(57,24,121,0.38))] p-6 shadow-[0_0_30px_rgba(117,84,255,0.28),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-xl sm:p-8">
        <p className="text-sm font-medium uppercase tracking-[0.35em] text-pink-100/78">
          App Shell
        </p>
        <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">
          The first authenticated Suzi Chat shell is live.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-8 text-blue-100/78">
          This protected area now has navigation and a real profile foundation.
          It is still deliberately small, but it gives the app a stable shape
          for the next feature modules.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            ["Profile", "Editable user profile backed by the API"],
            ["Rooms", "Protected route placeholder for room discovery"],
            ["Shell", "Navigation structure for the authenticated app"],
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
          Foundation Notes
        </p>
        <div className="mt-5 space-y-4 text-sm leading-7 text-blue-100/78">
          <p>Profile data now has a dedicated API module and endpoints.</p>
          <p>Navigation is ready for friends, chat, dating, and admin later.</p>
          <p>Auth is still local-storage based and can move to cookies later.</p>
        </div>
      </aside>
    </section>
  );
}
