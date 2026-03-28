import { Chip, Panel, SectionHeader } from "@/components/ui/suzi-primitives";
import { gameLobbyChat, gameLobbyTables, games, people } from "@/lib/v1-mock-data";

export default async function GameLobbyPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  const game = games.find((entry) => entry.id === gameId) ?? games[0];

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-6">
        <Panel className="p-6 sm:p-7">
          <SectionHeader
            eyebrow="Game Lobby"
            title={`${game.name} table lobby`}
            copy="Click a table, wait for someone to join, or make the table private and invite friends directly."
          />

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {gameLobbyTables.map((table) => (
              <article key={table.table} className="rounded-[1.3rem] border border-white/10 bg-white/4 p-4">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-100/70">
                  {table.table}
                </p>
                <div className="mt-3 h-28 rounded-[1rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01)),radial-gradient(circle_at_top,rgba(232,77,255,0.16),transparent_38%),radial-gradient(circle_at_bottom,rgba(82,213,255,0.12),transparent_38%)]" />
                <p className="mt-4 font-medium text-white">{table.players}</p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <Chip tone={table.status === "Private" ? "pink" : table.status === "Watching" ? "cyan" : "default"}>
                    {table.status}
                  </Chip>
                  <span className="text-sm text-slate-400">{table.watchers} watching</span>
                </div>
              </article>
            ))}
          </div>
        </Panel>
      </div>

      <div className="space-y-6">
        <Panel className="p-5">
          <SectionHeader eyebrow="Friends" title="Invite to table" />
          <div className="mt-5 space-y-3">
            {people.slice(0, 4).map((person) => (
              <div key={person.id} className="flex items-center justify-between gap-3 rounded-[1rem] border border-white/8 bg-white/4 px-3 py-3">
                <div>
                  <p className="font-medium text-white">{person.name}</p>
                  <p className="text-sm text-slate-400">{person.handle}</p>
                </div>
                <button type="button" className="suzi-secondary-btn px-3 py-2 text-xs">
                  Invite
                </button>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-5">
          <SectionHeader eyebrow="Lobby Chat" title="Find a quick player" />
          <div className="mt-5 space-y-3">
            {gameLobbyChat.map((line) => (
              <div key={line} className="rounded-[1rem] border border-white/8 bg-white/4 px-4 py-3 text-sm text-slate-300/80">
                {line}
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-3">
            <input className="suzi-input" placeholder="Type your lobby message..." />
            <button type="button" className="suzi-primary-btn px-4 py-3 text-sm">
              Send
            </button>
          </div>
        </Panel>
      </div>
    </section>
  );
}
