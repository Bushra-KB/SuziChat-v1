"use client";

import { useEffect, useState } from "react";
import { getStoredAuthSession, type AuthSession } from "@/lib/auth-client";
import { getFriendSummary, type FriendSummary } from "@/lib/friends-client";

const emptySummary: FriendSummary = {
  friends: [],
  incomingRequests: [],
  outgoingRequests: [],
};

const roomCards = [
  { name: "General Chat", subtitle: "Adults talking friendly", action: "Join room" },
  { name: "Music Lounge", subtitle: "Share tunes and chat", action: "Join room" },
  { name: "Late Night Chat", subtitle: "Relaxed conversations after hours", action: "Browse" },
  { name: "Nature Circle", subtitle: "Photos, calm, and outdoor talk", action: "Join room" },
  { name: "Love Stories", subtitle: "Relationship discussion room", action: "Browse" },
  { name: "90s Hangout", subtitle: "Throwback chat and nostalgia", action: "Join room" },
];

const lobbyMessages = [
  "Alan: I’m on table 3 if anyone wants a quick match.",
  "Mary: Looking for someone to test Connect 4.",
  "John: Lobby feels good. Waiting on room 2.",
  "Steve: Anyone free for chess?",
];

export default function AppRoomsPage() {
  const [session] = useState<AuthSession | null>(() => getStoredAuthSession());
  const [summary, setSummary] = useState<FriendSummary>(emptySummary);

  useEffect(() => {
    if (!session) {
      return;
    }

    void getFriendSummary(session.accessToken)
      .then((nextSummary) => {
        setSummary(nextSummary);
      })
      .catch(() => {
        setSummary(emptySummary);
      });
  }, [session]);

  return (
    <section className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)_300px]">
      <aside className="rounded-[2rem] border border-white/18 bg-[linear-gradient(180deg,rgba(88,70,255,0.34),rgba(57,24,121,0.38))] p-5 shadow-[0_0_30px_rgba(117,84,255,0.28),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-xl">
        <p className="text-sm font-medium uppercase tracking-[0.35em] text-cyan-100/78">
          Suzi Friends
        </p>
        <div className="mt-5 space-y-3">
          {summary.friends.length === 0 ? (
            <p className="text-sm text-blue-100/72">
              Add friends to see them alongside the lobby.
            </p>
          ) : (
            summary.friends.slice(0, 8).map((friend) => (
              <div
                key={friend.id}
                className="flex items-center justify-between gap-3 rounded-[1.2rem] border border-white/14 bg-white/8 px-4 py-3 backdrop-blur-md"
              >
                <div>
                  <p className="font-semibold text-white">
                    {friend.displayName || friend.username}
                  </p>
                  <p className="mt-1 text-xs text-blue-100/70">@{friend.username}</p>
                </div>
                <span className="h-3 w-3 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(94,255,178,0.65)]" />
              </div>
            ))
          )}
        </div>
      </aside>

      <div className="rounded-[2rem] border border-white/18 bg-[linear-gradient(180deg,rgba(88,70,255,0.34),rgba(57,24,121,0.38))] p-6 shadow-[0_0_30px_rgba(117,84,255,0.28),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-xl sm:p-8">
        <div className="rounded-[1.5rem] border border-pink-300/40 bg-[linear-gradient(180deg,rgba(231,97,255,0.2),rgba(111,47,255,0.18))] px-6 py-5 text-center shadow-[0_0_28px_rgba(255,69,214,0.22)]">
          <p className="text-sm font-medium uppercase tracking-[0.35em] text-pink-100/78">
            Chat Rooms
          </p>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
            Lobby, chat, cam, and relaxed rooms
          </h1>
        </div>

        <p className="mt-6 text-base leading-8 text-blue-100/78">
          This is the room discovery shell for the authenticated app. It follows
          the same neon-glass layout direction as the client reference, while
          keeping the current branch static and simple.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          {["30s", "90s", "Love", "Nature", "Music", "Sports"].map((chip, index) => {
            const styles = [
              "border-cyan-300/40 bg-cyan-400/14",
              "border-pink-300/40 bg-pink-400/14",
              "border-emerald-300/40 bg-emerald-400/14",
              "border-amber-300/40 bg-amber-400/14",
              "border-violet-300/40 bg-violet-400/14",
              "border-blue-300/40 bg-blue-400/14",
            ];

            return (
              <span
                key={chip}
                className={`rounded-full border px-4 py-2 text-sm font-medium text-white ${styles[index]}`}
              >
                {chip}
              </span>
            );
          })}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {roomCards.map((room) => (
            <div
              key={room.name}
              className="rounded-[1.5rem] border border-white/14 bg-white/8 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-md"
            >
              <p className="text-lg font-semibold text-white">{room.name}</p>
              <p className="mt-2 text-sm leading-6 text-blue-100/74">
                {room.subtitle}
              </p>
              <button
                type="button"
                className="mt-5 rounded-full border border-white/18 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/16"
              >
                {room.action}
              </button>
            </div>
          ))}
        </div>
      </div>

      <aside className="rounded-[2rem] border border-white/18 bg-[linear-gradient(180deg,rgba(255,94,214,0.2),rgba(79,40,149,0.32))] p-5 shadow-[0_0_28px_rgba(255,86,214,0.22),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-xl">
        <p className="text-sm font-medium uppercase tracking-[0.35em] text-cyan-100/78">
          People in Lobby
        </p>
        <div className="mt-4 space-y-3 rounded-[1.3rem] border border-white/12 bg-white/8 p-4">
          {(summary.friends.length > 0 ? summary.friends.slice(0, 4) : [
            { id: "1", username: "Alan", displayName: "Alan" },
            { id: "2", username: "Mary", displayName: "Mary" },
            { id: "3", username: "John", displayName: "John" },
            { id: "4", username: "Steve", displayName: "Steve" },
          ]).map((person) => (
            <div key={person.id} className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-white">
                {person.displayName || person.username}
              </span>
              <span className="h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_8px_rgba(86,208,255,0.55)]" />
            </div>
          ))}
        </div>

        <p className="mt-6 text-sm font-medium uppercase tracking-[0.35em] text-cyan-100/78">
          Lobby Chat
        </p>
        <div className="mt-4 rounded-[1.3rem] border border-white/12 bg-white/8 p-4">
          <div className="space-y-3 text-sm leading-6 text-blue-100/78">
            {lobbyMessages.map((message) => (
              <p key={message}>{message}</p>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <input
              type="text"
              placeholder="Type your message..."
              className="min-w-0 flex-1 rounded-full border border-white/14 bg-white/10 px-4 py-2 text-sm text-white outline-none placeholder:text-blue-100/45"
              disabled
            />
            <button
              type="button"
              disabled
              className="rounded-full border border-pink-300/40 bg-pink-400/18 px-4 py-2 text-sm font-medium text-white/80"
            >
              Send
            </button>
          </div>
        </div>
      </aside>
    </section>
  );
}
