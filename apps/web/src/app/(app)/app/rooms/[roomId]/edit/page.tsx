import Image from "next/image";
import { Chip, Panel, SectionHeader } from "@/components/ui/suzi-primitives";
import { rooms } from "@/lib/v1-mock-data";

export default async function EditRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  const room = rooms.find((entry) => entry.id === roomId) ?? rooms[0];

  return (
    <section className="space-y-6">
      <Panel className="p-6 sm:p-7">
        <SectionHeader
          eyebrow="Edit Room"
          title={`Refine ${room.name}`}
          copy="Use the same structure as room creation, but keep the moderation and member experience stable while you adjust the room."
        />

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Room name
              </label>
              <input className="suzi-input" defaultValue={room.name} />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Description
              </label>
              <textarea className="suzi-input min-h-36 resize-none" defaultValue={room.description} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Chip active tone={room.privacy === "Public" ? "default" : "cyan"}>
                Public
              </Chip>
              <Chip active={room.privacy === "Friends"} tone="cyan">
                Friends
              </Chip>
              <Chip active={room.privacy === "Private"} tone="pink">
                Private
              </Chip>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" className="suzi-primary-btn px-5 py-3 text-sm">
                Save changes
              </button>
              <button type="button" className="suzi-secondary-btn px-5 py-3 text-sm">
                Cancel
              </button>
            </div>
          </div>

          <Panel className="p-5">
            <SectionHeader eyebrow="Live State" title="Current visibility" />
            <div className="relative mt-5 h-40 overflow-hidden rounded-[1.2rem] border border-white/10">
              <Image
                src={room.coverImage}
                alt={`${room.name} cover`}
                fill
                sizes="320px"
                className="object-cover"
              />
              <div className={`absolute inset-0 bg-[linear-gradient(180deg,rgba(10,12,24,0.08),rgba(10,12,24,0.44))] ${room.coverTone}`} />
            </div>
            <div className="mt-5 space-y-3 text-sm text-slate-300/80">
              <div className="flex items-center justify-between rounded-[1rem] border border-white/8 bg-white/4 px-4 py-3">
                <span>Privacy</span>
                <span className="text-white">{room.privacy}</span>
              </div>
              <div className="flex items-center justify-between rounded-[1rem] border border-white/8 bg-white/4 px-4 py-3">
                <span>Members</span>
                <span className="text-white">{room.members}</span>
              </div>
              <div className="flex items-center justify-between rounded-[1rem] border border-white/8 bg-white/4 px-4 py-3">
                <span>Active now</span>
                <span className="text-white">{room.activeNow}</span>
              </div>
            </div>
          </Panel>
        </div>
      </Panel>
    </section>
  );
}
