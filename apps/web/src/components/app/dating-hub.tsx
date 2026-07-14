"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChatAttachment } from "@/lib/chat-attachments";
import { DatingBlockedModal } from "@/components/app/dating/dating-blocked-modal";
import { DatingChatModal } from "@/components/app/dating/dating-chat-modal";
import { DatingDiscoverDeck } from "@/components/app/dating/dating-discover-deck";
import { DatingFiltersSidebar, type DatingFilters } from "@/components/app/dating/dating-filters-sidebar";
import { DatingLikesModal } from "@/components/app/dating/dating-likes-modal";
import { DatingMatchToast } from "@/components/app/dating/dating-match-toast";
import { DatingMatchesModal } from "@/components/app/dating/dating-matches-modal";
import { DatingProfileModal, type DatingProfileDraft } from "@/components/app/dating/dating-profile-modal";
import { buildDatingDeckItems, filtersFromProfile } from "@/components/app/dating/dating-utils";
import { isAdSlotActive } from "@/lib/ads-config";
import {
  homeBtnPrimary,
  homeBtnSecondary,
  homePanelHeader,
  homePanelIcon,
  listL2,
  listMeta,
  panelTitle,
} from "@/components/app/home-typography";
import { Panel, SectionHeader, cx } from "@/components/ui/suzi-primitives";
import { getStoredAuthSession } from "@/lib/auth-client";
import {
  type DatingDiscoverItem,
  type DatingMatchRow,
  type DatingMessageRow,
  type DatingProfilePayload,
  deleteDatingMatch,
  deleteDatingSwipe,
  discoverDating,
  datingSwipe,
  getDatingUserProfile,
  getMyDatingProfile,
  listDatingLikesReceived,
  listDatingLikesSent,
  listDatingMatches,
  listDatingMessages,
  sendDatingMessage,
  upsertMyDatingProfile,
} from "@/lib/dating-client";
import { blockPerson, listBlockedPeople, unblockPerson, type BlockedUserRow } from "@/lib/friends-client";
import { getRealtimeSocket } from "@/lib/realtime-client";
import { subscribeUserProfileUpdates } from "@/lib/realtime-feed";

function discoverParamsFromFilters(filters: DatingFilters) {
  return {
    minAge: filters.minAge,
    maxAge: filters.maxAge,
    gender: filters.gender === "any" ? undefined : filters.gender,
    country: filters.country.trim() || undefined,
    search: filters.search.trim() || undefined,
  };
}

function parseOptionalAge(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed) || parsed < 18 || parsed > 120) {
    throw new Error(`${label} must be between 18 and 120.`);
  }
  return parsed;
}

