import Link from "next/link";
import { RoomDirectoryCard } from "@/components/app/v1-blocks";
import { Chip, Panel, SectionHeader } from "@/components/ui/suzi-primitives";
import { roomCategories, rooms } from "@/lib/v1-mock-data";

export default function RoomsPage() {
  return (
    <section className="space-y-6">
      <Panel className="p-6 sm:p-7">
        <SectionHeader
          eyebrow="Rooms Directory"
          title="Search, filter, and jump into live spaces"
          copy="Public, friends-only, and private rooms all live in one directory with clearer filtering and moderation context."
          action={
            <Link href="/app/rooms/create" className="suzi-primary-btn inline-flex items-center gap-2 px-4 py-2.5 text-sm">
              Create Room
            </Link>
          }
        />

        <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
              <input className="suzi-input" placeholder="Search rooms by name, category, or member" />
              <select className="suzi-input">
                <option>Sort by trending</option>
                <option>Newest</option>
                <option>Members</option>
              </select>
            </div>

            <div className="flex flex-wrap gap-2">
              {roomCategories.map((category, index) => (
                <Chip key={category} active={index === 0} tone={index === 3 ? "pink" : index === 4 ? "gold" : "default"}>
                  {category}
                </Chip>
              ))}
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              {rooms.map((room) => (
                <RoomDirectoryCard key={room.id} room={room} />
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <Panel className="p-5">
              <SectionHeader eyebrow="Room Info" title="Alex's Party Chat" />
              <div className="mt-5 rounded-[1.3rem] border border-white/10 bg-[linear-gradient(180deg,rgba(232,77,255,0.12),rgba(82,213,255,0.06))] p-5">
                <p className="text-sm leading-7 text-slate-300/80">
                  Cozy after-hours room with mixed voice and text energy, light moderation, and a strong invite culture.
                </p>
                <div className="mt-5 space-y-3 text-sm text-slate-300/78">
                  <div className="flex items-center justify-between">
                    <span>Moderators</span>
                    <span className="text-white">Mary, Nadia</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Privacy</span>
                    <span className="text-white">Friends</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Rules</span>
                    <span className="text-white">Pinned</span>
                  </div>
                </div>
                <div className="mt-5 grid gap-3">
                  <Link href="/app/rooms/general-chat" className="suzi-primary-btn px-4 py-3 text-center text-sm">
                    Open room
                  </Link>
                  <Link href="/app/rooms/general-chat/edit" className="suzi-secondary-btn px-4 py-3 text-center text-sm">
                    Edit room
                  </Link>
                </div>
              </div>
            </Panel>

            <Panel className="p-5">
              <SectionHeader eyebrow="Your limits" title="Room creation quota" />
              <div className="mt-5 rounded-[1.2rem] border border-white/8 bg-white/4 p-4">
                <p className="text-3xl font-semibold text-white">2 / 3</p>
                <p className="mt-2 text-sm text-slate-400">
                  You can keep up to three active rooms at once in V1.
                </p>
              </div>
            </Panel>
          </div>
        </div>
      </Panel>
    </section>
  );
}
