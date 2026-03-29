import Image from "next/image";
import { Chip, Panel, SectionHeader } from "@/components/ui/suzi-primitives";
import { snaps } from "@/lib/v1-mock-data";

export default function CreateSnapPage() {
  const previewSnap = snaps[0];

  return (
    <section className="flex justify-center">
      <Panel className="w-full max-w-3xl p-6 sm:p-7">
        <SectionHeader
          eyebrow="Create Snap"
          title="Post a photo with light editing and visibility control"
          copy="V1 keeps this flow focused: upload, caption, choose visibility, publish."
        />

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-5">
            <div className="rounded-[1.5rem] border border-dashed border-white/12 bg-white/4 p-5">
              <div className="relative h-72 overflow-hidden rounded-[1.2rem] border border-white/8">
                <Image
                  src={previewSnap.image}
                  alt="Snap preview"
                  fill
                  sizes="(min-width: 1024px) 40vw, 100vw"
                  className="object-cover"
                />
                <div className={`absolute inset-0 bg-[linear-gradient(180deg,rgba(10,12,24,0.04),rgba(10,12,24,0.16))] ${previewSnap.tone}`} />
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button type="button" className="suzi-secondary-btn px-4 py-2.5 text-sm">
                  Change photo
                </button>
                <button type="button" className="suzi-secondary-btn px-4 py-2.5 text-sm">
                  Crop
                </button>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Caption
              </label>
              <textarea className="suzi-input min-h-28 resize-none" placeholder="Best night. The crowd was live." />
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Visibility
              </label>
              <div className="flex flex-wrap gap-2">
                <Chip active tone="pink">Public</Chip>
                <Chip tone="cyan">Friends Only</Chip>
              </div>
            </div>
            <button type="button" className="suzi-primary-btn w-full px-4 py-3 text-sm">
              Post Snap
            </button>
          </div>
        </div>
      </Panel>
    </section>
  );
}
