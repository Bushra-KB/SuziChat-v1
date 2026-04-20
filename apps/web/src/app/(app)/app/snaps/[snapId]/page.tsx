import Image from "next/image";
import { Panel, SectionHeader } from "@/components/ui/suzi-primitives";
import { getPost } from "@/lib/posts-client";
import { apiPostToSnap } from "@/lib/post-ui-mappers";
import { snaps } from "@/lib/v1-mock-data";
import type { Snap } from "@/lib/v1-mock-data";

function SnapMedia({ src, alt, className }: { src: string; alt: string; className?: string }) {
  if (src.startsWith("/")) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(min-width: 1280px) 70vw, 100vw"
        className={className}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={`absolute inset-0 h-full w-full object-cover ${className ?? ""}`} />
  );
}

async function resolveSnap(snapId: string): Promise<Snap> {
  try {
    const post = await getPost(snapId);
    if (post.kind === "SNAP") {
      return apiPostToSnap(post);
    }
  } catch {
    // fall through to catalog
  }
  return snaps.find((entry) => entry.id === snapId) ?? snaps[0];
}

export default async function SnapDetailPage({
  params,
}: {
  params: Promise<{ snapId: string }>;
}) {
  const { snapId } = await params;
  const snap = await resolveSnap(snapId);

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Panel className="overflow-hidden p-0">
        <div className="relative aspect-[4/3] overflow-hidden">
          <SnapMedia src={snap.image} alt={`${snap.title} snap`} className="object-cover" />
          <div className={`pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(10,12,24,0.03),rgba(10,12,24,0.22))] ${snap.tone}`} />
        </div>
        <div className="border-t border-white/8 px-6 py-5">
          <p className="text-xl font-semibold text-white">{snap.author}</p>
          <p className="mt-2 text-sm leading-7 text-slate-300/80">{snap.caption}</p>
        </div>
      </Panel>

      <Panel className="p-5">
        <SectionHeader eyebrow="Comments" title="Community response" />
        <div className="mt-5 space-y-3">
          {["Beautiful light on this one.", "That color balance is so clean.", "Need the room link for this vibe."].map((comment) => (
            <div key={comment} className="rounded-[1rem] border border-white/8 bg-white/4 p-4 text-sm text-slate-300/80">
              {comment}
            </div>
          ))}
        </div>
        <textarea className="suzi-input mt-5 min-h-24 resize-none" placeholder="Add a comment..." />
      </Panel>
    </section>
  );
}
