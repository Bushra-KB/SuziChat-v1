"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DatingChatModal } from "@/components/app/dating/dating-chat-modal";
import { DatingDiscoverDeck } from "@/components/app/dating/dating-discover-deck";
import { DatingFiltersSidebar, type DatingFilters } from "@/components/app/dating/dating-filters-sidebar";
import { DatingLikesModal } from "@/components/app/dating/dating-likes-modal";
import { DatingMatchToast } from "@/components/app/dating/dating-match-toast";
import { DatingMatchesModal } from "@/components/app/dating/dating-matches-modal";
import { DatingProfileModal, type DatingProfileDraft } from "@/components/app/dating/dating-profile-modal";
import { filtersFromProfile } from "@/components/app/dating/dating-utils";
import { Panel, SectionHeader } from "@/components/ui/suzi-primitives";
import { getStoredAuthSession } from "@/lib/auth-client";
import {
  type DatingDiscoverItem,
  type DatingMatchRow,
  type DatingMessageRow,
  type DatingProfilePayload,
  deleteDatingMatch,
  discoverDating,
  datingSwipe,
  getDatingUserProfile,
  getMyDatingProfile,
  listDatingLikesReceived,
  listDatingMatches,
  listDatingMessages,
  sendDatingMessage,
  upsertMyDatingProfile,
} from "@/lib/dating-client";
import { blockPerson } from "@/lib/friends-client";
import { getRealtimeSocket } from "@/lib/realtime-client";

