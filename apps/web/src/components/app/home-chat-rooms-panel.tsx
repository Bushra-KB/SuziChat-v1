"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Panel, cx } from "@/components/ui/suzi-primitives";

type RoomCategory =
  | "Hobbies"
  | "Music"
  | "Sports"
  | "Chill"
  | "Dating"
  | "Media"
  | "Travel";

type HomeRoom = {
  id: string;
  name: string;
  emoji?: string;
  summary: string;
  detail?: string;
  online: number;
  image: string;
  category: RoomCategory;
  featured?: boolean;
};

const primaryCategories = ["All", "Hobbies", "Music", "Sports", "Chill"] as const;
const extraCategories: RoomCategory[] = ["Dating", "Media", "Travel"];

const homeRooms: HomeRoom[] = [
  {
    id: "general-chat",
    name: "Lobby - Chat - Cam - Relaxed",
    emoji: "📌",
    summary: "Adults chatting friendly",
    detail: "Be kind and have fun.",
    online: 142,
    image: "/random/r0.jpg",
    category: "Hobbies",
    featured: true,
  },
  {
    id: "music-lounge",
    name: "Music Lounge",
    summary: "Share tunes & chat",
    online: 98,
    image: "/random/r1.png",
    category: "Music",
  },
  {
    id: "late-night-chat",
    name: "Late Night Chat",
    emoji: "🌙",
    summary: "18+ only · Good vibes",
    online: 76,
    image: "/random/r2.png",
    category: "Chill",
  },
  {
    id: "gaming-hangout",
    name: "Gamers Unite",
    summary: "Games, chill, good vibes",
    online: 64,
    image: "/random/r3.jpeg",
    category: "Sports",
  },
  {
    id: "movie-nights",
    name: "Deep Conversations",
    summary: "Thoughtful talks",
    online: 42,
    image: "/random/r4.png",
    category: "Dating",
  },
  {
    id: "chill-zone",
    name: "Chill Zone",
    summary: "Relax, talk, unwind",
    online: 38,
    image: "/random/r5.png",
    category: "Chill",
  },
  {
    id: "anime-manga",
    name: "Anime & Manga",
    summary: "Fans united",
    online: 31,
    image: "/random/r6.jpg",
    category: "Media",
  },
  {
    id: "global-hangout",
    name: "Global Hangout",
    summary: "Meet people worldwide",
    online: 29,
    image: "/random/r7.png",
    category: "Travel",
  },
];

function getTabClasses(active: boolean) {
  return cx(
    "inline-flex shrink-0 items-center rounded-[0.78rem] border px-3 py-2 text-[0.95rem] font-medium leading-none transition",
    active
      ? "border-fuchsia-300/50 bg-[linear-gradient(90deg,rgba(157,78,221,0.95),rgba(255,32,121,0.85))] text-white shadow-[0_0_16px_rgba(255,32,121,0.28)]"
      : "border-cyan-300/20 bg-[rgba(26,18,74,0.66)] text-cyan-100/78 hover:border-cyan-300/36 hover:text-white",
  );
}