export function DatingHub() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [deck, setDeck] = useState<DatingDiscoverItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hiddenAdKeys, setHiddenAdKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [myProfile, setMyProfile] = useState<(DatingProfilePayload & { interests: string[] }) | null>(null);
  const [matches, setMatches] = useState<DatingMatchRow[]>([]);
  const [likesReceived, setLikesReceived] = useState<DatingDiscoverItem[]>([]);
  const [likesSent, setLikesSent] = useState<DatingDiscoverItem[]>([]);
  const [blockedRows, setBlockedRows] = useState<BlockedUserRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [blockedBusy, setBlockedBusy] = useState(false);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<DatingFilters>(filtersFromProfile(null));
  const [matchToast, setMatchToast] = useState<string | null>(null);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewProfile, setPreviewProfile] = useState<
    (DatingProfilePayload & { interests: string[]; user: DatingDiscoverItem["user"] }) | null
  >(null);
  const [showInboxModal, setShowInboxModal] = useState(false);
  const [showMatchesModal, setShowMatchesModal] = useState(false);
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [showLikesSentModal, setShowLikesSentModal] = useState(false);
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [isCollectionOpen, setIsCollectionOpen] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatMatchId, setChatMatchId] = useState<string | null>(null);
  const [chatPeer, setChatPeer] = useState<DatingMatchRow["peer"] | null>(null);
  const [messages, setMessages] = useState<DatingMessageRow[]>([]);
  const [peerTyping, setPeerTyping] = useState(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const collectionMenuRef = useRef<HTMLDivElement | null>(null);
  const fallbackDatingName = useMemo(() => {
    const session = getStoredAuthSession();
    const raw = session?.user.displayName || session?.user.username || "Your name";
    return raw.trim().split(/\s+/)[0] || "Your name";
  }, []);

  const [profileDraft, setProfileDraft] = useState<DatingProfileDraft>({
    datingName: "",
    age: "",
    gender: "",
    headline: "",
    datingBio: "",
    interests: "",
    photoUrl: "",
    photoUrls: [],
    minAgePref: "18",
    maxAgePref: "99",
    seekGender: "any",
    isDiscoverable: true,
  });

  const discoverParams = useMemo(() => discoverParamsFromFilters(filters), [filters]);

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
      const [received, sent] = await Promise.all([
        listDatingLikesReceived(token),
        listDatingLikesSent(token),
      ]);
      setLikesReceived(received.items);
      setLikesSent(sent.items);
    } catch {
      setLikesReceived([]);
      setLikesSent([]);
    }
  }, []);

  const loadDiscover = useCallback(
    async (token: string, opts?: { append?: boolean; skip?: number; filters?: DatingFilters }) => {
      setError("");
      const skip = opts?.skip ?? 0;
      try {
        const { items } = await discoverDating(token, {
          ...(opts?.filters ? discoverParamsFromFilters(opts.filters) : discoverParams),
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
          const initialFilters = filtersFromProfile(typed);
          setFilters(initialFilters);
          const { items } = await discoverDating(token, {
            ...discoverParamsFromFilters(initialFilters),
            take: 36,
            skip: 0,
          });
          setDeck(items);
          setActiveIndex(0);
        }
        await Promise.all([refreshMatches(token), refreshLikes(token)]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load dating.");
      }
    })();
  }, [refreshMatches, refreshLikes]);

  useEffect(() => {
    const panel = searchParams.get("panel");
    const view = searchParams.get("view");
    if (panel === "matches") {
      setShowMatchesModal(true);
    }
    if (panel === "inbox") {
      setShowInboxModal(true);
    }
    if (panel === "likes") {
      setShowLikesModal(true);
    }
    if (panel === "my-likes") {
      setShowLikesSentModal(true);
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
    const onMatch = (payload: {
      peer?: {
        user?: { id?: string; displayName?: string | null; username?: string };
        dating?: { datingName?: string | null } | null;
      };
    }) => {
      const name =
        payload?.peer?.dating?.datingName?.trim() ||
        payload?.peer?.user?.displayName?.trim() ||
        payload?.peer?.user?.username ||
        "someone";
      setMatchToast(name);
      const peerId = payload?.peer?.user?.id;
      if (peerId) {
        setDeck((prev) =>
          prev.map((item) => (item.userId === peerId ? { ...item, isMatched: true } : item)),
        );
      }
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
      void refreshLikes(accessToken);
    };
    socket.on("dating:match", onMatch);
    socket.on("dating:message", onMessage);
    socket.on("dating:typing", onTyping);
    socket.on("dating:unmatch", onUnmatch);
    const unsubProfile = subscribeUserProfileUpdates(accessToken, (payload) => {
      const user = payload.user;
      if (!user?.id) {
        return;
      }
      setDeck((prev) =>
        prev.map((item) =>
          item.userId === user.id
            ? {
                ...item,
                user: {
                  ...item.user,
                  username: user.username,
                  displayName: user.displayName,
                  avatarUrl: user.avatarUrl,
                  country: user.country ?? item.user.country,
                },
              }
            : item,
        ),
      );
      void refreshMatches(accessToken);
      void refreshLikes(accessToken);
    });
    return () => {
      socket.off("dating:match", onMatch);
      socket.off("dating:message", onMessage);
      socket.off("dating:typing", onTyping);
      socket.off("dating:unmatch", onUnmatch);
      unsubProfile();
    };
  }, [accessToken, chatMatchId, refreshMatches, refreshLikes]);

  useEffect(() => {
    if (!isCollectionOpen) return;

    const closeOnOutsidePress = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (collectionMenuRef.current?.contains(target)) return;
      setIsCollectionOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsCollectionOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isCollectionOpen]);

  const openProfileEditor = () => {
    const p = myProfile;
    setProfileDraft({
      datingName: p?.datingName ?? "",
      age: p?.age != null ? String(p.age) : "",
      gender: p?.gender ?? "",
      headline: p?.headline ?? "",
      datingBio: p?.datingBio ?? "",
      interests: (p?.interests ?? []).join(", "),
      photoUrl: p?.photoUrl ?? "",
      photoUrls: p?.photoUrls?.length ? p.photoUrls : p?.photoUrl ? [p.photoUrl] : [],
      minAgePref: String(p?.minAgePref ?? 18),
      maxAgePref: String(p?.maxAgePref ?? 99),
      seekGender: p?.seekGender ?? "any",
      isDiscoverable: p?.isDiscoverable ?? true,
    });
    setShowProfileModal(true);
  };

  const applyFilters = () => {
    if (!accessToken) {
      return;
    }
    if (filters.minAge > filters.maxAge) {
      setError("Minimum age cannot be higher than maximum age.");
      return;
    }
    void loadDiscover(accessToken);
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
      const age = parseOptionalAge(profileDraft.age, "Age");
      const minAgePref = parseOptionalAge(profileDraft.minAgePref, "Minimum age preference") ?? 18;
      const maxAgePref = parseOptionalAge(profileDraft.maxAgePref, "Maximum age preference") ?? 99;
      if (minAgePref > maxAgePref) {
        throw new Error("Minimum age preference cannot be higher than maximum age preference.");
      }
      const { profile } = await upsertMyDatingProfile(accessToken, {
        datingName: profileDraft.datingName,
        age,
        gender: profileDraft.gender || undefined,
        headline: profileDraft.headline || undefined,
        datingBio: profileDraft.datingBio || undefined,
        interests,
        photoUrl: profileDraft.photoUrls[0] || profileDraft.photoUrl || undefined,
        photoUrls: profileDraft.photoUrls,
        minAgePref,
        maxAgePref,
        seekGender: profileDraft.seekGender,
        isDiscoverable: profileDraft.isDiscoverable,
      });
      const next = { ...profile, interests: profile.interests ?? [] };
      const nextFilters = filtersFromProfile(next);
      setMyProfile(next);
      setFilters(nextFilters);
      setShowProfileModal(false);
      await loadDiscover(accessToken, { filters: nextFilters });
      await Promise.all([refreshMatches(accessToken), refreshLikes(accessToken)]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  // Deck rendered/navigated by the carousel = profiles + interleaved ad slides.
  // Data mutations stay on `deck` (profiles), keyed by userId.
  const deckWithAds = useMemo(
    () =>
      buildDatingDeckItems(deck, isAdSlotActive("feed-dating")).filter(
        (item) => item.type !== "ad" || !hiddenAdKeys.has(item.key),
      ),
    [deck, hiddenAdKeys],
  );

  const rotateBy = useCallback(
    (step: number) => {
      if (deckWithAds.length === 0) {
        return;
      }
      setActiveIndex((i) => (i + step + deckWithAds.length) % deckWithAds.length);
    },
    [deckWithAds.length],
  );

  const handleAdNoFill = useCallback(
    (key: string) => {
      setHiddenAdKeys((previous) => {
        if (previous.has(key)) {
          return previous;
        }
        const next = new Set(previous);
        next.add(key);
        return next;
      });
      setActiveIndex((previous) =>
        deckWithAds.length > 1
          ? (previous + 1 + deckWithAds.length) % deckWithAds.length
          : 0,
      );
    },
    [deckWithAds.length],
  );

  const runSwipe = async (targetUserId: string, action: "LIKE" | "PASS") => {
    if (!accessToken) {
      return;
    }
    const target =
      deck.find((item) => item.userId === targetUserId) ??
      likesReceived.find((item) => item.userId === targetUserId) ??
      likesSent.find((item) => item.userId === targetUserId) ??
      null;
    setBusy(true);
    setError("");
    try {
      const res = await datingSwipe(accessToken, { toUserId: targetUserId, action });
      const nextIsMatched = action === "LIKE" ? Boolean(res.matched) || Boolean(target?.isMatched) : false;
      if (res.matched && res.match) {
        const peerName =
          res.match.peer.dating?.datingName?.trim() ||
          res.match.peer.user.displayName?.trim() || res.match.peer.user.username;
        setMatchToast(peerName);
        await refreshMatches(accessToken);
      }
      if (action === "PASS") {
        await refreshMatches(accessToken);
      }
      setLikesReceived((prev) => prev.filter((x) => x.userId !== targetUserId));
      setDeck((prev) =>
        prev.map((item) =>
          item.userId === targetUserId
            ? { ...item, viewerSwipeAction: action, isMatched: nextIsMatched }
            : item,
        ),
      );
      setLikesSent((prev) => {
        if (action === "PASS") {
          return prev.filter((item) => item.userId !== targetUserId);
        }
        const nextItem = target
          ? { ...target, viewerSwipeAction: "LIKE" as const, isMatched: nextIsMatched }
          : null;
        if (!nextItem) {
          return prev;
        }
        const rest = prev.filter((item) => item.userId !== targetUserId);
        return [nextItem, ...rest];
      });
      await refreshLikes(accessToken);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  };

  const removeInterest = async (targetUserId: string) => {
    if (!accessToken) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      await deleteDatingSwipe(accessToken, targetUserId);
      setDeck((prev) =>
        prev.map((item) =>
          item.userId === targetUserId
            ? { ...item, viewerSwipeAction: null, isMatched: false }
            : item,
        ),
      );
      setLikesSent((prev) => prev.filter((item) => item.userId !== targetUserId));
      await Promise.all([refreshMatches(accessToken), refreshLikes(accessToken)]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove interest.");
    } finally {
      setBusy(false);
    }
  };

  const openChat = useCallback(async (row: DatingMatchRow) => {
    if (!accessToken) {
      return;
    }
    setShowInboxModal(false);
    setShowMatchesModal(false);
    setMatchToast(null);
    setChatMatchId(row.id);
    setChatPeer(row.peer);
    setShowChatModal(true);
    setPeerTyping(false);
    try {
      const { messages: rows } = await listDatingMessages(accessToken, row.id);
      setMessages(rows);
    } catch {
      setMessages([]);
    }
  }, [accessToken]);

  useEffect(() => {
    const panel = searchParams.get("panel");
    const matchId = searchParams.get("match");
    if (panel !== "inbox" || !matchId || chatMatchId === matchId || matches.length === 0) {
      return;
    }
    const match = matches.find((row) => row.id === matchId);
    if (match) {
      void openChat(match);
    }
  }, [chatMatchId, matches, openChat, searchParams]);

  const sendChat = async (text: string, attachments: ChatAttachment[] = []) => {
    const body = text.trim();
    if (!accessToken || !chatMatchId || (!body && attachments.length === 0)) {
      return;
    }
    try {
      const { message } = await sendDatingMessage(accessToken, chatMatchId, body, attachments);
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
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
    emitTyping(value.trim().length > 0);
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

  const blockDatingPerson = async (userId: string) => {
    if (!accessToken) {
      return;
    }
    setBusy(true);
    try {
      await blockPerson(accessToken, userId);
      await loadDiscover(accessToken);
      await refreshMatches(accessToken);
      await refreshLikes(accessToken);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Block failed.");
    } finally {
      setBusy(false);
    }
  };

  const openBlockedList = async () => {
    if (!accessToken) {
      return;
    }

    setShowBlockedModal(true);
    setBlockedBusy(true);
    try {
      const rows = await listBlockedPeople(accessToken);
      setBlockedRows(rows);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load blocked people.");
    } finally {
      setBlockedBusy(false);
    }
  };

  const unblockFromDating = async (userId: string) => {
    if (!accessToken) {
      return;
    }

    setBlockedBusy(true);
    try {
      await unblockPerson(accessToken, userId);
      const rows = await listBlockedPeople(accessToken);
      setBlockedRows(rows);
      await loadDiscover(accessToken);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not unblock this person.");
    } finally {
      setBlockedBusy(false);
    }
  };

  const matchCount = matches.length;
  const likesCount = likesReceived.length;
  const likesSentCount = likesSent.length;

  const openCollection = (value: string) => {
    if (value === "matches") {
      setShowMatchesModal(true);
    }
    if (value === "likes-me") {
      setShowLikesModal(true);
    }
    if (value === "my-likes") {
      setShowLikesSentModal(true);
    }
    if (value === "blocked") {
      void openBlockedList();
    }
  };

  const datingCollectionSelect = (
    <div ref={collectionMenuRef} className="relative">
      <button
        type="button"
        className={cx(
          homeBtnSecondary,
          "suzi-dating-select suzi-dating-collection-trigger text-left outline-none",
        )}
        aria-haspopup="menu"
        aria-expanded={isCollectionOpen}
        onClick={() => setIsCollectionOpen((value) => !value)}
      >
        <span className="suzi-dating-collection-trigger__label">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 6h13M8 12h13M8 18h13" />
            <path d="M3 6h.01M3 12h.01M3 18h.01" />
          </svg>
          <span>Lists</span>
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className={cx(
            "h-3.5 w-3.5 shrink-0 transition-transform",
            isCollectionOpen && "rotate-180",
          )}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {isCollectionOpen ? (
        <div className="suzi-dating-dropdown-menu absolute right-0 top-[calc(100%+0.45rem)] z-40 w-52 overflow-hidden rounded-[0.9rem] border border-cyan-300/24 bg-[rgba(24,34,92,0.98)] p-1.5 shadow-[0_18px_50px_rgba(12,8,36,0.55)] backdrop-blur">
          {[
            { value: "matches", label: `Matches (${matchCount})` },
            { value: "my-likes", label: `Likes Sent (${likesSentCount})` },
            { value: "likes-me", label: `Likes Received (${likesCount})` },
            { value: "blocked", label: "Blocked" },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              className={cx(listMeta, "suzi-dating-dropdown-option w-full rounded-[0.65rem] px-3 py-2 text-left font-semibold text-cyan-50 transition hover:bg-cyan-400/18 hover:text-white")}
              onClick={() => {
                setIsCollectionOpen(false);
                openCollection(item.value);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );

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
      <div className="suzi-dating-with-rail flex min-h-0 flex-1">
        <DatingFiltersSidebar
          filters={filters}
          hasProfile={Boolean(myProfile)}
          busy={busy}
          onChange={setFilters}
          onApply={() => void applyFilters()}
        />

        <Panel className="suzi-panel--home suzi-game-lobby-panel suzi-dating-main-panel flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-[var(--panel-pad)]">
          <div className={cx(homePanelHeader, "suzi-dating-header flex shrink-0 flex-wrap items-center justify-between gap-3")}>
            <div className="flex items-center gap-2.5">
              <span className={homePanelIcon}>
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="currentColor">
                  <path d="M12 21s-7-4.7-9.5-8c-2-2.7-.7-7 3-7 2 0 3.3 1 4.5 2.5C11.2 7 12.5 6 14.5 6c3.7 0 5 4.3 3 7C19 16.3 12 21 12 21Z" />
                </svg>
              </span>
              <div>
                <h2 className={panelTitle}>Suzi Dating</h2>
                <p className={cx(listL2, "mt-1 text-cyan-100/78")}>
                  Browse profiles, show interest, match, and chat.
                </p>
              </div>
            </div>
            <div className="suzi-feed-header-actions flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                className={cx(homeBtnSecondary, "px-3")}
                onClick={() => setShowInboxModal(true)}
              >
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
                    <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
                  </svg>
                  Inbox
                </span>
              </button>
              <button
                type="button"
                className={cx(homeBtnSecondary, "suzi-dating-filter-trigger px-3")}
                onClick={() => setShowMobileFilters(true)}
              >
                Filters
              </button>
              {datingCollectionSelect}
              <button type="button" onClick={openProfileEditor} className={cx(homeBtnPrimary, "px-4")}>
                {myProfile ? "Edit profile" : "Set up profile"}
              </button>
            </div>
          </div>

          {error ? <p className={cx(listL2, "mt-3 shrink-0 rounded-lg border border-pink-400/26 bg-pink-500/12 px-3 py-2 text-pink-100")}>{error}</p> : null}

          <div className="suzi-game-lobby-body suzi-dating-main-body mt-3 flex min-h-0 flex-1 flex-col overflow-hidden p-2">
            <DatingDiscoverDeck
              deck={deckWithAds}
              activeIndex={activeIndex}
              hasProfile={Boolean(myProfile)}
              busy={busy}
              accessToken={accessToken}
              onRotate={rotateBy}
              onActiveIndexChange={setActiveIndex}
              onAdNoFill={handleAdNoFill}
              onInterested={(userId) => void runSwipe(userId, "LIKE")}
              onRemoveInterest={(userId) => void removeInterest(userId)}
              onPass={(userId) => void runSwipe(userId, "PASS")}
              onBlock={(userId) => void blockDatingPerson(userId)}
              onRefresh={() => accessToken && void loadDiscover(accessToken)}
              onOpenProfile={openProfileEditor}
            />
          </div>
        </Panel>
      </div>

      {showMobileFilters ? (
        <div className="suzi-mobile-modal-root suzi-dating-filter-modal fixed inset-0 z-[80] flex items-end justify-center bg-black/58 p-3 md:hidden">
          <div className="suzi-mobile-modal-panel w-full max-w-md rounded-[1.2rem] border border-fuchsia-300/22 bg-[rgba(15,11,42,0.98)] p-3 shadow-[0_24px_70px_rgba(0,0,0,0.55)] backdrop-blur-xl">
            <div className="mb-2 flex items-center justify-between gap-3 px-1">
              <div>
                <p className="text-sm font-semibold text-white">Dating Filters</p>
                <p className="text-[0.68rem] text-fuchsia-100/62">Adjust and apply to refresh the deck.</p>
              </div>
              <button
                type="button"
                className="rounded-full border border-white/12 bg-white/6 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white"
                onClick={() => setShowMobileFilters(false)}
              >
                Close
              </button>
            </div>
            <DatingFiltersSidebar
              filters={filters}
              hasProfile={Boolean(myProfile)}
              busy={busy}
              onChange={setFilters}
              onApply={() => {
                setShowMobileFilters(false);
                void applyFilters();
              }}
            />
          </div>
        </div>
      ) : null}

      {showPreviewModal && previewProfile ? (
        <div className="suzi-mobile-modal-root fixed inset-0 z-[80] flex items-end justify-center bg-black/55 p-4 sm:items-center">
          <div className="suzi-mobile-modal-panel max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[1.2rem] border border-white/12 bg-[rgba(14,16,34,0.98)] p-5 shadow-2xl">
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
                {previewProfile.datingName?.trim() || previewProfile.user.displayName || previewProfile.user.username}
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
          fallbackName={fallbackDatingName}
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

      {showInboxModal ? (
        <DatingMatchesModal
          title="Dating Inbox"
          copy="Open your Suzi Dating conversations and continue messaging."
          emptyLabel="No dating conversations yet. Match with someone to start messaging."
          matches={matches}
          onClose={() => {
            setShowInboxModal(false);
            router.replace("/app/dating");
          }}
          onChat={(row) => void openChat(row)}
          onUnmatch={(id) => void unmatch(id)}
        />
      ) : null}

      {showLikesModal ? (
        <DatingLikesModal
          title="Likes Me"
          copy="People who liked you - respond with Interested or Not interested."
          emptyLabel="No new likes right now."
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

      {showLikesSentModal ? (
        <DatingLikesModal
          title="Likes Sent"
          copy="Profiles you liked. Remove interest anytime to turn the heart back off."
          emptyLabel="You have not liked any profiles yet."
          items={likesSent}
          busy={busy}
          onClose={() => {
            setShowLikesSentModal(false);
            router.replace("/app/dating");
          }}
          onRemoveInterest={(userId) => void removeInterest(userId)}
        />
      ) : null}

      {showBlockedModal ? (
        <DatingBlockedModal
          rows={blockedRows}
          busy={blockedBusy}
          onClose={() => {
            setShowBlockedModal(false);
            router.replace("/app/dating");
          }}
          onUnblock={(userId) => void unblockFromDating(userId)}
        />
      ) : null}

      {showChatModal && chatPeer && chatMatchId ? (
        <DatingChatModal
          matchId={chatMatchId}
          peer={chatPeer}
          messages={messages}
          currentUserId={currentUserId}
          accessToken={accessToken}
          peerTyping={peerTyping}
          onClose={() => setShowChatModal(false)}
          onUnmatch={() => void unmatch(chatMatchId)}
          onTyping={onChatInput}
          onSend={(text, attachments) => void sendChat(text, attachments)}
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
