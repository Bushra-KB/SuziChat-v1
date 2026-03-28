import Link from "next/link";
import { PersonRow } from "@/components/app/v1-blocks";
import { Chip, Panel, SectionHeader } from "@/components/ui/suzi-primitives";
import { people } from "@/lib/v1-mock-data";

const requests = [
  { from: "Catherine", note: "Found you in Music Lounge" },
  { from: "Jake", note: "Mutual rooms + dating discover" },
];

const blocked = [
  { name: "Spammer_44", reason: "Repeated room invites" },
  { name: "NightPing", reason: "Persistent unwanted DM" },
];

export default function FriendsPage() {
  const spotlight = people[1];

  return (
    <section className="space-y-6">
      <Panel className="p-6 sm:p-7">
        <SectionHeader
          eyebrow="Friends"
          title="Friends, requests, and trusted contacts"
          copy="Mutual friendships stay central to DMs, room invites, and private game lobbies."
        />

        <div className="mt-6 flex flex-wrap gap-2">
          <Chip active tone="pink">Friends</Chip>
          <Chip tone="cyan">Requests</Chip>
          <Chip>Blocked</Chip>
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_360px]">
        <div className="space-y-6">
          <Panel className="p-5">
            <SectionHeader eyebrow="Friends List" title="Your mutual circle" />
            <div className="mt-5 space-y-3">
              {people.map((person) => (
                <PersonRow
                  key={person.id}
                  person={person}
                  subtitle={person.headline}
                  action={
                    <div className="flex items-center gap-2">
                      <Link href={`/app/messages/${person.id}-thread`} className="suzi-secondary-btn px-3 py-2 text-xs">
                        DM
                      </Link>
                      <Link href={`/app/games/chess?invite=${person.id}`} className="suzi-secondary-btn px-3 py-2 text-xs">
                        Invite
                      </Link>
                    </div>
                  }
                />
              ))}
            </div>
          </Panel>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel className="p-5">
              <SectionHeader eyebrow="Requests" title="Pending friend requests" />
              <div className="mt-5 space-y-3">
                {requests.map((request) => (
                  <div key={request.from} className="rounded-[1rem] border border-white/8 bg-white/4 p-4">
                    <p className="font-medium text-white">{request.from}</p>
                    <p className="mt-1 text-sm text-slate-400">{request.note}</p>
                    <div className="mt-4 flex gap-2">
                      <button type="button" className="suzi-primary-btn px-4 py-2 text-xs">
                        Accept
                      </button>
                      <button type="button" className="suzi-secondary-btn px-4 py-2 text-xs">
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel className="p-5">
              <SectionHeader eyebrow="Safety" title="Blocked users" />
              <div className="mt-5 space-y-3">
                {blocked.map((entry) => (
                  <div key={entry.name} className="rounded-[1rem] border border-white/8 bg-white/4 p-4">
                    <p className="font-medium text-white">{entry.name}</p>
                    <p className="mt-1 text-sm text-slate-400">{entry.reason}</p>
                    <button type="button" className="suzi-secondary-btn mt-4 px-4 py-2 text-xs">
                      Unblock
                    </button>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>

        <Panel className="p-5">
          <SectionHeader eyebrow="Profile Preview" title={spotlight.name} />
          <div className="mt-5 rounded-[1.4rem] border border-white/10 bg-[linear-gradient(180deg,rgba(232,77,255,0.16),rgba(82,213,255,0.08))] p-5">
            <p className="text-sm text-slate-300/84">{spotlight.location}</p>
            <p className="mt-4 text-2xl font-semibold text-white">{spotlight.headline}</p>
            <p className="mt-4 text-sm leading-7 text-slate-300/80">{spotlight.bio}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {spotlight.flags?.map((flag) => (
                <Chip key={flag} tone="cyan">
                  {flag}
                </Chip>
              ))}
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Link href={`/app/messages/${spotlight.id}-thread`} className="suzi-primary-btn px-4 py-3 text-center text-sm">
                Send message
              </Link>
              <Link href={`/app/rooms/general-chat?invite=${spotlight.id}`} className="suzi-secondary-btn px-4 py-3 text-center text-sm">
                Invite to room
              </Link>
            </div>
          </div>
        </Panel>
      </div>
    </section>
  );
}
