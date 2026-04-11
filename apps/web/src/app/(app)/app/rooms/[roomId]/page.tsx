import Link from "next/link";
import { PersonRow } from "@/components/app/v1-blocks";
import { Panel, cx } from "@/components/ui/suzi-primitives";
import { people, roomMessages, rooms } from "@/lib/v1-mock-data";

export default async function RoomChatPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  const room = rooms.find((entry) => entry.id === roomId) ?? rooms[0];
  const roomHosts = people.slice(0, 2);
  const roomMembers = people.slice(2);
  const onlineCount = [...roomHosts, ...roomMembers].filter((person) => person.status === "online").length;

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <Panel className="flex h-[75vh] min-h-[32rem] max-h-[75vh] flex-col overflow-hidden border border-cyan-300/24 bg-[linear-gradient(180deg,rgba(36,45,116,0.52),rgba(40,16,117,0.52))] p-0 shadow-[0_14px_38px_rgba(15,23,42,0.2)]">
        <div className="border-b border-cyan-300/20 bg-[linear-gradient(155deg,rgba(30,19,88,0.84),rgba(17,12,60,0.78))] px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-cyan-100/64">
                Room Chat
              </p>
              <h1 className="mt-1 text-2xl font-semibold text-white">{room.name}</h1>
              <p className="mt-1 max-w-2xl text-sm text-cyan-100/82">{room.description}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-md border border-cyan-300/35 bg-cyan-400/15 px-3 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-cyan-100">
                {room.category}
              </span>
              <span
                className={cx(
                  "inline-flex rounded-md border px-3 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.12em]",
                  room.privacy === "Private"
                    ? "border-pink-300/35 bg-pink-400/15 text-pink-100"
                    : room.privacy === "Friends"
                      ? "border-violet-300/35 bg-violet-400/15 text-violet-100"
                      : "border-white/14 bg-white/7 text-cyan-100/86",
                )}
              >
                {room.privacy}
              </span>
              <Link
                href={`/app/rooms/${room.id}/edit`}
                className="suzi-secondary-btn px-4 py-1.5 text-sm"
              >
                Edit
              </Link>
            </div>
          </div>
        </div>

        <div className="suzi-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto bg-white px-5 py-5 sm:px-6">
          {roomMessages.map((message) => {
            const mine = message.kind === "mine";
            return (
              <div key={message.id} className={cx("flex", mine ? "justify-end" : "justify-start")}>
                <div
                  className={cx(
                    "max-w-[min(36rem,100%)] rounded-[0.85rem] border px-4 py-3 shadow-sm",
                    mine ? "border-fuchsia-200 bg-fuchsia-50" : "border-slate-200 bg-slate-50",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">{message.author}</p>
                    <span className="text-xs text-slate-500">{message.time}</span>
                  </div>
                  <p className="mt-1.5 text-sm leading-6 text-slate-700">{message.message}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-cyan-300/20 bg-[linear-gradient(155deg,rgba(30,19,88,0.84),rgba(17,12,60,0.78))] px-5 py-4 sm:px-6">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_140px]">
            <input
              className="suzi-input h-11"
              placeholder="Write your message, invite a friend, or call out a game table"
            />
            <button
              type="button"
              className="suzi-primary-btn px-4 py-3 text-sm"
            >
              Send
            </button>
          </div>
        </div>
      </Panel>

      <div className="flex h-[75vh] min-h-[32rem] max-h-[75vh] flex-col gap-6">
        <Panel className="flex min-h-0 flex-1 flex-col p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[1.35rem] font-semibold tracking-tight text-white">Room Members</h2>
            <span className="inline-flex items-center gap-1.5 text-[0.78rem] font-semibold text-emerald-100">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,255,178,0.72)]" />
              {onlineCount} online
            </span>
          </div>
          <div className="suzi-scrollbar mt-4 min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
            <div>
              <p className="mb-2 text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-cyan-100/72">
                Room Hosts
              </p>
              <div className="space-y-3">
                {roomHosts.map((person) => (
                  <PersonRow
                    key={person.id}
                    person={person}
                    compact
                    action={
                      <Link href={`/app/messages/${person.id}-thread`} className="suzi-secondary-btn px-3 py-2 text-xs">
                        DM
                      </Link>
                    }
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-cyan-100/72">
                Room Members
              </p>
              <div className="space-y-3">
                {roomMembers.map((person) => (
                  <PersonRow
                    key={person.id}
                    person={person}
                    compact
                    action={
                      <Link href={`/app/messages/${person.id}-thread`} className="suzi-secondary-btn px-3 py-2 text-xs">
                        DM
                      </Link>
                    }
                  />
                ))}
              </div>
            </div>
          </div>
        </Panel>

        <Panel className="p-5">
          <h2 className="text-[1.35rem] font-semibold tracking-tight text-white">Options</h2>
          <div className="mt-4 grid gap-3">
            <button type="button" className="suzi-secondary-btn px-4 py-3 text-sm">
              Invite friends
            </button>
            <button type="button" className="suzi-secondary-btn px-4 py-3 text-sm">
              Report room
            </button>
          </div>
        </Panel>
      </div>
    </section>
  );
}
