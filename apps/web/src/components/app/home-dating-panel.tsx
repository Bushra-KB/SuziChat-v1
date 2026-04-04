import Link from "next/link";
import { Panel } from "@/components/ui/suzi-primitives";

export function HomeDatingPanel() {
  return (
    <Link href="/app/dating" className="group block">
      <Panel className="relative aspect-square overflow-hidden p-4 transition duration-200 hover:-translate-y-0.5 hover:border-fuchsia-300/55 hover:shadow-[0_0_22px_rgba(255,32,121,0.28)]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(145deg,rgba(54,18,124,0.9),rgba(91,26,151,0.82),rgba(24,10,68,0.88))]" />

        <div className="relative z-10 flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-[0.75rem] border border-cyan-300/30 bg-[linear-gradient(160deg,rgba(88,36,175,0.62),rgba(32,18,88,0.82))] text-fuchsia-100/92 shadow-[0_0_12px_rgba(157,78,221,0.28)]">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-4.5 w-4.5"
              fill="currentColor"
            >
              <path d="M12 21s-7-4.7-9.5-8c-2-2.7-.7-7 3-7 2 0 3.3 1 4.5 2.5C11.2 7 12.5 6 14.5 6c3.7 0 5 4.3 3 7C19 16.3 12 21 12 21Z" />
            </svg>
          </span>
          <p className="text-[1.65rem] font-bold tracking-tight text-white">Suzi Dating</p>
        </div>

        <div className="relative z-10 mt-2 flex flex-col items-center text-center">
          <div className="relative h-[6.5rem] w-[8rem]">
            <span className="absolute left-1 top-0 text-[5.6rem] leading-none text-pink-500 drop-shadow-[0_0_14px_rgba(255,32,121,0.72)]">
              ❤
            </span>
            <span className="absolute left-[3rem] top-[1rem] text-[5.05rem] leading-none text-fuchsia-500 drop-shadow-[0_0_14px_rgba(197,87,255,0.68)]">
              ❤
            </span>
          </div>

          <p className="mt-1 whitespace-nowrap text-[1.42rem] font-semibold leading-[1.08] text-white">Find your match</p>
          <p className="mt-1 text-[0.95rem] leading-[1.35] text-pink-100/88">
            Meet amazing singles near you.
          </p>
        </div>

        <div className="pointer-events-none absolute inset-0">
          <div className="absolute right-8 top-10 h-1.5 w-1.5 rounded-full bg-pink-200/80 shadow-[0_0_16px_rgba(255,32,121,0.85)]" />
          <div className="absolute right-14 top-16 h-1 w-1 rounded-full bg-fuchsia-200/85 shadow-[0_0_14px_rgba(192,132,252,0.8)]" />
          <div className="absolute right-4 top-[5.5rem] h-1 w-1 rounded-full bg-cyan-200/80 shadow-[0_0_12px_rgba(34,211,238,0.75)]" />
          <div className="absolute inset-0 bg-[radial-gradient(36%_40%_at_52%_34%,rgba(255,32,121,0.22),transparent_72%)]" />
        </div>
      </Panel>
    </Link>
  );
}
