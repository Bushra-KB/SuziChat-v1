import Image from "next/image";
import Link from "next/link";
import { HomeChatRoomsPanel } from "@/components/app/home-chat-rooms-panel";
import { HomeFriendsPanel } from "@/components/app/home-friends-panel";
import { Panel, SectionHeader } from "@/components/ui/suzi-primitives";
import { games, reels, snaps } from "@/lib/v1-mock-data";

export default function AppHomePage() {
  return (
    <section className="space-y-6">
      <div className="grid gap-5 xl:grid-cols-[18.75rem_minmax(0,1fr)_20rem]">
        <div className="space-y-5">
          <HomeFriendsPanel />

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
          <HomeChatRoomsPanel />

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
