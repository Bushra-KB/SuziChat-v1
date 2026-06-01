"use client";

import { useEffect, useState } from "react";
import { getRealtimeSocket } from "@/lib/realtime-client";
import {
  subscribePostsFeedChannel,
  subscribeRoomsCatalog,
  subscribeUserProfileUpdates,
  type PostFeedKind,
} from "@/lib/realtime-feed";

export type PresenceStatus = "online" | "away" | "offline";

/** Refresh account dashboard data when friends, posts, or rooms change. */
export function useMyProfileRealtime(
  accessToken: string | null,
  onRefresh: () => void,
) {
  useEffect(() => {
    if (!accessToken) {
      return;
    }
    const socket = getRealtimeSocket(accessToken);
    const bump = () => {
      onRefresh();
    };
    socket.on("friends:update", bump);
    const unsubs = (["SNAP", "REEL"] as PostFeedKind[]).map((kind) =>
      subscribePostsFeedChannel(accessToken, kind, bump),
    );
    const unsubRooms = subscribeRoomsCatalog(accessToken, bump);
    const unsubProfile = subscribeUserProfileUpdates(accessToken, bump);
    return () => {
      socket.off("friends:update", bump);
      for (const unsub of unsubs) {
        unsub();
      }
      unsubRooms();
      unsubProfile();
    };
  }, [accessToken, onRefresh]);
}

/** Reload public profile when friend relationship may have changed. */
export function usePublicProfileRealtime(
  accessToken: string | null,
  profileUserId: string | null,
  onRefresh: () => void,
) {
  useEffect(() => {
    if (!accessToken) {
      return;
    }
    const socket = getRealtimeSocket(accessToken);
    const bump = () => {
      onRefresh();
    };
    socket.on("friends:update", bump);
    const unsubs = (["SNAP", "REEL"] as PostFeedKind[]).map((kind) =>
      subscribePostsFeedChannel(accessToken, kind, bump),
    );
    const unsubProfile = subscribeUserProfileUpdates(accessToken, (payload) => {
      if (!profileUserId || payload.user?.id === profileUserId) {
        bump();
      }
    });
    return () => {
      socket.off("friends:update", bump);
      for (const unsub of unsubs) {
        unsub();
      }
      unsubProfile();
    };
  }, [accessToken, profileUserId, onRefresh]);
}

/** Live online status for a single user (e.g. on their public profile). */
export function useUserPresence(accessToken: string | null, userId: string | null) {
  const [status, setStatus] = useState<PresenceStatus>("offline");

  useEffect(() => {
    if (!accessToken || !userId) {
      return;
    }
    const socket = getRealtimeSocket(accessToken);
    const onPresenceUpdate = (payload: {
      userId?: string;
      status?: PresenceStatus;
      online?: boolean;
    }) => {
      if (payload?.userId !== userId) {
        return;
      }
      const next: PresenceStatus =
        payload.status ?? (payload.online ? "online" : "offline");
      setStatus(next);
    };
    socket.on("presence:update", onPresenceUpdate);
    socket.emit(
      "presence:watch",
      { userIds: [userId] },
      (ack?: { ok?: boolean; statuses?: Record<string, PresenceStatus> }) => {
        if (!ack?.ok || !ack.statuses?.[userId]) {
          return;
        }
        setStatus(ack.statuses[userId]);
      },
    );
    return () => {
      socket.off("presence:update", onPresenceUpdate);
    };
  }, [accessToken, userId]);

  return status;
}
