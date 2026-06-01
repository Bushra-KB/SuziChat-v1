"use client";

import type { Socket } from "socket.io-client";
import { getRealtimeSocket } from "@/lib/realtime-client";

export type PostFeedKind = "REEL" | "SNAP";
export type RealtimeUserProfile = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  country?: string | null;
  updatedAt?: string;
};

export function subscribePostsFeedChannel(
  accessToken: string,
  kind: PostFeedKind,
  onFeedUpdate: () => void,
): () => void {
  const socket = getRealtimeSocket(accessToken);
  const subscribe = () => {
    socket.emit("posts:feed:subscribe", { kind });
  };
  socket.on("connect", subscribe);
  socket.on("posts:feed:update", onFeedUpdate);
  if (socket.connected) {
    subscribe();
  }
  return () => {
    socket.off("connect", subscribe);
    socket.off("posts:feed:update", onFeedUpdate);
  };
}

export function watchPostsEngagement(
  accessToken: string,
  postIds: string[],
  onEngagement: (payload: {
    postId?: string;
    likes?: number;
    comments?: number;
    views?: number;
  }) => void,
): () => void {
  if (postIds.length === 0) {
    return () => {};
  }
  const socket = getRealtimeSocket(accessToken);
  const watch = () => {
    for (const postId of postIds) {
      socket.emit("post:watch", { postId });
    }
  };
  socket.on("connect", watch);
  socket.on("post:engagement", onEngagement);
  if (socket.connected) {
    watch();
  }
  return () => {
    socket.off("connect", watch);
    socket.off("post:engagement", onEngagement);
  };
}

export function subscribeRoomsCatalog(
  accessToken: string,
  onUpdate: () => void,
): () => void {
  const socket = getRealtimeSocket(accessToken);
  const subscribe = () => {
    socket.emit("rooms:catalog:subscribe", {});
  };
  socket.on("connect", subscribe);
  socket.on("rooms:update", onUpdate);
  if (socket.connected) {
    subscribe();
  }
  return () => {
    socket.off("connect", subscribe);
    socket.off("rooms:update", onUpdate);
  };
}

export function subscribeUserProfileUpdates(
  accessToken: string,
  onUpdate: (payload: { user?: RealtimeUserProfile }) => void,
): () => void {
  const socket = getRealtimeSocket(accessToken);
  socket.on("user:profile:update", onUpdate);
  return () => {
    socket.off("user:profile:update", onUpdate);
  };
}

export function bindSocketConnect(socket: Socket, handler: () => void): () => void {
  socket.on("connect", handler);
  if (socket.connected) {
    handler();
  }
  return () => {
    socket.off("connect", handler);
  };
}
