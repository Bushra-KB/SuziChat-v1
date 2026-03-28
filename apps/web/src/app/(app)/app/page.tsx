import Link from "next/link";
import { PersonRow, RoomDirectoryCard, SnapCard } from "@/components/app/v1-blocks";
import {
  Chip,
  MetricCard,
  Panel,
  SectionHeader,
} from "@/components/ui/suzi-primitives";
import {
  adminStats,
  datingProfiles,
  directMessageThreads,
  games,
  notifications,
  people,
  roomCategories,
  rooms,
  snaps,
} from "@/lib/v1-mock-data";

export default function AppHomePage() {
  return (
    <section className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_360px]">
        <div className="space-y-6">
          <Panel className="p-6 sm:p-7">
            <SectionHeader
              eyebrow="Dashboard"
              title="Continue chatting, browsing, and matching"
              copy="A cleaner SuziChat home for rooms, messages, friends, dating, snaps, reels, and games. Neon stays controlled and functional."
              action={
                <Link
                  href="/app/rooms/create"
                  className="suzi-primary-btn inline-flex items-center gap-2 px-4 py-2.5 text-sm"
                >
                  Create Room
                </Link>
              }
            />

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {adminStats.map((item) => (
                <MetricCard key={item.label} label={item.label} value={item.value} tone={item.tone} />
              ))}
            </div>
          </Panel>

          <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.05fr)_360px]">
            <Panel className="p-6 sm:p-7">
              <SectionHeader
                eyebrow="Continue"
                title="Resume your active spaces"
                copy="Jump back into the room, direct message, or game lobby that still has momentum."
              />

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <Link
                  href="/app/rooms/general-chat"
                  className="overflow-hidden rounded-[1.4rem] border border-white/10 bg-[linear-gradient(135deg,rgba(103,76,255,0.3),rgba(232,77,255,0.18))] p-5 transition hover:-translate-y-0.5"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100/70">
                    Active room
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-white">General Chat</p>
                  <p className="mt-2 text-sm leading-7 text-slate-200/78">
                    Music, daily room updates, and quick moves into game tables.
                  </p>
                  <div className="mt-5 flex items-center justify-between">
                    <Chip tone="cyan">126 active</Chip>
                    <span className="text-sm font-medium text-white">Open</span>
                  </div>
                </Link>

                <Link
                  href="/app/messages/alan-thread"
                  className="overflow-hidden rounded-[1.4rem] border border-white/10 bg-[linear-gradient(135deg,rgba(20,120,173,0.22),rgba(68,38,180,0.2))] p-5 transition hover:-translate-y-0.5"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100/70">
                    Active DM
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-white">Alan Rivera</p>
                  <p className="mt-2 text-sm leading-7 text-slate-200/78">
                    “Want the private chess table or public lobby tonight?”
                  </p>
                  <div className="mt-5 flex items-center justify-between">
                    <Chip tone="pink">3 unread</Chip>
                    <span className="text-sm font-medium text-white">Reply</span>
                  </div>
                </Link>
              </div>

              <div className="mt-8">
                <SectionHeader
                  eyebrow="Trending Rooms"
                  title="Rooms worth joining tonight"
                  action={
                    <Link href="/app/rooms" className="text-sm font-medium text-cyan-100/78 transition hover:text-white">
                      View all rooms
                    </Link>
                  }
                />
                <div className="mt-5 grid gap-4 xl:grid-cols-3">
                  {rooms.slice(0, 3).map((room) => (
                    <RoomDirectoryCard key={room.id} room={room} />
                  ))}
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  {roomCategories.slice(0, 6).map((category, index) => (
                    <Chip key={category} active={index === 0} tone={index === 2 ? "pink" : index === 4 ? "gold" : "default"}>
                      {category}
                    </Chip>
                  ))}
                </div>
              </div>
            </Panel>

            <div className="space-y-6">
              <Panel className="p-5">
                <SectionHeader
                  eyebrow="Online Friends"
                  title="People available now"
                />
                <div className="mt-5 space-y-3">
                  {people.slice(0, 4).map((person) => (
                    <PersonRow
                      key={person.id}
                      person={person}
                      compact
                      action={
                        <Link
                          href={`/app/messages/${person.id}-thread`}
                          className="suzi-secondary-btn px-3 py-2 text-xs"
                        >
                          DM
                        </Link>
                      }
                    />
                  ))}
                </div>
              </Panel>

              <Panel className="p-5">
                <SectionHeader eyebrow="Notifications" title="What needs attention" />
                <div className="mt-5 space-y-3">
                  {notifications.slice(0, 3).map((item) => (
                    <div key={item.id} className="rounded-[1rem] border border-white/8 bg-white/4 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-pink-100/70">
                        {item.type}
                      </p>
                      <p className="mt-2 font-medium text-white">{item.title}</p>
                      <p className="mt-1 text-sm text-slate-400">{item.time}</p>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          </div>

          <Panel className="p-6 sm:p-7">
            <SectionHeader
              eyebrow="Suzi Games"
              title="Quick lobbies, private tables, and friend invites"
              copy="The games surfaces stay connected to the social layer, so room activity, friends, and table invites all move together."
              action={
                <Link href="/app/games" className="text-sm font-medium text-cyan-100/78 transition hover:text-white">
                  Open Games Hub
                </Link>
              }
            />

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {games.map((game) => (
                <article
                  key={game.id}
                  className="rounded-[1.4rem] border border-white/10 bg-[rgba(255,255,255,0.03)] p-4"
                >
                  <div
                    className={`rounded-[1.1rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.14),transparent_40%)] ${game.tone} p-4`}
                  >
                    <div className="text-xl font-semibold text-white">{game.name}</div>
                    <p className="mt-2 text-sm leading-6 text-slate-300/78">{game.copy}</p>
                  </div>
                  <Link
                    href={`/app/games/${game.id}`}
                    className="suzi-secondary-btn mt-4 inline-flex w-full items-center justify-center px-4 py-2.5 text-sm"
                  >
                    Open lobby
                  </Link>
                </article>
              ))}
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel className="p-5">
            <SectionHeader
              eyebrow="Suzi Snaps"
              title="Latest moments"
              action={
                <Link href="/app/snaps" className="text-sm font-medium text-cyan-100/78 transition hover:text-white">
                  See feed
                </Link>
              }
            />
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              {snaps.slice(0, 2).map((snap) => (
                <SnapCard key={snap.id} snap={snap} />
              ))}
            </div>
          </Panel>

          <Panel className="p-5">
            <SectionHeader
              eyebrow="Dating"
              title="Discover and matches"
              copy="Low-pressure entry into the dating layer, with filters, mutual interest, and an easy move into DMs."
            />
            <div className="mt-5 space-y-3">
              {datingProfiles.slice(0, 3).map((profile) => (
                <div key={profile.id} className="rounded-[1.15rem] border border-white/8 bg-white/4 p-4">
                  <p className="font-medium text-white">
                    {profile.name}, {profile.age}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">{profile.location}</p>
                  <p className="mt-3 text-sm leading-6 text-slate-300/76">
                    {profile.headline}
                  </p>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      {profile.flags?.slice(0, 2).map((flag) => (
                        <Chip key={flag} tone="pink">
                          {flag}
                        </Chip>
                      ))}
                    </div>
                    <Link
                      href={`/app/dating/${profile.id}`}
                      className="suzi-secondary-btn px-3 py-2 text-xs"
                    >
                      View
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="p-5">
            <SectionHeader eyebrow="Messages" title="Unread conversations" />
            <div className="mt-5 space-y-3">
              {directMessageThreads.slice(0, 4).map((thread) => (
                <Link
                  key={thread.id}
                  href={`/app/messages/${thread.id}`}
                  className="flex items-center justify-between gap-3 rounded-[1rem] border border-white/8 bg-white/4 px-3 py-3 transition hover:bg-white/6"
                >
                  <div>
                    <p className="font-medium text-white">{thread.person.name}</p>
                    <p className="mt-1 text-sm text-slate-400">{thread.preview}</p>
                  </div>
                  {thread.unread ? (
                    <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-fuchsia-500/90 px-2 text-xs font-semibold text-white">
                      {thread.unread}
                    </span>
                  ) : null}
                </Link>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </section>
  );
}
