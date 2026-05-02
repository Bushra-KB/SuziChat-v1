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
    <section className="suzi-app-frame-fill">
      {/*
        xl: three flex columns; each column splits height by flex-grow (scroll inside panels only):
        left 60/40 (Friends/Reels), middle 60/40 (Rooms/Games), right 75/25 (Snaps/Dating).
        Narrow: stack with one column scrollport.
      */}
      <div className="suzi-home-dashboard-scale flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1 suzi-scrollbar xl:h-full xl:min-h-0 xl:flex-row xl:gap-4 xl:overflow-hidden xl:pr-0">
        <div className="flex w-full min-h-0 flex-col gap-4 xl:h-full xl:w-[21.5rem] xl:max-w-[21.5rem] xl:shrink-0 xl:gap-4">
          <div className="flex min-h-[14rem] flex-col overflow-hidden xl:min-h-0 xl:flex-[3_1_0%]">
            <HomeFriendsPanel />
          </div>
          <div className="flex min-h-[14rem] flex-col overflow-hidden xl:min-h-0 xl:flex-[2_1_0%]">
            <HomeReelsPanel />
          </div>
        </div>

        <div className="flex w-full min-h-0 flex-1 flex-col gap-4 xl:h-full xl:min-h-0 xl:min-w-0 xl:gap-4">
          <div className="flex min-h-[20rem] flex-col overflow-hidden xl:min-h-0 xl:flex-[3_1_0%]">
            <HomeChatRoomsPanel variant="dashboard" />
          </div>

          <div className="flex min-h-[16rem] flex-col overflow-hidden xl:min-h-0 xl:flex-[2_1_0%]">
            <Panel className="flex h-full min-h-0 flex-col overflow-hidden p-5 sm:p-6 xl:p-4">
            <div className="flex shrink-0 items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-[0.75rem] border border-cyan-300/30 bg-[linear-gradient(160deg,rgba(88,36,175,0.62),rgba(32,18,88,0.82))] text-fuchsia-100/92 shadow-[0_0_12px_rgba(157,78,221,0.28)] xl:h-7 xl:w-7">
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
                <h2 className="whitespace-nowrap text-[1.5rem] font-bold tracking-tight text-white xl:text-[1.4rem]">
                  Suzi Games
                </h2>
              </div>

              <Link
                href="/app/games"
                className="shrink-0 whitespace-nowrap text-sm font-medium text-fuchsia-200/90 transition hover:text-fuchsia-100 xl:text-[0.95rem]"
              >
                Explore more
              </Link>
            </div>

            <div className="suzi-scrollbar mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain xl:mt-3">
              <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3 xl:grid-cols-4 xl:gap-2.5">
                {games.map((game) => (
                  <article
                    key={game.id}
                    className="rounded-[1rem] border border-cyan-300/18 bg-[linear-gradient(165deg,rgba(255,32,121,0.08),rgba(0,229,255,0.07))] p-2.5 shadow-[0_0_20px_rgba(157,78,221,0.14)] xl:p-2.5"
                  >
                    <div className={`rounded-[0.85rem] border border-white/14 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.2),transparent_45%)] p-2.5 ${game.tone}`}>
                      <div className="relative h-[4.5rem] w-full overflow-hidden rounded-[0.6rem] sm:h-20 xl:h-[4.25rem]">
                        <Image src={game.icon} alt={game.name} fill sizes="(min-width: 1280px) 20vw, 33vw" className="object-contain" />
                      </div>
                    </div>
                    <p className="mt-2 text-base font-semibold text-white sm:text-lg">{game.name}</p>
                    <Link
                      href={`/app/games/${game.id}`}
                      className="suzi-secondary-btn mt-2 inline-flex w-full items-center justify-center px-3 py-1.5 text-xs sm:mt-3 sm:py-2 sm:text-sm"
                    >
                      Open lobby
                    </Link>
                  </article>
                ))}
              </div>
            </div>
            </Panel>
          </div>
        </div>

        <div className="flex w-full min-h-0 flex-col gap-4 xl:h-full xl:w-[18.5rem] xl:max-w-[18.5rem] xl:shrink-0 xl:gap-4">
          <div className="flex min-h-[18rem] flex-col overflow-hidden xl:min-h-0 xl:flex-[3_1_0%]">
            <HomeSnapsPanel layout="dashboard" />
          </div>

          <div className="flex min-h-[12rem] flex-col overflow-hidden xl:min-h-0 xl:flex-[1_1_0%]">
            <HomeDatingPanel />
          </div>
        </div>
      </div>
    </section>
  );
}
