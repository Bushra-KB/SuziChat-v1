import Link from "next/link";
import { Panel, SectionHeader } from "@/components/ui/suzi-primitives";
import { datingProfiles } from "@/lib/v1-mock-data";

export default function MatchesPage() {
  return (
    <section className="space-y-6">
      <Panel className="p-6 sm:p-7">
        <SectionHeader
          eyebrow="Matches"
          title="Mutual interest, ready for chat"
          copy="Matches stay lightweight and route directly into trusted DMs."
        />

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {datingProfiles.map((profile) => (
            <div key={profile.id} className="flex items-center justify-between gap-4 rounded-[1.2rem] border border-white/8 bg-white/4 p-4">
              <div>
                <p className="font-medium text-white">
                  {profile.name}, {profile.age}
                </p>
                <p className="mt-1 text-sm text-slate-400">{profile.location}</p>
              </div>
              <Link href={`/app/messages/${profile.id}-thread`} className="suzi-primary-btn px-4 py-2.5 text-sm">
                Chat
              </Link>
            </div>
          ))}
        </div>
      </Panel>
    </section>
  );
}
