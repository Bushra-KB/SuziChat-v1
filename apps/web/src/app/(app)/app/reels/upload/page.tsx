import { Panel, SectionHeader } from "@/components/ui/suzi-primitives";
import { reels } from "@/lib/v1-mock-data";

export default function UploadReelPage() {
  const previewReel = reels[0];

  return (
    <section className="flex justify-center">
      <Panel className="w-full max-w-4xl p-6 sm:p-7">
        <SectionHeader
          eyebrow="Upload Reel"
          title="Trim, caption, and prepare a short reel"
          copy="V1 keeps upload simple: short clip, caption, visibility, post."
        />

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            <div className="relative aspect-[16/9] overflow-hidden rounded-[1.5rem] border border-white/10">
              <video
                src={previewReel.video}
                className="h-full w-full object-cover"
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                aria-label="Reel preview"
              />
              <div className={`absolute inset-0 bg-[linear-gradient(180deg,rgba(10,12,24,0.05),rgba(10,12,24,0.28))] ${previewReel.tone}`} />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Trim clip
              </label>
              <div className="rounded-[1rem] border border-white/8 bg-white/4 px-4 py-3 text-sm text-slate-300">
                Timeline trim placeholder up to 30 seconds
              </div>
            </div>
            <textarea className="suzi-input min-h-28 resize-none" placeholder="Caption your reel" />
          </div>

          <div className="space-y-5">
            <button type="button" className="suzi-primary-btn w-full px-4 py-3 text-sm">
              Post Reel
            </button>
            <button type="button" className="suzi-secondary-btn w-full px-4 py-3 text-sm">
              Save draft
            </button>
          </div>
        </div>
      </Panel>
    </section>
  );
}
