import Link from "next/link";
import { SnapCard } from "@/components/app/v1-blocks";
import { Chip, Panel, SectionHeader } from "@/components/ui/suzi-primitives";
import { snaps } from "@/lib/v1-mock-data";

export default function SnapsPage() {
  return (
    <section className="space-y-6">
      <Panel className="p-6 sm:p-7">
        <SectionHeader
          eyebrow="Suzi Snaps"
          title="Photo moments with clean visibility controls"
          copy="Snaps keep the media-first flow, but the UI stays structured and readable instead of fully glassed out."
          action={
            <Link href="/app/snaps/create" className="suzi-primary-btn inline-flex items-center gap-2 px-4 py-2.5 text-sm">
              Create Snap
            </Link>
          }
        />

        <div className="mt-6 flex flex-wrap gap-2">
          <Chip active tone="pink">Public</Chip>
          <Chip tone="cyan">Friends</Chip>
          <Chip>Recent</Chip>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {snaps.map((snap) => (
            <SnapCard key={snap.id} snap={snap} />
          ))}
        </div>
      </Panel>
    </section>
  );
}
