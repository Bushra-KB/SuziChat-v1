import Image from "next/image";
import { Chip, Panel, SectionHeader } from "@/components/ui/suzi-primitives";
import { rooms } from "@/lib/v1-mock-data";

export default function CreateRoomPage() {
  const previewRoom = rooms[0];

  return (
    <section className="space-y-6">
      <Panel className="p-6 sm:p-7">
        <SectionHeader
          eyebrow="Create Room"
          title="Build a room with clear privacy and category rules"
          copy="Rooms stay simple in V1: clear identity, good invites, and easy moderation context."
        />

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Room Name
                </label>
                <input className="suzi-input" placeholder="Movie Nights" />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Category
                </label>
                <select className="suzi-input">
                  <option>Media</option>
                  <option>Social</option>
                  <option>Dating</option>
                  <option>Games</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Description
              </label>
              <textarea
                className="suzi-input min-h-36 resize-none"
                placeholder="Describe the room tone, rules, and who should join."
              />
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Privacy
                </label>
                <div className="flex flex-wrap gap-2">
                  <Chip active tone="default">Public</Chip>
                  <Chip tone="cyan">Friends</Chip>
                  <Chip tone="pink">Private</Chip>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Active rooms
                </label>
                <div className="rounded-[1rem] border border-white/8 bg-white/4 px-4 py-3 text-sm text-slate-300">
                  You currently have <span className="font-medium text-white">2 / 3</span> active rooms.
                </div>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Invite friends
              </label>
              <input className="suzi-input" placeholder="Search friends to invite into the room" />
            </div>

            <div className="flex flex-wrap gap-3">
              <button type="button" className="suzi-primary-btn px-5 py-3 text-sm">
                Save room
              </button>
              <button type="button" className="suzi-secondary-btn px-5 py-3 text-sm">
                Preview
              </button>
            </div>
          </div>

          <Panel className="p-5">
            <SectionHeader eyebrow="Cover Preview" title="How this room will feel" />
            <div className="relative mt-5 h-56 overflow-hidden rounded-[1.4rem] border border-white/10">
              <Image
                src={previewRoom.coverImage}
                alt="Room cover preview"
                fill
                sizes="320px"
                className="object-cover"
              />
              <div className={`absolute inset-0 bg-[linear-gradient(180deg,rgba(10,12,24,0.08),rgba(10,12,24,0.44))] ${previewRoom.coverTone}`} />
            </div>
            <div className="mt-5 space-y-3 text-sm text-slate-300/80">
              <p>Use cover art that fits the room tone instead of overwhelming neon.</p>
              <p>Keep category and privacy obvious so members understand the room fast.</p>
            </div>
          </Panel>
        </div>
      </Panel>
    </section>
  );
}
