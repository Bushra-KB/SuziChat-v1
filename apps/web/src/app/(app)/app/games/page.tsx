import Link from "next/link";
import { PersonRow } from "@/components/app/v1-blocks";
import { Panel, SectionHeader } from "@/components/ui/suzi-primitives";
import { games, people } from "@/lib/v1-mock-data";

export default function GamesPage() {
  return (
    <section className="space-y-6">
      <Panel className="p-6 sm:p-7">
        <SectionHeader
          eyebrow="Suzi Games"
          title="Games hub with quick lobbies and invite-first flow"
          copy="The games area stays connected to friends and rooms, so private tables and public lobbies are easy to move between."
        />

        <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {games.map((game) => (
            <article key={game.id} className="rounded-[1.4rem] border border-white/10 bg-white/4 p-4">
              <div className={`rounded-[1.2rem] border border-white/8 ${game.tone} bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))] p-5`}>
                <p className="text-2xl font-semibold text-white">{game.name}</p>
                <p className="mt-3 text-sm leading-7 text-slate-300/78">{game.copy}</p>
              </div>
              <Link href={`/app/games/${game.id}`} className="suzi-primary-btn mt-4 block px-4 py-3 text-center text-sm">
                Open lobby
              </Link>
            </article>
          ))}
        </div>
      </Panel>

      <Panel className="p-5">
        <SectionHeader eyebrow="Invite Friends" title="Start a table with your circle" />
        <div className="mt-5 grid gap-3 xl:grid-cols-3">
          {people.slice(0, 3).map((person) => (
            <PersonRow
              key={person.id}
              person={person}
              compact
              action={
                <button type="button" className="suzi-secondary-btn px-3 py-2 text-xs">
                  Open Lobby
                </button>
              }
            />
          ))}
        </div>
      </Panel>
    </section>
  );
}
