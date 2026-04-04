"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Panel, StatusDot, cx } from "@/components/ui/suzi-primitives";
import { people } from "@/lib/v1-mock-data";

type FriendsTab = "all" | "online" | "requests";

const requestUserIds = new Set(["john", "nadia"]);

function getTabClasses(active: boolean) {
  return cx(
    "inline-flex shrink-0 items-center gap-1.5 rounded-[0.7rem] border px-2 py-2 text-[0.98rem] font-medium leading-none transition",
    active
      ? "border-fuchsia-300/46 bg-[linear-gradient(90deg,rgba(157,78,221,0.86),rgba(255,32,121,0.72))] text-white shadow-[0_0_16px_rgba(255,32,121,0.24)]"
      : "border-cyan-300/22 bg-[rgba(23,16,71,0.62)] text-cyan-100/84 hover:border-cyan-300/38 hover:text-white",
  );
}

function getDisplayName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) {
    return parts[0] ?? name;
  }

  return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
}

export function HomeFriendsPanel() {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<FriendsTab>("all");

  const requestFriends = useMemo(() => people.filter((person) => requestUserIds.has(person.id)), []);

  const filteredPeople = useMemo(() => {
    const baseList =
      activeTab === "online"
        ? people.filter((person) => person.status === "online")
        : activeTab === "requests"
          ? requestFriends
          : people;

    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return baseList;
    }

    return baseList.filter((person) =>
      `${person.name} ${person.handle} ${person.location ?? ""}`
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [activeTab, query, requestFriends]);

  return (
    <Panel className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(157,78,221,0.26)] text-fuchsia-200/95 shadow-[0_0_14px_rgba(157,78,221,0.3)]">
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
              <path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5H7a3 3 0 0 0-3 3V20" />
              <circle cx="9" cy="8" r="3" />
              <path d="M20 20v-1a2.8 2.8 0 0 0-2.1-2.7" />
              <path d="M16.5 5.5a2.5 2.5 0 0 1 0 5" />
            </svg>
          </span>
          <h2 className="text-[1.65rem] font-bold tracking-tight text-white">Friends</h2>
        </div>

        <Link href="/app/friends" className="text-[1.05rem] font-medium text-fuchsia-200/90 transition hover:text-fuchsia-100">
          See all
        </Link>
      </div>

      <div className="mt-4 space-y-3">
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3 inline-flex items-center text-cyan-100/60">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-4.5 w-4.5"
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
            className="h-11 w-full rounded-[0.8rem] border border-cyan-300/24 bg-[linear-gradient(95deg,rgba(36,22,101,0.62),rgba(24,14,76,0.7))] py-2 pl-9 pr-12 text-[1.1rem] text-cyan-50/96 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] placeholder:text-cyan-100/48 focus:border-fuchsia-300/52 focus:outline-none focus:ring-2 focus:ring-fuchsia-400/24"
            placeholder="Search friends..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />

          <button
            type="button"
            aria-label="Search friends"
            className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center rounded-r-[0.8rem] border-l border-cyan-300/24 text-fuchsia-200/84 transition hover:text-fuchsia-100"
          >
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
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.2-3.2" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button type="button" className={getTabClasses(activeTab === "all")} onClick={() => setActiveTab("all")}>
            All
          </button>
          <button type="button" className={getTabClasses(activeTab === "online")} onClick={() => setActiveTab("online")}>
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,255,178,0.8)]" />
            Online
          </button>
          <button
            type="button"
            className={getTabClasses(activeTab === "requests")}
            onClick={() => setActiveTab("requests")}
          >
            Requests
            <span className="inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-pink-500 px-1 text-[0.62rem] font-semibold leading-none text-white">
              {requestFriends.length}
            </span>
          </button>
        </div>
      </div>

      <div className="suzi-scrollbar mt-4 h-[24rem] space-y-2 overflow-y-auto pr-1">
        {filteredPeople.length > 0 ? (
          filteredPeople.map((person) => (
            <Link
              key={person.id}
              href={`/app/messages/${person.id}-thread`}
              className="flex items-center gap-3 rounded-[1rem] border border-cyan-300/18 bg-[linear-gradient(160deg,rgba(32,20,89,0.72),rgba(18,13,65,0.56))] px-3 py-2.5 transition hover:border-cyan-300/44 hover:bg-[linear-gradient(160deg,rgba(45,27,115,0.74),rgba(24,16,82,0.64))]"
            >
              <Image
                src={person.avatar}
                alt={person.name}
                width={44}
                height={44}
                className="h-11 w-11 rounded-full border border-white/14 object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-[1.1rem] font-semibold leading-tight text-white">{getDisplayName(person.name)}</p>
                  <StatusDot status={person.status} />
                </div>
                <p className="mt-1 truncate text-[0.9rem] leading-none text-cyan-100/66">
                  {person.location ?? person.handle}
                </p>
              </div>
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-[0.8rem] border border-fuchsia-300/22 bg-[linear-gradient(150deg,rgba(86,30,173,0.54),rgba(46,17,111,0.74))] text-cyan-100/88 transition hover:border-fuchsia-300/42 hover:text-white">
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
                  <path d="M4 6h16v10H8l-4 4V6Z" />
                </svg>
              </span>
            </Link>
          ))
        ) : (
          <div className="flex h-full items-center rounded-[0.9rem] border border-cyan-300/16 bg-[rgba(17,12,58,0.54)] px-3 py-4 text-sm text-cyan-100/70">
            No friends match this filter.
          </div>
        )}
      </div>
    </Panel>
  );
}
