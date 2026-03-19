import Image from "next/image";
import Link from "next/link";

const friends = [
  { name: "Alan", handle: "@alan", status: "online", avatar: "/ppic/ppic1.jpeg" },
  { name: "Mary", handle: "@mary", status: "online", avatar: "/ppic/ppic2.png" },
  { name: "John", handle: "@john", status: "away", avatar: "/ppic/ppic3.jpg" },
  { name: "Nadia", handle: "@nadia", status: "online", avatar: "/ppic/ppic2.png" },
  { name: "Steve", handle: "@steve", status: "busy", avatar: "/ppic/ppic1.jpeg" },
  { name: "Lisa", handle: "@lisa", status: "online", avatar: "/ppic/ppic3.jpg" },
];

const rooms = [
  {
    name: "General Chat",
    copy: "Adults talking friendly",
    audience: "1.4k online",
    action: "Join Group",
  },
  {
    name: "Music Lounge",
    copy: "Share tunes & chat",
    audience: "630 online",
    action: "Join Group",
  },
  {
    name: "Late Night Chat",
    copy: "Adults only",
    audience: "280 online",
    action: "Browse",
  },
];

const categories = [
  { name: "Hobbies", style: "border-cyan-300/45 bg-cyan-400/14" },
  { name: "Dating", style: "border-pink-300/45 bg-pink-400/14" },
  { name: "Music", style: "border-emerald-300/45 bg-emerald-400/14" },
  { name: "Sports", style: "border-amber-300/45 bg-amber-400/14" },
];

const games = [
  {
    name: "Chess",
    copy: "Play with friends",
    icon: "/games/Chess_icon.png",
    accent:
      "from-cyan-400/24 via-blue-400/10 to-transparent border-cyan-300/26",
    button:
      "border-cyan-300/30 bg-cyan-400/12 hover:bg-cyan-400/18",
  },
  {
    name: "Checkers",
    copy: "Fast two-player tables",
    icon: "/games/Checker_icon.png",
    accent:
      "from-rose-400/22 via-pink-400/10 to-transparent border-pink-300/26",
    button:
      "border-pink-300/30 bg-pink-400/12 hover:bg-pink-400/18",
  },
  {
    name: "Poker",
    copy: "Private or public tables",
    icon: "/games/Poker_icon.png",
    accent:
      "from-emerald-400/22 via-green-400/10 to-transparent border-emerald-300/26",
    button:
      "border-emerald-300/30 bg-emerald-400/12 hover:bg-emerald-400/18",
  },
  {
    name: "Texas Hold'em",
    copy: "Sit and wait for a player",
    icon: "/games/TexasHodem_icon.png",
    accent:
      "from-amber-400/22 via-orange-400/10 to-transparent border-amber-300/26",
    button:
      "border-amber-300/30 bg-amber-400/12 hover:bg-amber-400/18",
  },
  {
    name: "Connect 4",
    copy: "Quick lobby match",
    icon: "/games/Connect4_icon.png",
    accent:
      "from-violet-400/22 via-fuchsia-400/10 to-transparent border-violet-300/26",
    button:
      "border-violet-300/30 bg-violet-400/12 hover:bg-violet-400/18",
  },
];

