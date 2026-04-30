import { Chip, Panel, SectionHeader } from "@/components/ui/suzi-primitives";
import { adminReports, adminRoomRows, adminStats } from "@/lib/v1-mock-data";

export default function AdminPage() {
  return (
    <section className="suzi-app-frame-fill">
      <div className="suzi-app-frame-scroll suzi-scrollbar space-y-6 pr-1">
      <Panel className="p-6 sm:p-7">
        <SectionHeader
          eyebrow="Admin Panel"
          title="Moderation, rooms, users, and reports"
          copy="The admin area stays in the same design system but uses denser data tables and lower decorative glow."
        />
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {adminStats.map((item) => (
            <div key={item.label} className="rounded-[1.4rem] border border-white/10 bg-white/4 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                {item.label}
              </p>
              <p className="mt-3 text-3xl font-semibold text-white">{item.value}</p>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Panel className="p-5">
          <SectionHeader eyebrow="Users + Rooms" title="Operational view" />
          <div className="mt-5 overflow-hidden rounded-[1.2rem] border border-white/8">
            <div className="grid grid-cols-[1.3fr_1fr_0.9fr_0.9fr] gap-3 border-b border-white/8 bg-white/4 px-4 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              <span>Name</span>
              <span>Email</span>
              <span>Role</span>
              <span>Status</span>
            </div>
            {adminRoomRows.map((row) => (
              <div key={row.name} className="grid grid-cols-[1.3fr_1fr_0.9fr_0.9fr] gap-3 border-b border-white/8 px-4 py-3 text-sm text-slate-300/82 last:border-b-0">
                <span className="font-medium text-white">{row.name}</span>
                <span className="truncate">{row.email}</span>
                <span>{row.role}</span>
                <span>
                  <Chip tone={row.status === "Flagged" ? "gold" : "cyan"}>{row.status}</Chip>
                </span>
              </div>
            ))}
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel className="p-5">
            <SectionHeader eyebrow="Reports Queue" title="Recent moderation items" />
            <div className="mt-5 space-y-3">
              {adminReports.map((report) => (
                <div key={report.title} className="rounded-[1.1rem] border border-white/8 bg-white/4 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-medium text-white">{report.title}</p>
                    <Chip tone={report.severity === "High" ? "pink" : "gold"}>{report.severity}</Chip>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">
                    {report.area} · Reporter: {report.reporter}
                  </p>
                  <div className="mt-4 flex gap-2">
                    <button type="button" className="suzi-secondary-btn px-3 py-2 text-xs">
                      Review
                    </button>
                    <button type="button" className="suzi-primary-btn px-3 py-2 text-xs">
                      Action
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="p-5">
            <SectionHeader eyebrow="Content" title="Moderation detail" />
            <div className="mt-5 rounded-[1.2rem] border border-white/8 bg-white/4 p-4 text-sm leading-7 text-slate-300/80">
              Review snaps, reels, comments, and room incidents from one consistent moderation surface.
            </div>
          </Panel>
        </div>
      </div>
      </div>
    </section>
  );
}
