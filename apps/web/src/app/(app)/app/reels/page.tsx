import Image from "next/image";
import Link from "next/link";
import { ReelCard } from "@/components/app/v1-blocks";
import { Panel, SectionHeader } from "@/components/ui/suzi-primitives";
import { reels } from "@/lib/v1-mock-data";

export default function ReelsPage() {
  const featured = reels[0];

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <Panel className="p-6 sm:p-7">
        <SectionHeader
          eyebrow="Reels"
          title="Short vertical video with cleaner interaction rails"
          copy="The feed stays mobile-first, but the web layout keeps the viewer and comments organized."
          action={
            <Link href="/app/reels/upload" className="suzi-primary-btn inline-flex items-center gap-2 px-4 py-2.5 text-sm">
              Upload Reel
            </Link>
          }
        />

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {reels.map((reel) => (
            <ReelCard key={reel.id} reel={reel} />
          ))}
        </div>
      </Panel>

      <Panel className="p-5">
        <SectionHeader eyebrow="Featured" title={featured.author} />
        <div className="relative mt-5 aspect-[9/14] overflow-hidden rounded-[1.5rem] border border-white/10">
          <Image
            src={featured.poster}
            alt={`${featured.author} featured reel`}
            fill
            sizes="(min-width: 1280px) 24vw, 100vw"
            className="object-cover"
          />
          <div className={`absolute inset-0 bg-[linear-gradient(180deg,rgba(10,12,24,0.06),rgba(10,12,24,0.38))] ${featured.tone}`} />
        </div>
        <p className="mt-4 text-sm leading-7 text-slate-300/80">{featured.caption}</p>
        <div className="mt-4 text-sm text-slate-400">
          {featured.likes} likes · {featured.comments} comments
        </div>
      </Panel>
    </section>
  );
}
