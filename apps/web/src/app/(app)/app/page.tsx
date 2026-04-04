import Image from "next/image";
import Link from "next/link";
import { Chip, Panel, SectionHeader, StatusDot } from "@/components/ui/suzi-primitives";
import { games, people, reels, roomCategories, rooms, snaps } from "@/lib/v1-mock-data";

export default function AppHomePage() {
  const roomTones = [
    "from-cyan-400/42 via-blue-500/28 to-indigo-500/14",
    "from-fuchsia-500/44 via-violet-500/28 to-sky-500/14",
    "from-emerald-400/36 via-cyan-500/26 to-blue-500/14",
  ];
  const categoryStyles = [
    "suzi-chip-hobbies border-cyan-300/50 shadow-[0_0_18px_rgba(0,229,255,0.24)]",
    "suzi-chip-hobbies border-cyan-300/50 shadow-[0_0_18px_rgba(0,229,255,0.24)]",
    "suzi-chip-erotic border-pink-300/50 shadow-[0_0_18px_rgba(255,32,121,0.24)]",
    "suzi-chip-erotic border-fuchsia-300/45 shadow-[0_0_18px_rgba(157,78,221,0.24)]",
    "suzi-chip-sports border-amber-300/45 shadow-[0_0_18px_rgba(255,181,0,0.24)]",
    "suzi-chip-music border-emerald-300/45 shadow-[0_0_18px_rgba(0,255,102,0.22)]",
  ];

  return (
    <section className="space-y-6">
      <div className="grid gap-5 xl:grid-cols-[18.75rem_minmax(0,1fr)_20rem]">
        <div className="space-y-5">
          <Panel className="p-4">
            <SectionHeader eyebrow="Your Friends" title="Friends Online" />

            <div className="mt-4 flex items-center gap-2">
              <input className="suzi-input" placeholder="Search friends" />
              <button type="button" className="suzi-secondary-btn px-3 py-2 text-xs">
                All
              </button>
            </div>

            <div className="suzi-scrollbar mt-4 max-h-[24rem] space-y-2 overflow-y-auto pr-1">
              {people.map((person) => (
                <Link
                  key={person.id}
                  href={`/app/messages/${person.id}-thread`}
                  className="flex items-center gap-3 rounded-[1rem] border border-cyan-300/20 bg-[linear-gradient(160deg,rgba(0,229,255,0.08),rgba(255,32,121,0.04))] px-3 py-3 transition hover:border-cyan-300/45 hover:bg-[linear-gradient(160deg,rgba(0,229,255,0.14),rgba(255,32,121,0.08))]"
                >
                  <Image
                    src={person.avatar}
                    alt={person.name}
                    width={44}
                    height={44}
                    className="h-11 w-11 rounded-full border border-white/15 object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-white">{person.name}</p>
                      <StatusDot status={person.status} />
                    </div>
                    <p className="truncate text-xs text-[var(--text-soft)]">{person.location}</p>
                  </div>
                  <span className="suzi-icon-btn inline-flex h-8 w-8 items-center justify-center rounded-full">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.85"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 6h16v10H8l-4 4V6Z" />
                    </svg>
                  </span>
                </Link>
              ))}
            </div>
          </Panel>

          <Panel className="p-4">
            <SectionHeader
              eyebrow="Reels"
              title="Fresh Clips"
              action={
                <Link href="/app/reels" className="text-sm font-medium text-cyan-100/78 transition hover:text-white">
                  See all
                </Link>
              }
            />

            <div className="mt-4 space-y-3">
              {reels.slice(0, 3).map((reel) => (
                <Link
                  key={reel.id}
                  href={`/app/reels?focus=${reel.id}`}
                  className="flex items-center gap-3 rounded-[1rem] border border-fuchsia-300/25 bg-[linear-gradient(155deg,rgba(157,78,221,0.18),rgba(0,229,255,0.07))] p-2 transition hover:border-fuchsia-300/55 hover:bg-[linear-gradient(155deg,rgba(157,78,221,0.28),rgba(0,229,255,0.13))]"
                >
                  <Image
                    src={reel.poster}
                    alt={reel.author}
                    width={80}
                    height={80}
                    className="h-20 w-20 rounded-[0.8rem] object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{reel.author}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-[var(--text-muted)]">{reel.caption}</p>
                    <p className="mt-2 text-[0.7rem] uppercase tracking-[0.2em] text-cyan-100/70">
                      {reel.views} views
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel className="p-5 sm:p-6">
            <SectionHeader
              eyebrow="Chat Rooms"
              title="Lobby · Chat · Cam · Relaxed"
              copy="Immersive community spaces with stronger color identity. Join a room or browse by category."
              action={
                <Link href="/app/rooms/create" className="suzi-primary-btn inline-flex items-center gap-2 px-4 py-2.5 text-sm">
                  Create Room
                </Link>
              }
            />

            <div className="mt-5 space-y-3">
              {rooms.slice(0, 3).map((room, index) => (
                <article
                  key={room.id}
                  className={`rounded-[1.2rem] border border-cyan-300/26 bg-[linear-gradient(120deg,rgba(20,24,51,0.82),rgba(20,24,51,0.62)),radial-gradient(circle_at_top_left,rgba(255,255,255,0.2),transparent_52%)] p-4 shadow-[0_0_24px_rgba(0,229,255,0.14)] ${roomTones[index] ?? roomTones[0]}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xl font-semibold text-white">{room.name}</p>
                      <p className="mt-1 text-sm text-[var(--text-muted)]">{room.description}</p>
                    </div>
                    <Link href={`/app/rooms/${room.id}`} className="suzi-secondary-btn inline-flex items-center gap-2 px-4 py-2 text-sm">
                      {index === 2 ? "Browse" : "Join Group"}
                    </Link>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {room.tags.slice(0, 3).map((tag) => (
                      <Chip key={tag}>{tag}</Chip>
                    ))}
                    <Chip tone={room.privacy === "Friends" ? "cyan" : "default"}>{room.privacy}</Chip>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {roomCategories.slice(0, 6).map((category, index) => (
                <Chip
                  key={category}
                  active={index === 0}
                  tone={index === 1 ? "cyan" : index === 2 ? "pink" : index === 4 ? "gold" : "default"}
                  className={categoryStyles[index]}
                >
                  {category}
                </Chip>
              ))}
            </div>
          </Panel>

          <Panel className="p-5 sm:p-6">
            <SectionHeader
              eyebrow="Suzi Games"
              title="Play With Friends"
              action={
                <Link href="/app/games" className="text-sm font-medium text-cyan-100/78 transition hover:text-white">
                  View more
                </Link>
              }
            />

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {games.map((game) => (
                <article key={game.id} className="rounded-[1.1rem] border border-cyan-300/18 bg-[linear-gradient(165deg,rgba(255,32,121,0.08),rgba(0,229,255,0.07))] p-3 shadow-[0_0_20px_rgba(157,78,221,0.14)]">
                  <div className={`rounded-[0.9rem] border border-white/14 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.2),transparent_45%)] p-3 ${game.tone}`}>
                    <div className="relative h-20 w-full overflow-hidden rounded-[0.65rem]">
                      <Image src={game.icon} alt={game.name} fill sizes="(min-width: 1280px) 20vw, 33vw" className="object-contain" />
                    </div>
                  </div>
                  <p className="mt-3 text-lg font-semibold text-white">{game.name}</p>
                  <Link
                    href={`/app/games/${game.id}`}
                    className="suzi-secondary-btn mt-3 inline-flex w-full items-center justify-center px-3 py-2 text-sm"
                  >
                    Open lobby
                  </Link>
                </article>
              ))}
            </div>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel className="p-4">
            <SectionHeader
              eyebrow="Suzi Snaps"
              title="Moments"
              action={
                <Link href="/app/snaps" className="text-sm font-medium text-cyan-100/78 transition hover:text-white">
                  Open feed
                </Link>
              }
            />

            <div className="mt-4 space-y-3">
              {snaps.slice(0, 2).map((snap) => (
                <Link
                  key={snap.id}
                  href={`/app/snaps/${snap.id}`}
                  className="block overflow-hidden rounded-[1rem] border border-fuchsia-300/24 bg-[linear-gradient(160deg,rgba(255,32,121,0.12),rgba(0,229,255,0.06))] shadow-[0_0_18px_rgba(255,32,121,0.14)]"
                >
                  <div className="relative h-36">
                    <Image src={snap.image} alt={snap.title} fill sizes="(min-width: 1280px) 20vw, 50vw" className="object-cover" />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,8,26,0.12),rgba(4,8,26,0.55))]" />
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-semibold text-white">{snap.author}</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">{snap.caption}</p>
                  </div>
                </Link>
              ))}
            </div>
          </Panel>

          <Panel className="p-4">
            <SectionHeader eyebrow="Suzi Dating" title="Discover and match" />
            <div className="mt-4 rounded-[1rem] border border-pink-300/35 bg-[linear-gradient(145deg,rgba(255,32,121,0.34),rgba(157,78,221,0.24))] p-4 shadow-[0_0_22px_rgba(255,32,121,0.2)]">
              <p className="text-sm leading-7 text-pink-50/90">
                Browse profiles, send interest, and move to private chat on mutual match.
              </p>
              <Link
                href="/app/dating"
                className="suzi-primary-btn mt-4 inline-flex w-full items-center justify-center px-4 py-2.5 text-sm"
              >
                Open Dating
              </Link>
            </div>
          </Panel>
        </div>
      </div>
    </section>
  );
}