export default function AppHomePage() {
  return (
    <section className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)_290px]">
        <aside className="rounded-[2rem] border border-white/16 bg-[linear-gradient(180deg,rgba(84,95,255,0.26),rgba(46,28,126,0.34))] p-5 shadow-[0_0_28px_rgba(84,110,255,0.24),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium uppercase tracking-[0.35em] text-cyan-100/80">
              Your Friends
            </p>
            <Link
              href="/app/friends"
              className="text-xs font-medium text-white/72 transition hover:text-white"
            >
              Expand
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {friends.map((friend) => (
              <div
                key={friend.handle}
                className="flex items-center justify-between gap-3 rounded-[1.25rem] border border-white/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.09),rgba(255,255,255,0.04))] px-4 py-3 backdrop-blur-md"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Image
                    src={friend.avatar}
                    alt={`${friend.name} profile`}
                    width={44}
                    height={44}
                    className="h-11 w-11 shrink-0 rounded-full border border-cyan-300/30 object-cover shadow-[0_0_14px_rgba(86,208,255,0.2)]"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold text-white">
                      {friend.name}
                    </p>
                    <p className="truncate text-sm text-blue-100/66">
                      {friend.handle}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`h-3 w-3 shrink-0 rounded-full ${
                      friend.status === "online"
                        ? "bg-emerald-300 shadow-[0_0_10px_rgba(94,255,178,0.75)]"
                        : friend.status === "busy"
                          ? "bg-rose-300 shadow-[0_0_10px_rgba(255,112,161,0.75)]"
                          : "bg-amber-300 shadow-[0_0_10px_rgba(255,204,112,0.75)]"
                    }`}
                  />
                  <button
                    type="button"
                    className="rounded-full border border-white/14 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/84 transition hover:bg-white/16"
                  >
                    Chat
                  </button>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <div className="space-y-6">
          <section className="rounded-[2rem] border border-white/16 bg-[linear-gradient(180deg,rgba(84,95,255,0.3),rgba(46,28,126,0.36))] p-6 shadow-[0_0_30px_rgba(84,110,255,0.24),inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-xl sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.35em] text-cyan-100/80">
                  Chat Rooms
                </p>
                <p className="mt-3 text-base text-blue-100/74">
                  Lobby · Chat · Cam · Relaxed
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {["All", "Trending", "Private", "My Rooms"].map((tab, index) => (
                  <span
                    key={tab}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                      index === 0
                        ? "border-pink-300/45 bg-pink-400/18 text-white"
                        : "border-white/14 bg-white/8 text-blue-100/74"
                    }`}
                  >
                    {tab}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {rooms.map((room) => (
                <article
                  key={room.name}
                  className="flex flex-col gap-4 rounded-[1.35rem] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.1),rgba(255,255,255,0.04))] px-4 py-4 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-2xl font-semibold text-white">{room.name}</p>
                    <p className="mt-1 text-sm text-blue-100/70">{room.copy}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full border border-white/14 bg-white/8 px-3 py-1.5 text-xs font-medium text-blue-100/72">
                      {room.audience}
                    </span>
                    <button
                      type="button"
                      className="rounded-full border border-white/18 bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/16"
                    >
                      {room.action}
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {categories.map((category) => (
                <span
                  key={category.name}
                  className={`rounded-[1rem] border px-4 py-3 text-center text-sm font-semibold text-white ${category.style}`}
                >
                  {category.name}
                </span>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/16 bg-[linear-gradient(180deg,rgba(84,95,255,0.26),rgba(46,28,126,0.34))] p-6 shadow-[0_0_28px_rgba(84,110,255,0.24),inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-xl sm:p-7">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.35em] text-cyan-100/80">
                  Suzi Games
                </p>
                <h2 className="mt-3 text-3xl font-semibold text-white">
                  Tables, lobbies, and quick matches
                </h2>
              </div>
              <Link
                href="/app/rooms"
                className="text-sm font-medium text-white/72 transition hover:text-white"
              >
                View more
              </Link>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {games.map((game) => (
                <article
                  key={game.name}
                  className="flex h-full flex-col rounded-[1.5rem] border border-white/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.1),rgba(255,255,255,0.04))] p-4 shadow-[0_12px_28px_rgba(11,7,34,0.16),inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-md"
                >
                  <div
                    className={`relative flex h-36 items-center justify-center overflow-hidden rounded-[1.15rem] border bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(132,87,255,0.08))] p-3 text-center ${game.accent}`}
                  >
                    <div className="absolute inset-x-5 bottom-2 h-8 rounded-full bg-white/10 blur-xl" />
                    <Image
                      src={game.icon}
                      alt={`${game.name} icon`}
                      width={154}
                      height={108}
                      className="relative max-h-full w-auto object-contain drop-shadow-[0_14px_24px_rgba(7,6,22,0.38)]"
                    />
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="text-[0.68rem] font-medium uppercase tracking-[0.32em] text-cyan-100/62">
                      Suzi Game
                    </p>
                    <span className="rounded-full border border-white/12 bg-white/8 px-2.5 py-1 text-[0.62rem] font-medium uppercase tracking-[0.2em] text-blue-100/66">
                      Lobby
                    </span>
                  </div>
                  <p className="mt-3 text-[1.65rem] font-semibold leading-tight text-white">
                    {game.name}
                  </p>
                  <p className="mt-3 min-h-[3.5rem] text-sm leading-7 text-blue-100/72">
                    {game.copy}
                  </p>
                  <button
                    type="button"
                    className={`mt-auto w-full rounded-full border px-4 py-2.5 text-sm font-medium text-white transition ${game.button}`}
                  >
                    Open lobby
                  </button>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-[2rem] border border-white/16 bg-[linear-gradient(180deg,rgba(84,95,255,0.26),rgba(46,28,126,0.34))] p-5 shadow-[0_0_28px_rgba(84,110,255,0.24),inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-xl">
            <p className="text-sm font-medium uppercase tracking-[0.35em] text-cyan-100/80">
              Suzi Snaps
            </p>
            <div className="mt-5 h-72 rounded-[1.4rem] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(90,111,255,0.06))]" />
          </section>

          <section className="rounded-[2rem] border border-pink-300/20 bg-[linear-gradient(180deg,rgba(193,53,255,0.28),rgba(93,25,129,0.36))] p-5 shadow-[0_0_28px_rgba(255,78,214,0.2),inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-xl">
            <div className="rounded-[1.4rem] border border-pink-300/16 bg-[radial-gradient(circle_at_top,rgba(255,141,218,0.28),transparent_55%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-6">
              <div className="mx-auto flex h-32 w-full max-w-[180px] items-center justify-center rounded-[1.8rem] border border-pink-200/14 bg-white/6">
                <div className="flex gap-4">
                  <span className="h-16 w-16 rounded-full bg-[linear-gradient(180deg,#ff71cb,#c92fff)] shadow-[0_0_18px_rgba(255,90,194,0.42)]" />
                  <span className="h-16 w-16 rounded-full bg-[linear-gradient(180deg,#ff62bb,#9f1be4)] shadow-[0_0_18px_rgba(255,90,194,0.42)]" />
                </div>
              </div>
              <p className="mt-6 text-center text-4xl font-semibold tracking-tight text-white">
                Suzi Dating
              </p>
            </div>
          </section>
        </aside>
      </div>

      <footer className="rounded-[1.6rem] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl">
        <div className="flex flex-col gap-3 text-sm text-blue-100/72 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Suzi Chat V1 dashboard preview for rooms, friends, dating, snaps,
            and game lobbies.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/app/profile" className="transition hover:text-white">
              Profile
            </Link>
            <Link href="/app/friends" className="transition hover:text-white">
              Friends
            </Link>
            <Link href="/app/rooms" className="transition hover:text-white">
              Rooms
            </Link>
          </div>
        </div>
      </footer>
    </section>
  );
}
