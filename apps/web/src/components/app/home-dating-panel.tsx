"use client";

import Image from "next/image";
import Link from "next/link";
import { useId } from "react";
import { listL2, listActionPrimary, panelTitle } from "@/components/app/home-typography";
import { cx } from "@/components/ui/suzi-primitives";

const datingAvatars = [
  { src: "/ppic/ppic1.jpeg", alt: "Suzi member 1" },
  { src: "/ppic/ppic2.png", alt: "Suzi member 2" },
  { src: "/ppic/ppic3.jpg", alt: "Suzi member 3" },
];

/** Symmetric heart — sharp bottom point, no balloon tail. */
const HEART_PATH =
  "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z";

function DatingHeartsBackdrop() {
  const uid = useId().replace(/:/g, "");
  const solidGlowId = `dating-heart-solid-glow-${uid}`;
  const outlineGlowId = `dating-heart-outline-glow-${uid}`;

  return (
    <div className="suzi-dating-hearts pointer-events-none relative z-[1] flex min-h-0 w-full flex-1" aria-hidden="true">
      <div className="suzi-dating-hearts__cluster">
        <div className="suzi-dating-hearts__group">
          <div
          className="absolute left-1/2 top-1/2 h-[8.5rem] w-[11rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,45,167,0.5)_0%,rgba(157,78,221,0.2)_48%,transparent_72%)] blur-[5px]"
          aria-hidden
        />

        <svg
          viewBox="0 0 24 24"
          className="suzi-dating-hearts__solid absolute left-0 top-1/2 z-[1] -translate-y-[56%] -rotate-[20deg]"
          style={{ filter: `url(#${solidGlowId})` }}
        >
          <defs>
            <filter id={solidGlowId} x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="2.4" result="blur" />
              <feColorMatrix
                in="blur"
                type="matrix"
                values="1 0 0 0 0  0 0.2 0 0 0  0 0 0.5 0 0  0 0 0 0.72 0"
                result="glow"
              />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
            <path d={HEART_PATH} fill="#d4187f" />
          </svg>

          <svg
            viewBox="0 0 24 24"
            className="suzi-dating-hearts__outline absolute top-1/2 z-[2] -translate-y-[50%] rotate-[14deg]"
            style={{ filter: `url(#${outlineGlowId})`, left: "var(--dating-heart-outline-left)" }}
          >
            <defs>
            <filter id={outlineGlowId} x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feColorMatrix
                in="blur"
                type="matrix"
                values="1 0 0 0 0  0 0.15 0 0 0  0 0 0.35 0 0  0 0 0 0.62 0"
                result="glow"
              />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path
            d={HEART_PATH}
            fill="none"
            stroke="#ff6ec8"
            strokeWidth="1.2"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

export function HomeDatingPanel() {
  return (
    <Link
      href="/app/dating"
      aria-label="Open Suzi Dating"
      className="suzi-panel group relative flex h-full min-h-0 flex-col overflow-hidden p-[var(--panel-pad-tight)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400/60"
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(54,18,124,0.92),rgba(91,26,151,0.84),rgba(24,10,68,0.9))]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_70%_at_50%_55%,rgba(255,32,121,0.28),transparent_68%)]" />

      <div className="relative z-10 flex shrink-0 items-center gap-2">
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[0.7rem] border border-pink-300/40 bg-[linear-gradient(160deg,rgba(157,78,221,0.7),rgba(54,18,124,0.85))] text-pink-200 shadow-[0_0_12px_rgba(255,45,167,0.32)]">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
            <path d={HEART_PATH} />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className={cx(panelTitle, "truncate")}>Suzi Dating</p>
          <p className={cx(listL2, "truncate leading-tight text-pink-100/82")}>Find your match nearby</p>
        </div>
      </div>

      <DatingHeartsBackdrop />

      <div className="relative z-10 mt-auto flex shrink-0 items-center justify-between gap-2">
        <span
          className={cx(
            listActionPrimary,
            "shrink-0 border-fuchsia-200/52 bg-[linear-gradient(90deg,#ff2da7,#ce2fff)] px-3 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_0_12px_rgba(255,45,167,0.45)] transition group-hover:brightness-110",
          )}
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
