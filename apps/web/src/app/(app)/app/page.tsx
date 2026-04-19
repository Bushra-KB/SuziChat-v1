import Image from "next/image";
import Link from "next/link";
import { HomeChatRoomsPanel } from "@/components/app/home-chat-rooms-panel";
import { HomeDatingPanel } from "@/components/app/home-dating-panel";
import { HomeFriendsPanel } from "@/components/app/home-friends-panel";
import { HomeReelsPanel } from "@/components/app/home-reels-panel";
import { HomeSnapsPanel } from "@/components/app/home-snaps-panel";
import { Panel } from "@/components/ui/suzi-primitives";
import { games } from "@/lib/v1-mock-data";

export default function AppHomePage() {
  return (
    <section className="space-y-6">
      {/* Three independent columns: only gap-5 between top & bottom widgets — avoids a shared "tall row" gap */}
      <div className="grid gap-5 xl:grid-cols-[18.75rem_minmax(0,1fr)_20rem]">
        <div className="flex min-h-0 min-w-0 flex-col gap-5">
          <HomeFriendsPanel />
          <HomeReelsPanel />
        </div>

        <div className="flex min-h-0 min-w-0 flex-col gap-5">
          <HomeChatRoomsPanel variant="dashboard" />

          <Panel className="p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-[0.75rem] border border-cyan-300/30 bg-[linear-gradient(160deg,rgba(88,36,175,0.62),rgba(32,18,88,0.82))] text-fuchsia-100/92 shadow-[0_0_12px_rgba(157,78,221,0.28)]">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-4.5 w-4.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="4" y="8" width="16" height="9" rx="4.5" />
                    <path d="M8 12h3M9.5 10.5v3" />
                    <circle cx="15.5" cy="11.5" r=".8" fill="currentColor" stroke="none" />
                    <circle cx="17.5" cy="13.5" r=".8" fill="currentColor" stroke="none" />
                  </svg>
                </span>
                <h2 className="whitespace-nowrap text-[1.65rem] font-bold tracking-tight text-white">Suzi Games</h2>
              </div>

              <Link href="/app/games" className="shrink-0 whitespace-nowrap text-[1.05rem] font-medium text-fuchsia-200/90 transition hover:text-fuchsia-100">
                Explore more
              </Link>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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

        <div className="flex min-h-0 min-w-0 flex-col gap-5">
          <div className="flex min-h-0 min-w-0 flex-col overflow-hidden xl:h-[44rem]">
            <HomeSnapsPanel layout="dashboard" />
          </div>

          <HomeDatingPanel />
        </div>
      </div>
    </section>
  );
}
