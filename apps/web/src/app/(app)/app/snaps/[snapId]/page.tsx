import { Panel, SectionHeader } from "@/components/ui/suzi-primitives";
import { snaps } from "@/lib/v1-mock-data";

export default async function SnapDetailPage({
  params,
}: {
  params: Promise<{ snapId: string }>;
}) {
  const { snapId } = await params;
  const snap = snaps.find((entry) => entry.id === snapId) ?? snaps[0];

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Panel className="overflow-hidden p-0">
        <div className={`aspect-[4/3] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] ${snap.tone}`} />
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
