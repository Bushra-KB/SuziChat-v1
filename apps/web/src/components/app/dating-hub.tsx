"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Panel, SectionHeader, cx } from "@/components/ui/suzi-primitives";
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
  listDatingMatches,
  listDatingMessages,
  sendDatingMessage,
  upsertMyDatingProfile,
} from "@/lib/dating-client";
import { blockPerson } from "@/lib/friends-client";
import { getRealtimeSocket } from "@/lib/realtime-client";

type DeckLayer = {
  transform: string;
  opacity: number;
  zIndex: number;
  isActive: boolean;
};

type DragState = {
  pointerId: number | null;
  startX: number;
  dragging: boolean;
  didMove: boolean;
};

function getCircularOffset(index: number, activeIndex: number, total: number) {
  let offset = index - activeIndex;
  if (offset > total / 2) {
    offset -= total;
  }
  if (offset < -total / 2) {
    offset += total;
  }
  return offset;
}

function getLayerForOffset(offset: number): DeckLayer | null {
  const absOffset = Math.abs(offset);
  if (absOffset > 2) {
    return null;
  }
  if (offset === 0) {
    return {
      transform: "translate3d(0, 0, 50px) scale(1.08)",
      opacity: 1,
      zIndex: 20,
      isActive: true,
    };
  }
  const leftSide = offset < 0;
  if (absOffset === 1) {
    return {
      transform: `translate3d(${leftSide ? "-72%" : "72%"}, 0, -150px) rotateY(${leftSide ? "25deg" : "-25deg"}) translateX(${leftSide ? "-20%" : "20%"}) scale(0.84)`,
      opacity: 0.62,
      zIndex: 10,
      isActive: false,
    };
  }
  return {
    transform: `translate3d(${leftSide ? "-124%" : "124%"}, 0, -280px) rotateY(${leftSide ? "34deg" : "-34deg"}) translateX(${leftSide ? "-26%" : "26%"}) scale(0.68)`,
    opacity: 0.32,
    zIndex: 5,
    isActive: false,
  };
}

function cardImageUrl(item: DatingDiscoverItem) {
  return item.photoUrl?.trim() || item.user.avatarUrl || "";
}

function peerPhoto(m: DatingMatchRow) {
  return m.peer.dating?.photoUrl?.trim() || m.peer.user.avatarUrl || "";
}

