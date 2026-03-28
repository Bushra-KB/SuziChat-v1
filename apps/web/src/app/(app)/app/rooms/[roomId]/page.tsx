import Link from "next/link";
import { ChatBubble, PersonRow } from "@/components/app/v1-blocks";
import { Chip, Panel, SectionHeader } from "@/components/ui/suzi-primitives";
import { people, roomMessages, rooms } from "@/lib/v1-mock-data";

export default async function RoomChatPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  const room = rooms.find((entry) => entry.id === roomId) ?? rooms[0];

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <Panel className="flex min-h-[75vh] flex-col p-0">
        <div className="border-b border-white/8 px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.34em] text-cyan-100/64">
                Room Chat
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-white">{room.name}</h1>
              <p className="mt-1 text-sm text-slate-400">{room.description}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Chip tone="cyan">{room.category}</Chip>
              <Chip tone={room.privacy === "Private" ? "pink" : room.privacy === "Friends" ? "cyan" : "default"}>
                {room.privacy}
              </Chip>
              <Link href={`/app/rooms/${room.id}/edit`} className="suzi-secondary-btn px-4 py-2 text-sm">
                Edit
              </Link>
            </div>
          </div>
        </div>

        <div className="suzi-scrollbar flex-1 space-y-4 overflow-y-auto px-6 py-6">
          {roomMessages.map((message) => (
            <ChatBubble key={message.id} {...message} />
          ))}
        </div>

        <div className="border-t border-white/8 px-6 py-5">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_140px]">
            <input
              className="suzi-input"
              placeholder="Write your message, invite a friend, or call out a game table"
            />
            <button type="button" className="suzi-primary-btn px-4 py-3 text-sm">
              Send
            </button>
          </div>
        </div>
      </Panel>

      <div className="space-y-6">
        <Panel className="p-5">
          <SectionHeader eyebrow="Members" title="Room people" />
          <div className="mt-5 space-y-3">
            {people.slice(0, 4).map((person) => (
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
        </Panel>

        <Panel className="p-5">
          <SectionHeader eyebrow="Pinned Info" title="Rules and moderation" />
          <div className="mt-5 space-y-3 text-sm text-slate-300/80">
            <p>Keep room conversations adult, respectful, and aligned with the room purpose.</p>
            <p>Mods can mute, remove, or assign moderator roles from here later.</p>
            <div className="grid gap-3 pt-2">
              <button type="button" className="suzi-secondary-btn px-4 py-3 text-sm">
                Invite friends
              </button>
              <button type="button" className="suzi-secondary-btn px-4 py-3 text-sm">
                Report room
              </button>
            </div>
          </div>
        </Panel>
      </div>
    </section>
  );
}
