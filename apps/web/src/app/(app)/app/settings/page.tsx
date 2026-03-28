import { Chip, Panel, SectionHeader } from "@/components/ui/suzi-primitives";
import { settingsSections } from "@/lib/v1-mock-data";

export default function SettingsPage() {
  return (
    <section className="grid gap-6 xl:grid-cols-[240px_minmax(0,1fr)_320px]">
      <Panel className="p-4">
        <nav className="space-y-2">
          {["Account", "Privacy", "Social", "Appearance", "Notifications", "Language"].map((item, index) => (
            <button
              key={item}
              type="button"
              className={`flex w-full items-center justify-between rounded-[1rem] px-4 py-3 text-left text-sm font-medium transition ${
                index === 1 ? "bg-fuchsia-400/12 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span>{item}</span>
            </button>
          ))}
        </nav>
      </Panel>

      <Panel className="p-6 sm:p-7">
        <SectionHeader
          eyebrow="Settings"
          title="Privacy, safety, appearance, and language"
          copy="This screen keeps V1 control surfaces clean and legible even with the darker hybrid theme."
        />

        <div className="mt-6 space-y-6">
          {settingsSections.map((section) => (
            <div key={section.title}>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-100/62">
                {section.title}
              </p>
              <div className="mt-3 space-y-3">
                {section.items.map((item, index) => (
                  <div key={item} className="flex items-center justify-between gap-4 rounded-[1rem] border border-white/8 bg-white/4 px-4 py-3">
                    <p className="text-sm text-slate-200">{item}</p>
                    <div className={`h-6 w-11 rounded-full border p-1 ${index < 2 ? "border-cyan-300/30 bg-cyan-400/18" : "border-white/12 bg-white/6"}`}>
                      <div className={`h-4 w-4 rounded-full ${index < 2 ? "ml-auto bg-cyan-200" : "bg-slate-400"}`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="p-5">
        <SectionHeader eyebrow="Accessibility" title="UI mode" />
        <div className="mt-5 flex flex-wrap gap-2">
          <Chip active tone="cyan">Reduced transparency</Chip>
          <Chip>Reduced motion</Chip>
          <Chip tone="gold">High contrast</Chip>
        </div>
      </Panel>
    </section>
  );
}
