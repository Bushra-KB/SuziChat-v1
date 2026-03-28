import Link from "next/link";
import { Chip, Panel, SectionHeader } from "@/components/ui/suzi-primitives";
import { datingProfiles } from "@/lib/v1-mock-data";

export default function DatingPage() {
  return (
    <section className="space-y-6">
      <Panel className="p-6 sm:p-7">
        <SectionHeader
          eyebrow="Dating"
          title="Discover profiles with lower-friction matching"
          copy="Suzi dating stays rooted in rooms and mutual interest, not swipe-first mechanics."
          action={
            <Link href="/app/dating/matches" className="suzi-secondary-btn px-4 py-2.5 text-sm">
              View Matches
            </Link>
          }
        />

        <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_180px_180px_180px]">
          <select className="suzi-input">
            <option>Age range 24-34</option>
            <option>Age range 30-40</option>
          </select>
          <select className="suzi-input">
            <option>Gender: Any</option>
            <option>Women</option>
            <option>Men</option>
          </select>
          <select className="suzi-input">
            <option>Country: All</option>
            <option>United States</option>
            <option>Ireland</option>
            <option>Ethiopia</option>
          </select>
          <select className="suzi-input">
            <option>Sort: Recommended</option>
            <option>Newest</option>
          </select>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {datingProfiles.map((profile) => (
            <article
              key={profile.id}
              className="overflow-hidden rounded-[1.4rem] border border-white/10 bg-[rgba(16,19,38,0.94)]"
            >
              <div className="h-64 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0)),radial-gradient(circle_at_top,rgba(232,77,255,0.18),transparent_45%),radial-gradient(circle_at_bottom,rgba(82,213,255,0.12),transparent_40%)]" />
              <div className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-white">
                      {profile.name}, {profile.age}
                    </p>
                    <p className="text-sm text-slate-400">{profile.location}</p>
                  </div>
                  <Chip tone="pink">Live</Chip>
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-300/78">{profile.headline}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {profile.flags?.map((flag) => (
                    <Chip key={flag} tone="pink">
                      {flag}
                    </Chip>
                  ))}
                </div>
                <div className="mt-5 grid gap-3">
                  <Link href={`/app/dating/${profile.id}`} className="suzi-primary-btn px-4 py-3 text-center text-sm">
                    Interested
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </Panel>
    </section>
  );
}
