import Image from "next/image";
import Link from "next/link";
import type { Person } from "@/lib/v1-mock-data";
import { Chip, Panel, SectionHeader, StatusDot, cx } from "@/components/ui/suzi-primitives";

export function MemberProfileView({
  person,
  viewerIsSelfHint,
}: {
  person: Person;
  viewerIsSelfHint?: boolean;
}) {
  return (
    <section className="space-y-6">
      <Panel className="overflow-hidden p-0">
        <div className="relative h-36 bg-[linear-gradient(145deg,rgba(88,36,175,0.55),rgba(18,24,72,0.72))] sm:h-44">
          <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(rgba(255,255,255,0.35)_1px,transparent_1px)] [background-size:24px_24px]" />
        </div>
        <div className="relative px-6 pb-7 pt-0 sm:px-8">
          <div className="-mt-14 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
              <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-[1.35rem] border border-white/14 bg-[rgba(12,10,40,0.96)] shadow-[0_12px_40px_rgba(15,23,42,0.45)] sm:h-32 sm:w-32">
                <Image src={person.avatar} alt={`${person.name} avatar`} fill sizes="128px" className="object-cover" />
              </div>
              <div className="min-w-0 pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{person.name}</h1>
                  {person.status ? <StatusDot status={person.status} /> : null}
                  {viewerIsSelfHint ? (
                    <span className="rounded-full border border-cyan-300/35 bg-cyan-400/14 px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-cyan-100">
                      You
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm font-medium text-cyan-100/72">{person.handle}</p>
                {person.location ? (
                  <p className="mt-1 text-sm text-[var(--text-muted)]">{person.location}</p>
                ) : null}
                {person.role ? (
                  <p className="mt-3 text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-pink-100/70">
                    {person.role}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <Link href="/app/messages" className="suzi-primary-btn px-4 py-2.5 text-sm">
                Message
              </Link>
              <Link href="/app/profile" className="suzi-secondary-btn px-4 py-2.5 text-sm">
                My profile
              </Link>
            </div>
          </div>

          {person.headline ? (
            <p className="mt-6 text-lg font-semibold leading-relaxed text-white">{person.headline}</p>
          ) : null}
          {person.bio ? (
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-muted)]">{person.bio}</p>
          ) : null}

          {person.flags && person.flags.length > 0 ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {person.flags.map((flag) => (
                <Chip key={flag} tone="cyan">
                  {flag}
                </Chip>
              ))}
            </div>
          ) : null}
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel className="p-5 sm:p-6">
          <SectionHeader eyebrow="Rooms" title="Often in" copy="Community presence is mock data in V1." />
          <div className="mt-5 space-y-3 text-sm text-[var(--text-muted)]">
            <p>Room history and mutual rooms will appear here once the backend links social graph data.</p>
          </div>
        </Panel>
        <Panel className="p-5 sm:p-6">
          <SectionHeader eyebrow="Social" title="Snaps & reels" copy="Preview how this profile shows up across SuziChat." />
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/app/snaps" className={cx("suzi-secondary-btn px-4 py-2.5 text-sm")}>
              View snaps feed
            </Link>
            <Link href="/app/reels" className="suzi-secondary-btn px-4 py-2.5 text-sm">
              View reels
            </Link>
          </div>
        </Panel>
      </div>
    </section>
  );
}
