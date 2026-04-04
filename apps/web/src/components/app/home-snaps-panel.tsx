import Image from "next/image";
import Link from "next/link";
import { Panel } from "@/components/ui/suzi-primitives";
import { snaps } from "@/lib/v1-mock-data";

function getViews(likes: number, comments: number) {
  return likes + comments * 4;
}

const trendingItems = [
  { snapId: "sunset-walk", title: "Dreamy sunset", author: "Lena Rose", count: 124 },
  { snapId: "city-lights", title: "Coffee time", author: "Priya", count: 89 },
  { snapId: "night-friends", title: "Night motion", author: "Marco", count: 154 },
  { snapId: "ocean-view", title: "Ocean calm", author: "Aoife", count: 76 },
  { snapId: "sunset-walk", title: "City twilight", author: "Lena Rose", count: 112 },
  { snapId: "city-lights", title: "Late snack", author: "Priya", count: 98 },
];

export function HomeSnapsPanel() {
  const popularSnaps = [...snaps].sort((left, right) => right.likes - left.likes).slice(0, 4);

  return (
    <Panel className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-[0.75rem] border border-cyan-300/30 bg-[linear-gradient(160deg,rgba(88,36,175,0.62),rgba(32,18,88,0.82))] text-fuchsia-100/92 shadow-[0_0_12px_rgba(157,78,221,0.28)]">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-4.5 w-4.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 8a2 2 0 0 1 2-2h2l1.2-1.6A2 2 0 0 1 10.8 4h2.4a2 2 0 0 1 1.6.8L16 6h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z" />
              <circle cx="12" cy="13" r="3.2" />
            </svg>
          </span>
          <h2 className="text-[1.65rem] font-bold tracking-tight text-white">Suzi Snaps</h2>
        </div>

        <Link href="/app/snaps" className="text-[1.05rem] font-medium text-fuchsia-200/90 transition hover:text-fuchsia-100">
          Open feed
        </Link>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {popularSnaps.map((snap) => (
          <Link
            key={snap.id}
            href={`/app/snaps/${snap.id}`}
            className="group relative overflow-hidden rounded-[0.82rem] border border-fuchsia-300/24 bg-[rgba(28,16,72,0.7)]"
          >
            <div className="relative aspect-square">
              <Image src={snap.image} alt={snap.title} fill sizes="(min-width: 1280px) 10vw, 45vw" className="object-cover transition duration-200 group-hover:scale-[1.04]" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,8,26,0.12),rgba(4,8,26,0.64))]" />
            </div>
            <div className="absolute inset-x-2 bottom-2 flex items-center justify-between text-[0.95rem] font-semibold text-white">
              <span className="inline-flex items-center gap-1.5">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
                  <circle cx="12" cy="12" r="2.5" />
                </svg>
                {getViews(snap.likes, snap.comments)}
              </span>
              <span className="inline-flex items-center gap-1.5 text-pink-100">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-3.5 w-3.5"
                  fill="currentColor"
                >
                  <path d="M12 21s-7-4.7-9.5-8c-2-2.7-.7-7 3-7 2 0 3.3 1 4.5 2.5C11.2 7 12.5 6 14.5 6c3.7 0 5 4.3 3 7C19 16.3 12 21 12 21Z" />
                </svg>
                {snap.likes}
              </span>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-4 rounded-[1rem] border border-cyan-300/20 bg-[linear-gradient(160deg,rgba(24,14,72,0.72),rgba(16,10,56,0.72))] p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2">
            <span className="text-[1rem]">🔥</span>
            <p className="text-[1.1rem] font-semibold text-white">Trending Snaps</p>
          </div>
          <Link href="/app/snaps" className="text-sm font-medium text-fuchsia-200/86 transition hover:text-white">
            See all
          </Link>
        </div>

        <div className="suzi-scrollbar mt-3 h-36 space-y-2 overflow-y-auto pr-1">
          {trendingItems.map((item, index) => {
            const snap = snaps.find((entry) => entry.id === item.snapId) ?? snaps[index % snaps.length];
            return (
              <Link
                key={`${item.title}-${index}`}
                href={`/app/snaps/${snap.id}`}
                className="flex items-center gap-2.5 rounded-[0.75rem] border border-cyan-300/14 bg-[rgba(20,13,62,0.56)] px-2.5 py-2 transition hover:border-cyan-300/32"
              >
                <Image
                  src={snap.avatar}
                  alt={item.author}
                  width={34}
                  height={34}
                  className="h-8.5 w-8.5 rounded-full border border-white/20 object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.95rem] font-medium text-white">{item.title}</p>
                  <p className="truncate text-[0.82rem] text-cyan-100/64">By {item.author}</p>
                </div>
                <p className="inline-flex items-center gap-1 text-[0.88rem] font-semibold text-cyan-100/80">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
                    <circle cx="12" cy="12" r="2.5" />
                  </svg>
                  {item.count}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}
