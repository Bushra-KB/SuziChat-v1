import { Panel, SectionHeader } from "@/components/ui/suzi-primitives";

export default function UploadReelPage() {
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
            <div className="aspect-[16/9] rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01)),radial-gradient(circle_at_top,rgba(232,77,255,0.18),transparent_36%),radial-gradient(circle_at_bottom,rgba(82,213,255,0.14),transparent_36%)]" />
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