export function DatingHub() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [deck, setDeck] = useState<DatingDiscoverItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [myProfile, setMyProfile] = useState<(DatingProfilePayload & { interests: string[] }) | null>(null);
  const [matches, setMatches] = useState<DatingMatchRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    minAge: 18,
    maxAge: 99,
    gender: "any",
    country: "",
    search: "",
  });

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewProfile, setPreviewProfile] = useState<
    (DatingProfilePayload & { interests: string[]; user: DatingDiscoverItem["user"] }) | null
  >(null);
  const [showMatchesModal, setShowMatchesModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatMatchId, setChatMatchId] = useState<string | null>(null);
  const [chatPeer, setChatPeer] = useState<DatingMatchRow["peer"] | null>(null);
  const [messages, setMessages] = useState<DatingMessageRow[]>([]);
  const [chatDraft, setChatDraft] = useState("");
  const [peerTyping, setPeerTyping] = useState(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const [profileDraft, setProfileDraft] = useState({
    age: "" as string,
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

  const stageRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState>({ pointerId: null, startX: 0, dragging: false, didMove: false });
  const wheelLockRef = useRef(0);

  const activeCard = deck[activeIndex] ?? null;

  const refreshMatches = useCallback(async (token: string) => {
    try {
      const { matches: rows } = await listDatingMatches(token);
      setMatches(rows);
    } catch {
      // ignore
    }
  }, []);

  const loadDiscover = useCallback(
    async (token: string) => {
      setError("");
      try {
        const { items } = await discoverDating(token, {
          minAge: filters.minAge,
          maxAge: filters.maxAge,
          gender: filters.gender === "any" ? undefined : filters.gender,
          country: filters.country.trim() || undefined,
          search: filters.search.trim() || undefined,
          take: 36,
          skip: 0,
        });
        setDeck(items);
        setActiveIndex(0);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load discover.");
        setDeck([]);
      }
    },
    [filters.minAge, filters.maxAge, filters.gender, filters.country, filters.search],
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
        setMyProfile(profile as typeof myProfile);
        if (profile) {
          await loadDiscover(token);
        }
        await refreshMatches(token);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load dating.");
      }
    })();
  }, [loadDiscover, refreshMatches]);

  useEffect(() => {
    const panel = searchParams.get("panel");
    const view = searchParams.get("view");
    if (panel === "matches") {
      setShowMatchesModal(true);
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
          // ignore invalid deep link
        }
      })();
    }
  }, [searchParams]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    const socket = getRealtimeSocket(accessToken);
    const onMatch = () => {
      void refreshMatches(accessToken);
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
  }, [accessToken, chatMatchId, refreshMatches]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, showChatModal]);

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
      setMyProfile({ ...profile, interests: profile.interests ?? [] });
      setShowProfileModal(false);
      await loadDiscover(accessToken);
      await refreshMatches(accessToken);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  const applyFilters = () => {
    if (!accessToken || !myProfile) {
      return;
    }
    void loadDiscover(accessToken);
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

  const onSwipe = async (action: "LIKE" | "PASS") => {
    if (!accessToken || !activeCard) {
      return;
    }
    const targetUserId = activeCard.userId;
    setBusy(true);
    setError("");
    try {
      const res = await datingSwipe(accessToken, { toUserId: targetUserId, action });
      if (res.matched && res.match) {
        await refreshMatches(accessToken);
      }
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
          void discoverDating(accessToken, {
            minAge: filters.minAge,
            maxAge: filters.maxAge,
            gender: filters.gender === "any" ? undefined : filters.gender,
            country: filters.country.trim() || undefined,
            search: filters.search.trim() || undefined,
            take: 28,
            skip: 0,
          })
            .then(({ items }) => {
              setDeck((d) => {
                const seen = new Set(d.map((x) => x.userId));
                return [...d, ...items.filter((x) => !seen.has(x.userId))];
              });
            })
            .catch(() => {});
        }
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Swipe failed.");
    } finally {
      setBusy(false);
    }
  };

  const openChat = async (row: DatingMatchRow) => {
    if (!accessToken) {
      return;
    }
    setShowMatchesModal(false);
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
    const socket = getRealtimeSocket(accessToken);
    socket.emit("dating:typing", { matchId: chatMatchId, typing });
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

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) {
      return;
    }
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      dragging: true,
      didMove: false,
    };
    stageRef.current?.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d.dragging || e.pointerId !== d.pointerId) {
      return;
    }
    if (Math.abs(e.clientX - d.startX) > 12) {
      d.didMove = true;
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d.dragging || e.pointerId !== d.pointerId) {
      return;
    }
    d.dragging = false;
    try {
      stageRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    if (!d.didMove) {
      return;
    }
    const dx = e.clientX - d.startX;
    if (dx > 48) {
      void onSwipe("LIKE");
    } else if (dx < -48) {
      void onSwipe("PASS");
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    const now = Date.now();
    if (now - wheelLockRef.current < 220) {
      return;
    }
    const dominant = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    if (Math.abs(dominant) < 8) {
      return;
    }
    wheelLockRef.current = now;
    rotateBy(dominant > 0 ? 1 : -1);
    e.preventDefault();
  };

  const blockPeer = async (userId: string) => {
    if (!accessToken) {
      return;
    }
    setBusy(true);
    try {
      await blockPerson(accessToken, userId);
      setShowChatModal(false);
      setChatMatchId(null);
      await loadDiscover(accessToken);
      await refreshMatches(accessToken);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Block failed.");
    } finally {
      setBusy(false);
    }
  };

  const matchCount = matches.length;

  const headerAction = useMemo(
    () => (
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setShowMatchesModal(true)} className="suzi-secondary-btn px-4 py-2.5 text-sm">
          Matches{matchCount ? ` (${matchCount})` : ""}
        </button>
        <button type="button" onClick={openProfileEditor} className="suzi-primary-btn px-4 py-2.5 text-sm">
          {myProfile ? "Edit profile" : "Set up profile"}
        </button>
      </div>
    ),
    [matchCount, myProfile],
  );

  if (!accessToken) {
    return (
      <section className="suzi-app-frame-fill">
        <div className="suzi-app-frame-scroll suzi-scrollbar pr-1">
        <Panel className="p-6 sm:p-7">
          <SectionHeader
            eyebrow="Dating"
            title="Sign in to use Suzi Dating"
            copy="Create a profile, discover people, match, and chat in one place."
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
    <section className="suzi-app-frame-fill">
      <div className="suzi-app-frame-scroll suzi-scrollbar pr-1">
      <Panel className="[background:transparent] border-fuchsia-300/22 p-4 shadow-none sm:p-5">
        <SectionHeader
          eyebrow="Dating"
          title="Suzi Dating"
          copy="Filters on the left, discovery deck on the right — matches and chat stay on this page."
          action={headerAction}
        />

        {error ? <p className="mt-3 text-sm text-rose-300/90">{error}</p> : null}

        <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-stretch">
          <aside className="flex w-full shrink-0 flex-col gap-4 rounded-[1.05rem] border border-fuchsia-300/18 bg-[rgba(16,19,38,0.55)] p-4 lg:w-72">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-fuchsia-100/70">Filters</p>
            <label className="block text-xs text-slate-300/85">
              Min age
              <input
                type="number"
                className="suzi-input mt-1 w-full"
                value={filters.minAge}
                min={18}
                max={120}
                onChange={(e) => setFilters((f) => ({ ...f, minAge: Number(e.target.value) || 18 }))}
              />
            </label>
            <label className="block text-xs text-slate-300/85">
              Max age
              <input
                type="number"
                className="suzi-input mt-1 w-full"
                value={filters.maxAge}
                min={18}
                max={120}
                onChange={(e) => setFilters((f) => ({ ...f, maxAge: Number(e.target.value) || 99 }))}
              />
            </label>
            <label className="block text-xs text-slate-300/85">
              Gender
              <select
                className="suzi-input mt-1 w-full"
                value={filters.gender}
                onChange={(e) => setFilters((f) => ({ ...f, gender: e.target.value }))}
              >
                <option value="any">Any</option>
                <option value="male">Men</option>
                <option value="female">Women</option>
                <option value="nonbinary">Non-binary</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="block text-xs text-slate-300/85">
              Country (exact)
              <input
                className="suzi-input mt-1 w-full"
                placeholder="e.g. United States"
                value={filters.country}
                onChange={(e) => setFilters((f) => ({ ...f, country: e.target.value }))}
              />
            </label>
            <label className="block text-xs text-slate-300/85">
              Search name / @username
              <input
                className="suzi-input mt-1 w-full"
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              />
            </label>
            <button
              type="button"
              disabled={!myProfile || busy}
              onClick={applyFilters}
              className="suzi-primary-btn px-3 py-2.5 text-sm disabled:opacity-50"
            >
              Apply filters
            </button>
            {!myProfile ? (
              <p className="text-xs leading-relaxed text-slate-400/90">
                Complete your dating profile to browse discover and receive matches.
              </p>
            ) : null}
          </aside>

          <div className="min-w-0 flex-1 space-y-4">
            <div
              ref={stageRef}
              className="relative isolate overflow-hidden rounded-[1.05rem] border border-fuchsia-300/16 [perspective:1200px]"
              style={{ touchAction: "pan-y", transformStyle: "preserve-3d" }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onWheel={handleWheel}
            >
              <div className="h-[22rem] sm:h-[36rem]" style={{ transformStyle: "preserve-3d" }}>
                {deck.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                    <p className="text-sm text-slate-300/88">
                      {myProfile ? "No profiles match these filters right now." : "Set up your profile to start discovering."}
                    </p>
                    {!myProfile ? (
                      <button type="button" onClick={openProfileEditor} className="suzi-primary-btn px-4 py-2.5 text-sm">
                        Create profile
                      </button>
                    ) : (
                      <button type="button" onClick={() => void loadDiscover(accessToken)} className="suzi-secondary-btn px-4 py-2.5 text-sm">
                        Refresh deck
                      </button>
                    )}
                  </div>
                ) : (
                  deck.map((item, index) => {
                    const offset = getCircularOffset(index, activeIndex, deck.length);
                    const layer = getLayerForOffset(offset);
                    if (!layer) {
                      return null;
                    }
                    const img = cardImageUrl(item);
                    const name = item.user.displayName ?? item.user.username;
                    return (
                      <div
                        key={item.userId}
                        className="pointer-events-none absolute inset-0 flex items-center justify-center [transform-style:preserve-3d]"
                      >
                        <div
                          className={cx(
                            "pointer-events-auto relative aspect-[9/16] overflow-hidden rounded-[1.45rem] border text-left transition-all duration-500 ease-in-out",
                            layer.isActive
                              ? "h-[84%] max-h-[40rem] w-auto max-w-[86vw] border-fuchsia-300/72 shadow-[0_0_48px_rgba(232,77,255,0.28)] sm:max-w-[22rem]"
                              : "h-[78%] max-h-[36rem] w-auto max-w-[80vw] border-fuchsia-300/20 sm:max-w-[19rem]",
                          )}
                          style={{
                            transform: layer.transform,
                            opacity: layer.opacity,
                            zIndex: layer.zIndex,
                            transformStyle: "preserve-3d",
                            willChange: "transform, opacity",
                          }}
                        >
                          <div className="absolute inset-0 bg-[rgba(6,9,28,0.35)]">
                            {img ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={img} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-fuchsia-900/40 to-slate-900/80 text-4xl text-white/40">
                                {name.slice(0, 1).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,12,24,0.02),rgba(10,12,24,0.62))]" />
                          <div className="absolute inset-x-0 bottom-0 space-y-2 p-4">
                            <p className="text-lg font-semibold text-white">
                              {name}
                              {item.age != null ? `, ${item.age}` : ""}
                            </p>
                            {item.user.country ? <p className="text-xs text-slate-300/80">{item.user.country}</p> : null}
                            {item.headline ? <p className="text-sm text-slate-200/85">{item.headline}</p> : null}
                            {layer.isActive ? (
                              <div className="mt-3 flex gap-2">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void onSwipe("PASS")}
                                  className="suzi-secondary-btn flex-1 px-3 py-2.5 text-sm"
                                >
                                  Pass
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void onSwipe("LIKE")}
                                  className="suzi-primary-btn flex-1 px-3 py-2.5 text-sm"
                                >
                                  Like
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {activeCard && myProfile ? (
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400/85">
                <span>
                  @{activeCard.user.username} · drag right to like, left to pass, or use the wheel to browse
                </span>
                <button type="button" className="text-fuchsia-200/80 underline-offset-2 hover:underline" onClick={() => void blockPeer(activeCard.userId)}>
                  Block user
                </button>
              </div>
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

      {showProfileModal ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[1.2rem] border border-white/12 bg-[rgba(14,16,34,0.98)] p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <p className="text-lg font-semibold text-white">Dating profile</p>
              <button type="button" className="text-slate-400 hover:text-white" onClick={() => setShowProfileModal(false)}>
                Close
              </button>
            </div>
            <div className="mt-4 grid gap-3 text-sm">
              <label className="text-slate-300/85">
                Age
                <input className="suzi-input mt-1 w-full" value={profileDraft.age} onChange={(e) => setProfileDraft((d) => ({ ...d, age: e.target.value }))} />
              </label>
              <label className="text-slate-300/85">
                Gender
                <input className="suzi-input mt-1 w-full" value={profileDraft.gender} onChange={(e) => setProfileDraft((d) => ({ ...d, gender: e.target.value }))} />
              </label>
              <label className="text-slate-300/85">
                Headline
                <input className="suzi-input mt-1 w-full" value={profileDraft.headline} onChange={(e) => setProfileDraft((d) => ({ ...d, headline: e.target.value }))} />
              </label>
              <label className="text-slate-300/85">
                About you
                <textarea className="suzi-input mt-1 min-h-[88px] w-full resize-y" value={profileDraft.datingBio} onChange={(e) => setProfileDraft((d) => ({ ...d, datingBio: e.target.value }))} />
              </label>
              <label className="text-slate-300/85">
                Interests (comma-separated)
                <input className="suzi-input mt-1 w-full" value={profileDraft.interests} onChange={(e) => setProfileDraft((d) => ({ ...d, interests: e.target.value }))} />
              </label>
              <label className="text-slate-300/85">
                Photo URL
                <input className="suzi-input mt-1 w-full" value={profileDraft.photoUrl} onChange={(e) => setProfileDraft((d) => ({ ...d, photoUrl: e.target.value }))} />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-slate-300/85">
                  Min age pref
                  <input className="suzi-input mt-1 w-full" value={profileDraft.minAgePref} onChange={(e) => setProfileDraft((d) => ({ ...d, minAgePref: e.target.value }))} />
                </label>
                <label className="text-slate-300/85">
                  Max age pref
                  <input className="suzi-input mt-1 w-full" value={profileDraft.maxAgePref} onChange={(e) => setProfileDraft((d) => ({ ...d, maxAgePref: e.target.value }))} />
                </label>
              </div>
              <label className="text-slate-300/85">
                Show me
                <select className="suzi-input mt-1 w-full" value={profileDraft.seekGender} onChange={(e) => setProfileDraft((d) => ({ ...d, seekGender: e.target.value }))}>
                  <option value="any">Everyone</option>
                  <option value="male">Men</option>
                  <option value="female">Women</option>
                  <option value="nonbinary">Non-binary</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-slate-300/85">
                <input
                  type="checkbox"
                  checked={profileDraft.isDiscoverable}
                  onChange={(e) => setProfileDraft((d) => ({ ...d, isDiscoverable: e.target.checked }))}
                />
                Discoverable in deck
              </label>
              <button type="button" disabled={busy} onClick={() => void saveProfile()} className="suzi-primary-btn mt-2 px-4 py-3 text-sm">
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showMatchesModal ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 p-4 sm:items-center">
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-[1.2rem] border border-white/12 bg-[rgba(14,16,34,0.98)] p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <p className="text-lg font-semibold text-white">Matches</p>
              <button
                type="button"
                className="text-slate-400 hover:text-white"
                onClick={() => {
                  setShowMatchesModal(false);
                  router.replace("/app/dating");
                }}
              >
                Close
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {matches.length === 0 ? <p className="text-sm text-slate-400/88">No matches yet. Keep browsing!</p> : null}
              {matches.map((m) => {
                const label = m.peer.user.displayName ?? m.peer.user.username;
                const photo = peerPhoto(m);
                return (
                  <div key={m.id} className="flex items-center gap-3 rounded-[1rem] border border-white/10 bg-white/5 p-3">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-fuchsia-300/30 bg-slate-800">
                      {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photo} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-sm text-white/60">{label.slice(0, 1)}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-white">{label}</p>
                      {m.lastMessage ? <p className="truncate text-xs text-slate-400/90">{m.lastMessage.body}</p> : null}
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      <button type="button" className="suzi-primary-btn px-3 py-1.5 text-xs" onClick={() => void openChat(m)}>
                        Chat
                      </button>
                      <button type="button" className="text-[0.65rem] text-rose-300/90 hover:underline" onClick={() => void unmatch(m.id)}>
                        Unmatch
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {showChatModal && chatPeer && chatMatchId ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/55 p-4 sm:items-center">
          <div className="flex max-h-[88vh] w-full max-w-lg flex-col rounded-[1.2rem] border border-white/12 bg-[rgba(14,16,34,0.98)] shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 p-4">
              <div>
                <p className="font-semibold text-white">{chatPeer.user.displayName ?? chatPeer.user.username}</p>
                <p className="text-[0.65rem] text-slate-400/88">Match chat · realtime</p>
              </div>
              <div className="flex gap-2">
                <button type="button" className="text-xs text-rose-300/90 hover:underline" onClick={() => void unmatch(chatMatchId)}>
                  Unmatch
                </button>
                <button type="button" className="text-slate-400 hover:text-white" onClick={() => setShowChatModal(false)}>
                  Close
                </button>
              </div>
            </div>
            <div className="min-h-[220px] flex-1 space-y-2 overflow-y-auto p-4">
              {messages.map((msg) => {
                const mine = currentUserId != null && msg.senderId === currentUserId;
                return (
                  <div key={msg.id} className={cx("max-w-[85%] rounded-2xl px-3 py-2 text-sm", mine ? "ml-auto bg-fuchsia-600/35 text-white" : "mr-auto bg-white/10 text-slate-100")}>
                    <p className="text-[0.62rem] uppercase tracking-wide text-slate-300/80">{msg.sender.displayName ?? msg.sender.username}</p>
                    <p className="mt-1 whitespace-pre-wrap">{msg.body}</p>
                  </div>
                );
              })}
              {peerTyping ? <p className="text-xs text-fuchsia-200/80">Typing…</p> : null}
              <div ref={messagesEndRef} />
            </div>
            <div className="border-t border-white/10 p-3">
              <div className="flex gap-2">
                <input
                  className="suzi-input flex-1"
                  placeholder="Message…"
                  value={chatDraft}
                  onChange={(e) => onChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void sendChat();
                    }
                  }}
                />
                <button type="button" className="suzi-primary-btn px-4 py-2 text-sm" onClick={() => void sendChat()}>
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
