import { Chip, Panel, SectionHeader } from "@/components/ui/suzi-primitives";

const languages = ["English", "Irish", "French", "German", "Amharic"];

const privacyToggles = [
  "Show online status",
  "Enable dating profile",
  "Default snaps to friends-only",
  "Allow room invitations from friends",
];

export default function ProfilePage() {
  return (
    <section className="space-y-6">
      <Panel className="p-6 sm:p-7">
        <SectionHeader
          eyebrow="Account Setup"
          title="Profile, preferences, and first-time defaults"
          copy="Keep this page focused on the profile details that affect discovery, room identity, and privacy defaults."
        />
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel className="p-6">
          <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            <div className="rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(232,77,255,0.14),rgba(82,213,255,0.08))] p-5">
              <div className="mx-auto h-36 w-36 rounded-full border border-white/12 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.16),transparent_55%),rgba(255,255,255,0.04)]" />
              <button type="button" className="suzi-secondary-btn mt-5 w-full px-4 py-3 text-sm">
                Upload avatar
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Display Name
                </label>
                <input className="suzi-input" defaultValue="Bushra" />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Headline
                </label>
                <input className="suzi-input" defaultValue="Hybrid social platform builder" />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Bio
                </label>
                <textarea
                  className="suzi-input min-h-32 resize-none"
                  defaultValue="Building SuziChat V1 with rooms, messages, games, snaps, dating, and a cleaner long-term design language."
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Language
                </label>
                <div className="flex flex-wrap gap-2">
                  {languages.map((language, index) => (
                    <Chip key={language} active={index === 0} tone={index === 0 ? "cyan" : "default"}>
                      {language}
                    </Chip>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Panel>

        <Panel className="p-5">
          <SectionHeader eyebrow="Privacy" title="Quick defaults" />
          <div className="mt-5 space-y-3">
            {privacyToggles.map((item, index) => (
              <div key={item} className="flex items-center justify-between gap-4 rounded-[1rem] border border-white/8 bg-white/4 px-4 py-3">
                <p className="text-sm text-slate-200">{item}</p>
                <div className={`h-6 w-11 rounded-full border p-1 ${index < 3 ? "border-cyan-300/30 bg-cyan-400/18" : "border-white/12 bg-white/6"}`}>
                  <div className={`h-4 w-4 rounded-full ${index < 3 ? "ml-auto bg-cyan-200" : "bg-slate-400"}`} />
                </div>
              </div>
            ))}
          </div>
          <button type="button" className="suzi-primary-btn mt-6 w-full px-4 py-3 text-sm">
            Finish profile setup
          </button>
        </Panel>
      </div>
    </section>
  );
}
