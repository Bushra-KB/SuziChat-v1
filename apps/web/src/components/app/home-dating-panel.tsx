import Image from "next/image";
import Link from "next/link";

const datingAvatars = [
  { src: "/ppic/ppic1.jpeg", alt: "Suzi member 1" },
  { src: "/ppic/ppic2.png", alt: "Suzi member 2" },
  { src: "/ppic/ppic3.jpg", alt: "Suzi member 3" },
];

export function HomeDatingPanel() {
  return (
    <Link
      href="/app/dating"
      aria-label="Open Suzi Dating"
      className="suzi-panel group relative flex h-full min-h-0 flex-col justify-between gap-1.5 overflow-hidden p-[var(--panel-pad-tight)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400/60"
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(54,18,124,0.92),rgba(91,26,151,0.84),rgba(24,10,68,0.9))]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(46%_85%_at_88%_50%,rgba(255,32,121,0.32),transparent_72%)]" />

      <div className="relative z-10 flex min-w-0 shrink-0 items-center gap-2">
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[0.7rem] border border-pink-300/40 bg-[linear-gradient(160deg,rgba(157,78,221,0.7),rgba(54,18,124,0.85))] text-pink-200 shadow-[0_0_12px_rgba(255,45,167,0.32)]">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
            <path d="M12 21s-7-4.7-9.5-8c-2-2.7-.7-7 3-7 2 0 3.3 1 4.5 2.5C11.2 7 12.5 6 14.5 6c3.7 0 5 4.3 3 7C19 16.3 12 21 12 21Z" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[var(--fs-sm)] font-bold leading-tight tracking-tight text-white">Suzi Dating</p>
          <p className="truncate text-[var(--fs-2xs)] leading-tight text-pink-100/82">Find your match nearby</p>
        </div>
      </div>

      <div className="relative z-10 flex shrink-0 items-center justify-between gap-2">
        <span
          className="inline-flex shrink-0 items-center justify-center rounded-full border border-fuchsia-200/52 bg-[linear-gradient(90deg,#ff2da7,#ce2fff)] px-3 text-[var(--fs-2xs)] font-semibold text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_0_12px_rgba(255,45,167,0.45)] transition group-hover:brightness-110"
          style={{ height: "var(--btn-h-sm)" }}
        >
          Explore
        </span>
        <div className="flex shrink-0 items-center -space-x-1.5">
          {datingAvatars.map((person) => (
            <span
              key={person.src}
              className="relative inline-block overflow-hidden rounded-full border-2 border-[rgba(46,18,116,0.95)] bg-[rgba(20,13,62,0.6)]"
              style={{ width: "var(--avatar-sm)", height: "var(--avatar-sm)" }}
            >
              <Image src={person.src} alt={person.alt} fill sizes="32px" className="object-cover" />
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
