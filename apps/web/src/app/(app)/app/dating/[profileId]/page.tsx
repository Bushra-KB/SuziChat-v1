import Link from "next/link";
import { Chip, Panel, SectionHeader } from "@/components/ui/suzi-primitives";
import { datingProfiles } from "@/lib/v1-mock-data";

export default async function DatingProfilePage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  const { profileId } = await params;
  const profile = datingProfiles.find((entry) => entry.id === profileId) ?? datingProfiles[0];

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Panel className="overflow-hidden p-0">
        <div className="h-[22rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01)),radial-gradient(circle_at_top,rgba(232,77,255,0.22),transparent_36%),radial-gradient(circle_at_bottom,rgba(82,213,255,0.16),transparent_36%)]" />
        <div className="p-6 sm:p-7">
          <SectionHeader
            eyebrow="Profile Detail"
            title={`${profile.name}, ${profile.age}`}
            copy={profile.location}
          />
          <p className="mt-5 text-base leading-8 text-slate-200/82">{profile.bio}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {profile.flags?.map((flag) => (
              <Chip key={flag} tone="pink">
                {flag}
              </Chip>
            ))}
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button type="button" className="suzi-primary-btn px-4 py-3 text-sm">
              Interested
            </button>
            <button type="button" className="suzi-secondary-btn px-4 py-3 text-sm">
              Report / Block
            </button>
          </div>
        </div>
      </Panel>

      <Panel className="p-5">
        <SectionHeader eyebrow="Match Flow" title="Next actions" />
        <div className="mt-5 space-y-3 text-sm text-slate-300/80">
          <p>If interest is mutual, SuziChat unlocks a direct match and routes the connection into DMs.</p>
          <p>The magenta accent stays reserved for key dating actions and match moments.</p>
        </div>
        <Link href="/app/dating/matches" className="suzi-primary-btn mt-6 block px-4 py-3 text-center text-sm">
          View matches
        </Link>
      </Panel>
    </section>
  );
}