export function HomeChatRoomsPanel() {
  const [activeCategory, setActiveCategory] = useState<"All" | RoomCategory>("All");
  const [query, setQuery] = useState("");
  const [showMoreCategories, setShowMoreCategories] = useState(false);
  const moreCategoriesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (
        moreCategoriesRef.current &&
        !moreCategoriesRef.current.contains(event.target as Node)
      ) {
        setShowMoreCategories(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const filteredRooms = useMemo(() => {
    const byCategory =
      activeCategory === "All"
        ? homeRooms
        : homeRooms.filter((room) => room.category === activeCategory);

    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return byCategory;
    }

    return byCategory.filter((room) =>
      `${room.name} ${room.summary} ${room.detail ?? ""} ${room.category}`
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [activeCategory, query]);

  const moreCategoryActive =
    activeCategory !== "All" &&
    extraCategories.includes(activeCategory as RoomCategory);

  return (
    <Panel className="overflow-hidden p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
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
              <path d="M5 7.5h14a2 2 0 0 1 2 2V15a2 2 0 0 1-2 2h-7l-4 3v-3H7a2 2 0 0 1-2-2V7.5Z" />
              <path d="M10 12h.01M13 12h.01M16 12h.01" />
            </svg>
          </span>
          <h2 className="text-[1.65rem] font-bold tracking-tight text-white">Suzi Chat Rooms</h2>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/app/rooms/create"
            className="inline-flex items-center rounded-full border border-fuchsia-200/44 bg-[linear-gradient(90deg,#ff2da7,#ce2fff)] px-4 py-1.5 text-[0.85rem] font-semibold text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_0_14px_rgba(255,45,167,0.56),0_8px_22px_rgba(101,24,194,0.45)] transition hover:brightness-110"
          >
            Create Room
          </Link>
          <Link href="/app" className="text-sm font-medium text-cyan-100/78 transition hover:text-white">
            See all
          </Link>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="suzi-scrollbar flex min-w-0 items-center gap-2 overflow-x-auto pb-1 pr-1">
            {primaryCategories.map((category) => (
              <button
                key={category}
                type="button"
                className={getTabClasses(activeCategory === category)}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>

          <div className={cx("relative shrink-0 pb-1", showMoreCategories && "z-30")} ref={moreCategoriesRef}>
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={showMoreCategories}
              className={getTabClasses(showMoreCategories || moreCategoryActive)}
              onClick={() => setShowMoreCategories((value) => !value)}
            >
              ...
            </button>
            {showMoreCategories ? (
              <div className="absolute right-0 top-[calc(100%+0.2rem)] z-30 min-w-[9rem] rounded-[0.8rem] border border-cyan-300/30 bg-[linear-gradient(160deg,rgba(24,14,72,0.98),rgba(18,11,56,0.96))] p-1 shadow-[0_10px_24px_rgba(8,6,34,0.55)]">
                {extraCategories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    className={cx(
                      "flex w-full items-center rounded-[0.58rem] px-2.5 py-1.5 text-left text-sm transition",
                      activeCategory === category
                        ? "bg-fuchsia-500/24 text-white"
                        : "text-cyan-100/84 hover:bg-cyan-400/10 hover:text-white",
                    )}
                    onClick={() => {
                      setActiveCategory(category);
                      setShowMoreCategories(false);
                    }}
                  >
                    {category}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <label className="relative w-full sm:ml-auto sm:w-60">
          <span className="pointer-events-none absolute inset-y-0 left-3 inline-flex items-center text-cyan-100/58">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.85"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.2-3.2" />
            </svg>
          </span>
          <input
            className="h-10 w-full rounded-[0.8rem] border border-cyan-300/24 bg-[linear-gradient(95deg,rgba(36,22,101,0.62),rgba(24,14,76,0.7))] py-2 pl-9 pr-4 text-[0.95rem] text-cyan-50/94 placeholder:text-cyan-100/45 focus:border-fuchsia-300/52 focus:outline-none focus:ring-2 focus:ring-fuchsia-400/24"
            placeholder="Search rooms..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>

      <div className="suzi-scrollbar mt-4 h-[36rem] overflow-y-auto rounded-[1.15rem] border border-cyan-300/22 bg-transparent">
        {filteredRooms.length > 0 ? (
          filteredRooms.map((room, index) => (
            <article
              key={room.id}
              className={cx(
                "flex items-center gap-3.5 px-3 py-3 sm:px-4 sm:py-3.5",
                index > 0 && "border-t border-cyan-300/12",
              )}
            >
              <Link href={`/app/rooms/${room.id}`} className="relative h-20 w-24 shrink-0 overflow-hidden rounded-[0.85rem] border border-cyan-300/24">
                <Image src={room.image} alt={`${room.name} cover`} fill sizes="120px" className="object-cover" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,8,26,0.05),rgba(4,8,26,0.42))]" />
              </Link>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Link
                    href={`/app/rooms/${room.id}`}
                    className="truncate text-[1.1rem] font-semibold leading-tight text-white transition hover:text-cyan-50"
                  >
                    {room.name}
                    {room.emoji ? ` ${room.emoji}` : ""}
                  </Link>
                  {room.featured ? (
                    <span className="inline-flex items-center rounded-full bg-fuchsia-500/86 px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-white">
                      Featured
                    </span>
                  ) : null}
                </div>

                <p className="mt-1 truncate text-[0.95rem] text-cyan-50/86">{room.summary}</p>
                {room.detail ? (
                  <p className="mt-1 truncate text-[0.88rem] text-cyan-100/64">{room.detail}</p>
                ) : null}
              </div>

              <div className="ml-auto flex items-center gap-3">
                <p className="inline-flex items-center gap-2 text-[0.95rem] text-cyan-100/76">
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(92,255,190,0.78)]" />
                  {room.online} online
                </p>

                <Link
                  href={`/app/rooms/${room.id}`}
                  className={cx(
                    "inline-flex h-10 min-w-10 items-center justify-center rounded-[0.8rem] border text-[1rem] font-semibold transition",
                    room.featured
                      ? "border-fuchsia-300/45 bg-[linear-gradient(90deg,rgba(157,78,221,0.8),rgba(255,32,121,0.76))] px-3 text-white hover:border-fuchsia-200/72"
                      : "border-fuchsia-300/28 bg-[rgba(67,28,155,0.52)] text-cyan-100/92 hover:border-fuchsia-300/50",
                  )}
                >
                  {room.featured ? "Join" : "+"}
                </Link>
              </div>
            </article>
          ))
        ) : (
          <div className="flex h-full items-center justify-center px-4 text-sm text-cyan-100/66">
            No rooms match this filter.
          </div>
        )}
      </div>
    </Panel>
  );
}