export function DatingHub() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [deck, setDeck] = useState<DatingDiscoverItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [myProfile, setMyProfile] = useState<(DatingProfilePayload & { interests: string[] }) | null>(null);
  const [matches, setMatches] = useState<DatingMatchRow[]>([]);
  const [likesReceived, setLikesReceived] = useState<DatingDiscoverItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<DatingFilters>(filtersFromProfile(null));
  const [matchToast, setMatchToast] = useState<string | null>(null);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewProfile, setPreviewProfile] = useState<
    (DatingProfilePayload & { interests: string[]; user: DatingDiscoverItem["user"] }) | null
  >(null);
  const [showMatchesModal, setShowMatchesModal] = useState(false);
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatMatchId, setChatMatchId] = useState<string | null>(null);
  const [chatPeer, setChatPeer] = useState<DatingMatchRow["peer"] | null>(null);
  const [messages, setMessages] = useState<DatingMessageRow[]>([]);
  const [chatDraft, setChatDraft] = useState("");
  const [peerTyping, setPeerTyping] = useState(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [profileDraft, setProfileDraft] = useState<DatingProfileDraft>({
    age: "",
    gender: "",
    headline: "",
    datingBio: "",
    interests: "",
    photoUrl: "",
    minAgePref: "18",
    maxAgePref: "99",
    seekGender: "any",
    isDiscoverable: true,
  });

  const discoverParams = useMemo(
    () => ({
      minAge: filters.minAge,
      maxAge: filters.maxAge,
      gender: filters.gender === "any" ? undefined : filters.gender,
      country: filters.country.trim() || undefined,
      search: filters.search.trim() || undefined,
    }),
    [filters],
  );

  const refreshMatches = useCallback(async (token: string) => {
    try {
      const { matches: rows } = await listDatingMatches(token);
      setMatches(rows);
    } catch {
      // ignore
    }
  }, []);

  const refreshLikes = useCallback(async (token: string) => {
    try {
      const { items } = await listDatingLikesReceived(token);
      setLikesReceived(items);
    } catch {
      setLikesReceived([]);
    }
  }, []);

  const loadDiscover = useCallback(
    async (token: string, opts?: { append?: boolean; skip?: number }) => {
      setError("");
      const skip = opts?.skip ?? 0;
      try {
        const { items } = await discoverDating(token, {
          ...discoverParams,
          take: 36,
          skip,
        });
        if (opts?.append) {
          setDeck((prev) => {
            const seen = new Set(prev.map((x) => x.userId));
            return [...prev, ...items.filter((x) => !seen.has(x.userId))];
          });
        } else {
          setDeck(items);
          setActiveIndex(0);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load discover.");
        if (!opts?.append) {
          setDeck([]);
        }
      }
    },
    [discoverParams],
  );

  useEffect(() => {
    const session = getStoredAuthSession();
    const token = session?.accessToken ?? null;
    setAccessToken(token);
    setCurrentUserId(session?.user?.id ?? null);
    if (!token) {
      return;
    }
    void (async () => {
      try {
        const { profile } = await getMyDatingProfile(token);
        const typed = profile as typeof myProfile;
        setMyProfile(typed);
        if (typed) {
          setFilters(filtersFromProfile(typed));
          await loadDiscover(token);
        }
        await Promise.all([refreshMatches(token), refreshLikes(token)]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load dating.");
      }
    })();
  }, [loadDiscover, refreshMatches, refreshLikes]);

  useEffect(() => {
    const panel = searchParams.get("panel");
    const view = searchParams.get("view");
    if (panel === "matches") {
      setShowMatchesModal(true);
    }
    if (panel === "likes") {
      setShowLikesModal(true);
    }
    if (view) {
      void (async () => {
        const session = getStoredAuthSession();
        if (!session?.accessToken) {
          return;
        }
        try {
          const data = await getDatingUserProfile(session.accessToken, view);
          if (data.profile) {
            setPreviewProfile(
              data.profile as DatingProfilePayload & {
                interests: string[];
                user: DatingDiscoverItem["user"];
              },
            );
            setShowPreviewModal(true);
          }
        } catch {
          // ignore
        }
      })();
    }
  }, [searchParams]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    const socket = getRealtimeSocket(accessToken);
    const onMatch = (payload: { peer?: { user?: { displayName?: string | null; username?: string } } }) => {
      const name =
        payload?.peer?.user?.displayName?.trim() ||
        payload?.peer?.user?.username ||
        "someone";
      setMatchToast(name);
      void refreshMatches(accessToken);
      void refreshLikes(accessToken);
    };
    const onMessage = (payload: { matchId?: string; message?: DatingMessageRow }) => {
      if (!payload?.matchId || !payload.message) {
        return;
      }
      if (payload.matchId === chatMatchId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === payload.message!.id)) {
            return prev;
          }
          return [...prev, payload.message!];
        });
      }
      void refreshMatches(accessToken);
    };
    const onTyping = (payload: { matchId?: string; typing?: boolean }) => {
      if (payload?.matchId === chatMatchId) {
        setPeerTyping(Boolean(payload.typing));
      }
    };
    const onUnmatch = (payload: { matchId?: string }) => {
      if (payload?.matchId === chatMatchId) {
        setShowChatModal(false);
        setChatMatchId(null);
        setChatPeer(null);
      }
      void refreshMatches(accessToken);
    };
    socket.on("dating:match", onMatch);
    socket.on("dating:message", onMessage);
    socket.on("dating:typing", onTyping);
    socket.on("dating:unmatch", onUnmatch);
    return () => {
      socket.off("dating:match", onMatch);
      socket.off("dating:message", onMessage);
      socket.off("dating:typing", onTyping);
      socket.off("dating:unmatch", onUnmatch);
    };
  }, [accessToken, chatMatchId, refreshMatches, refreshLikes]);

  const openProfileEditor = () => {
    const p = myProfile;
    setProfileDraft({
      age: p?.age != null ? String(p.age) : "",
      gender: p?.gender ?? "",
      headline: p?.headline ?? "",
      datingBio: p?.datingBio ?? "",
      interests: (p?.interests ?? []).join(", "),
      photoUrl: p?.photoUrl ?? "",
      minAgePref: String(p?.minAgePref ?? 18),
      maxAgePref: String(p?.maxAgePref ?? 99),
      seekGender: p?.seekGender ?? "any",
      isDiscoverable: p?.isDiscoverable ?? true,
    });
    setShowProfileModal(true);
  };

  const saveProfile = async () => {
    if (!accessToken) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const interests = profileDraft.interests
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 24);
      const { profile } = await upsertMyDatingProfile(accessToken, {
        age: profileDraft.age ? Number.parseInt(profileDraft.age, 10) : undefined,
        gender: profileDraft.gender || undefined,
        headline: profileDraft.headline || undefined,
        datingBio: profileDraft.datingBio || undefined,
        interests,
        photoUrl: profileDraft.photoUrl || undefined,
        minAgePref: Number.parseInt(profileDraft.minAgePref, 10) || 18,
        maxAgePref: Number.parseInt(profileDraft.maxAgePref, 10) || 99,
        seekGender: profileDraft.seekGender,
        isDiscoverable: profileDraft.isDiscoverable,
      });
      const next = { ...profile, interests: profile.interests ?? [] };
      setMyProfile(next);
      setFilters(filtersFromProfile(next));
      setShowProfileModal(false);
      await loadDiscover(accessToken);
      await Promise.all([refreshMatches(accessToken), refreshLikes(accessToken)]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  const rotateBy = useCallback(
    (step: number) => {
      if (deck.length === 0) {
        return;
      }
      setActiveIndex((i) => (i + step + deck.length) % deck.length);
    },
    [deck.length],
  );

  const refillDeck = useCallback(
    (token: string, currentLen: number) => {
      void discoverDating(token, { ...discoverParams, take: 28, skip: currentLen })
        .then(({ items }) => {
          setDeck((d) => {
            const seen = new Set(d.map((x) => x.userId));
            const merged = [...d, ...items.filter((x) => !seen.has(x.userId))];
            return merged;
          });
        })
        .catch(() => {});
    },
    [discoverParams],
  );

  const runSwipe = async (targetUserId: string, action: "LIKE" | "PASS") => {
    if (!accessToken) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await datingSwipe(accessToken, { toUserId: targetUserId, action });
      if (res.matched && res.match) {
        const peerName =
          res.match.peer.user.displayName?.trim() || res.match.peer.user.username;
        setMatchToast(peerName);
        await refreshMatches(accessToken);
      }
      setLikesReceived((prev) => prev.filter((x) => x.userId !== targetUserId));
      setDeck((prev) => {
        const removeAt = prev.findIndex((x) => x.userId === targetUserId);
        if (removeAt === -1) {
          return prev;
        }
        const next = prev.filter((_, i) => i !== removeAt);
        setActiveIndex((cur) => {
          if (removeAt < cur) {
            return Math.max(0, cur - 1);
          }
          if (removeAt === cur) {
            return Math.min(cur, Math.max(0, next.length - 1));
          }
          return cur;
        });
        if (next.length <= 5) {
          refillDeck(accessToken, next.length);
        }
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  };

  const onInterested = () => {
    const card = deck[activeIndex];
    if (card) {
      void runSwipe(card.userId, "LIKE");
    }
  };

  const onPass = () => {
    const card = deck[activeIndex];
    if (card) {
      void runSwipe(card.userId, "PASS");
    }
  };

  const openChat = async (row: DatingMatchRow) => {
    if (!accessToken) {
      return;
    }
    setShowMatchesModal(false);
    setMatchToast(null);
    setChatMatchId(row.id);
    setChatPeer(row.peer);
    setShowChatModal(true);
    setPeerTyping(false);
    setChatDraft("");
    try {
      const { messages: rows } = await listDatingMessages(accessToken, row.id);
      setMessages(rows);
    } catch {
      setMessages([]);
    }
  };

  const sendChat = async () => {
    if (!accessToken || !chatMatchId || !chatDraft.trim()) {
      return;
    }
    const body = chatDraft.trim();
    setChatDraft("");
    try {
      const { message } = await sendDatingMessage(accessToken, chatMatchId, body);
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Send failed.");
    }
  };

  const emitTyping = (typing: boolean) => {
    if (!accessToken || !chatMatchId) {
      return;
    }
    getRealtimeSocket(accessToken).emit("dating:typing", { matchId: chatMatchId, typing });
  };

  const onChatInput = (value: string) => {
    setChatDraft(value);
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
    emitTyping(true);
    typingTimerRef.current = setTimeout(() => emitTyping(false), 1200);
  };

  const unmatch = async (matchId: string) => {
    if (!accessToken) {
      return;
    }
    setBusy(true);
    try {
      await deleteDatingMatch(accessToken, matchId);
      await refreshMatches(accessToken);
      if (matchId === chatMatchId) {
        setShowChatModal(false);
        setChatMatchId(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unmatch failed.");
    } finally {
      setBusy(false);
    }
  };

  const blockActiveCard = async () => {
    const card = deck[activeIndex];
    if (!accessToken || !card) {
      return;
    }
    setBusy(true);
    try {
      await blockPerson(accessToken, card.userId);
      await loadDiscover(accessToken);
      await refreshMatches(accessToken);
      await refreshLikes(accessToken);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Block failed.");
    } finally {
      setBusy(false);
    }
  };

  const matchCount = matches.length;
  const likesCount = likesReceived.length;
  const activeCard = deck[activeIndex] ?? null;

  if (!accessToken) {
    return (
      <section className="suzi-app-frame-fill">
        <div className="suzi-app-frame-scroll suzi-scrollbar pr-1">
          <Panel className="p-6 sm:p-7">
            <SectionHeader
              eyebrow="Dating"
              title="Sign in to use Suzi Dating"
              copy="Create a profile, discover people, show interest, match, and chat."
              action={
                <Link href="/login" className="suzi-primary-btn px-4 py-2.5 text-sm">
                  Sign in
                </Link>
              }
            />
          </Panel>
        </div>
      </section>
    );
  }

  return (
    <section className="suzi-app-frame-fill suzi-dating-page">
      <div className="suzi-app-frame-scroll suzi-scrollbar pr-1">
        <Panel className="border-fuchsia-300/22 p-4 shadow-none sm:p-5 [background:transparent]">
          <SectionHeader
            eyebrow="Dating"
            title="Suzi Dating"
            copy="Browse profiles, show interest, match, and chat — filters use your saved preferences by default."
            action={
              <div className="flex flex-wrap gap-2">
                {likesCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => setShowLikesModal(true)}
                    className="suzi-secondary-btn px-4 py-2.5 text-sm"
                  >
                    Likes you ({likesCount})
                  </button>
                ) : null}
                <button type="button" onClick={() => setShowMatchesModal(true)} className="suzi-secondary-btn px-4 py-2.5 text-sm">
                  Matches{matchCount ? ` (${matchCount})` : ""}
                </button>
                <button type="button" onClick={openProfileEditor} className="suzi-primary-btn px-4 py-2.5 text-sm">
                  {myProfile ? "Edit profile" : "Set up profile"}
                </button>
              </div>
            }
          />

          {error ? <p className="mt-3 text-sm text-rose-300/90">{error}</p> : null}

          <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-stretch">
            <DatingFiltersSidebar
              filters={filters}
              hasProfile={Boolean(myProfile)}
              busy={busy}
              onChange={setFilters}
              onApply={() => accessToken && void loadDiscover(accessToken)}
            />

            <div className="min-w-0 flex-1">
              <DatingDiscoverDeck
                deck={deck}
                activeIndex={activeIndex}
                hasProfile={Boolean(myProfile)}
                busy={busy}
                accessToken={accessToken}
                onRotate={rotateBy}
                onInterested={onInterested}
                onPass={onPass}
                onRefresh={() => accessToken && void loadDiscover(accessToken)}
                onOpenProfile={openProfileEditor}
              />
              {activeCard && myProfile ? (
                <button
                  type="button"
                  className="mt-2 text-xs text-rose-300/90 underline-offset-2 hover:underline"
                  onClick={() => void blockActiveCard()}
                >
                  Block @{activeCard.user.username}
                </button>
              ) : null}
            </div>
          </div>
        </Panel>
      </div>

      {showPreviewModal && previewProfile ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[1.2rem] border border-white/12 bg-[rgba(14,16,34,0.98)] p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <p className="text-lg font-semibold text-white">Profile</p>
              <button
                type="button"
                className="text-slate-400 hover:text-white"
                onClick={() => {
                  setShowPreviewModal(false);
                  setPreviewProfile(null);
                  router.replace("/app/dating");
                }}
              >
                Close
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm text-slate-200/88">
              <p className="text-lg font-semibold text-white">
                {previewProfile.user.displayName ?? previewProfile.user.username}
                {previewProfile.age != null ? `, ${previewProfile.age}` : ""}
              </p>
              {previewProfile.user.country ? <p className="text-slate-400/90">{previewProfile.user.country}</p> : null}
              {previewProfile.headline ? <p>{previewProfile.headline}</p> : null}
              {previewProfile.datingBio ? <p className="leading-relaxed">{previewProfile.datingBio}</p> : null}
              {previewProfile.interests?.length ? (
                <div className="flex flex-wrap gap-2">
                  {previewProfile.interests.map((tag) => (
                    <span key={tag} className="rounded-full border border-fuchsia-300/35 px-2 py-0.5 text-xs text-fuchsia-100/90">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {showProfileModal && accessToken ? (
        <DatingProfileModal
          draft={profileDraft}
          busy={busy}
          accessToken={accessToken}
          onChange={setProfileDraft}
          onClose={() => setShowProfileModal(false)}
          onSave={() => void saveProfile()}
        />
      ) : null}

      {showMatchesModal ? (
        <DatingMatchesModal
          matches={matches}
          onClose={() => {
            setShowMatchesModal(false);
            router.replace("/app/dating");
          }}
          onChat={(row) => void openChat(row)}
          onUnmatch={(id) => void unmatch(id)}
        />
      ) : null}

      {showLikesModal ? (
        <DatingLikesModal
          items={likesReceived}
          busy={busy}
          onClose={() => {
            setShowLikesModal(false);
            router.replace("/app/dating");
          }}
          onInterested={(userId) => void runSwipe(userId, "LIKE")}
          onPass={(userId) => void runSwipe(userId, "PASS")}
        />
      ) : null}

      {showChatModal && chatPeer && chatMatchId ? (
        <DatingChatModal
          matchId={chatMatchId}
          peer={chatPeer}
          messages={messages}
          currentUserId={currentUserId}
          chatDraft={chatDraft}
          peerTyping={peerTyping}
          onClose={() => setShowChatModal(false)}
          onUnmatch={() => void unmatch(chatMatchId)}
          onDraftChange={onChatInput}
          onSend={() => void sendChat()}
        />
      ) : null}

      {matchToast ? (
        <DatingMatchToast
          peerName={matchToast}
          onOpenMatches={() => {
            setMatchToast(null);
            setShowMatchesModal(true);
          }}
          onDismiss={() => setMatchToast(null)}
        />
      ) : null}
    </section>
  );
}
