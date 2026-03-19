"use client";

import { useEffect, useState } from "react";
import { getStoredAuthSession, type AuthSession } from "@/lib/auth-client";
import {
  acceptFriendRequest,
  declineFriendRequest,
  getFriendSummary,
  sendFriendRequest,
  unfriend,
  type FriendSummary,
} from "@/lib/friends-client";

const emptySummary: FriendSummary = {
  friends: [],
  incomingRequests: [],
  outgoingRequests: [],
};

export default function AppFriendsPage() {
  const [session] = useState<AuthSession | null>(() => getStoredAuthSession());
  const [summary, setSummary] = useState<FriendSummary>(emptySummary);
  const [identifier, setIdentifier] = useState("");
  const [status, setStatus] = useState<"loading" | "idle" | "submitting" | "error">(
    () => (session ? "loading" : "error"),
  );
  const [message, setMessage] = useState(() =>
    session ? "" : "No active session found.",
  );

  useEffect(() => {
    if (!session) {
      return;
    }

    void getFriendSummary(session.accessToken)
      .then((nextSummary) => {
        setSummary(nextSummary);
        setStatus("idle");
      })
      .catch((error: unknown) => {
        setStatus("error");
        setMessage(
          error instanceof Error ? error.message : "Could not load friends.",
        );
      });
  }, [session]);

  async function refreshSummary(nextMessage?: string) {
    if (!session) {
      return;
    }

    const nextSummary = await getFriendSummary(session.accessToken);
    setSummary(nextSummary);
    setStatus("idle");
    setMessage(nextMessage ?? "");
  }

  async function handleSendRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session) {
      return;
    }

    setStatus("submitting");
    setMessage("");

    try {
      await sendFriendRequest(session.accessToken, identifier);
      setIdentifier("");
      await refreshSummary("Friend request sent.");
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error ? error.message : "Could not send request.",
      );
    }
  }

  async function handleAccept(requestId: string) {
    if (!session) {
      return;
    }

    setStatus("submitting");
    setMessage("");

    try {
      await acceptFriendRequest(session.accessToken, requestId);
      await refreshSummary("Friend request accepted.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Accept failed.");
    }
  }

  async function handleDecline(requestId: string) {
    if (!session) {
      return;
    }

    setStatus("submitting");
    setMessage("");

    try {
      await declineFriendRequest(session.accessToken, requestId);
      await refreshSummary("Friend request declined.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Decline failed.");
    }
  }

  async function handleUnfriend(friendId: string) {
    if (!session) {
      return;
    }

    setStatus("submitting");
    setMessage("");

    try {
      await unfriend(session.accessToken, friendId);
      await refreshSummary("Friend removed.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Remove failed.");
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <div className="rounded-[2rem] border border-white/18 bg-[linear-gradient(180deg,rgba(88,70,255,0.34),rgba(57,24,121,0.38))] p-6 shadow-[0_0_30px_rgba(117,84,255,0.28),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-xl sm:p-8">
        <p className="text-sm font-medium uppercase tracking-[0.35em] text-pink-100/78">
          Friends
        </p>
        <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">
          Build your social circle
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-8 text-blue-100/78">
          This foundation supports requests, incoming approvals, outgoing
          requests, and unfriending. Use username or email to send a request.
        </p>

        <form className="mt-8 flex flex-col gap-3 sm:flex-row" onSubmit={handleSendRequest}>
          <input
            type="text"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            placeholder="friend username or email"
            className="flex-1 rounded-[1.35rem] border border-white/15 bg-white/10 px-4 py-3 text-white outline-none backdrop-blur-md placeholder:text-blue-100/45"
          />
          <button
            type="submit"
            className="rounded-full border border-pink-300/45 bg-[linear-gradient(90deg,rgba(246,94,219,0.8),rgba(114,76,255,0.85))] px-5 py-3 text-base font-semibold text-white shadow-[0_0_28px_rgba(255,86,214,0.28)] transition hover:brightness-110"
          >
            {status === "submitting" ? "Sending..." : "Add friend"}
          </button>
        </form>

        {message ? (
          <p
            className={`mt-5 text-sm ${
              status === "error" ? "text-amber-100/90" : "text-cyan-100/85"
            }`}
          >
            {message}
          </p>
        ) : null}

        <div className="mt-8 grid gap-4">
          <div className="rounded-[1.4rem] border border-white/14 bg-white/8 p-5 backdrop-blur-md">
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-100/70">
              Incoming requests
            </p>
            <div className="mt-4 space-y-3">
              {summary.incomingRequests.length === 0 ? (
                <p className="text-sm text-blue-100/68">No incoming requests yet.</p>
              ) : (
                summary.incomingRequests.map((request) => (
                  <div
                    key={request.id}
                    className="rounded-[1.1rem] border border-white/12 bg-white/8 px-4 py-4"
                  >
                    <p className="font-semibold text-white">
                      {request.user.displayName || request.user.username}
                    </p>
                    <p className="mt-1 text-sm text-blue-100/72">
                      @{request.user.username}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => void handleAccept(request.id)}
                        className="rounded-full border border-cyan-300/35 bg-cyan-400/14 px-4 py-2 text-sm font-medium text-white"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDecline(request.id)}
                        className="rounded-full border border-white/18 bg-white/10 px-4 py-2 text-sm font-medium text-white"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[1.4rem] border border-white/14 bg-white/8 p-5 backdrop-blur-md">
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-100/70">
              Outgoing requests
            </p>
            <div className="mt-4 space-y-3">
              {summary.outgoingRequests.length === 0 ? (
                <p className="text-sm text-blue-100/68">No outgoing requests.</p>
              ) : (
                summary.outgoingRequests.map((request) => (
                  <div
                    key={request.id}
                    className="rounded-[1.1rem] border border-white/12 bg-white/8 px-4 py-4"
                  >
                    <p className="font-semibold text-white">
                      {request.user.displayName || request.user.username}
                    </p>
                    <p className="mt-1 text-sm text-blue-100/72">
                      Pending approval
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <aside className="rounded-[2rem] border border-white/18 bg-[linear-gradient(180deg,rgba(255,94,214,0.2),rgba(79,40,149,0.32))] p-6 shadow-[0_0_28px_rgba(255,86,214,0.22),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-xl">
        <p className="text-sm font-medium uppercase tracking-[0.35em] text-cyan-100/78">
          Current Friends
        </p>
        <div className="mt-5 space-y-3">
          {summary.friends.length === 0 ? (
            <p className="text-sm text-blue-100/72">No friends added yet.</p>
          ) : (
            summary.friends.map((friend) => (
              <div
                key={friend.id}
                className="rounded-[1.2rem] border border-white/14 bg-white/8 px-4 py-4 backdrop-blur-md"
              >
                <p className="font-semibold text-white">
                  {friend.displayName || friend.username}
                </p>
                <p className="mt-1 text-sm text-blue-100/72">@{friend.username}</p>
                <button
                  type="button"
                  onClick={() => void handleUnfriend(friend.id)}
                  className="mt-3 rounded-full border border-white/18 bg-white/10 px-4 py-2 text-sm font-medium text-white"
                >
                  Unfriend
                </button>
              </div>
            ))
          )}
        </div>
      </aside>
    </section>
  );
}
