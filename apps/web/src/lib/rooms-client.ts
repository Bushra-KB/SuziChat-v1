import { apiJson } from "@/lib/api-auth-request";

export type ApiRoom = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  category: string;
  privacy: string;
  createdAt: string;
  owner: { id: string; username: string; displayName: string | null };
  _count?: { messages: number; memberships: number };
  actor?: {
    isMember: boolean;
    hasPendingRequest: boolean;
    isBlocked?: boolean;
    action: "open" | "join" | "request" | "requested" | "blocked";
  };
};

export type ApiRoomMessage = {
  id: string;
  body: string;
  createdAt: string;
  sender: {
    id: string;
    username: string;
    displayName: string | null;
  };
};

export type ApiRoomAccess = {
  roomSlug: string;
  isOwner: boolean;
  isMember: boolean;
  isBlocked: boolean;
  hasPendingRequest: boolean;
  canOpen: boolean;
  canPost: boolean;
  privacy: string;
};

export type ApiRoomManagement = {
  members: Array<{
    userId: string;
    role: string;
    joinedAt: string;
    user: { id: string; username: string; displayName: string | null };
  }>;
  pendingRequests: Array<{
    userId: string;
    createdAt: string;
    user: { id: string; username: string; displayName: string | null };
  }>;
  bannedUsers: Array<{
    userId: string;
    reason: string | null;
    createdAt: string;
    user: { id: string; username: string; displayName: string | null };
  }>;
};

export async function listRooms() {
  return apiJson<ApiRoom[]>("/v1/rooms", { method: "GET" });
}

export async function listRoomCategories() {
  return apiJson<string[]>("/v1/rooms/categories", { method: "GET" });
}

export async function listRoomsForMe(accessToken: string) {
  return apiJson<ApiRoom[]>("/v1/rooms/me/list", {
    method: "GET",
    accessToken,
  });
}

export async function getRoom(slug: string) {
  return apiJson<ApiRoom>(`/v1/rooms/${encodeURIComponent(slug)}`, {
    method: "GET",
  });
}

export async function listRoomMessages(slug: string) {
  return apiJson<ApiRoomMessage[]>(
    `/v1/rooms/${encodeURIComponent(slug)}/messages`,
    { method: "GET" },
  );
}

export async function listMyRoomMessages(accessToken: string, slug: string) {
  return apiJson<ApiRoomMessage[]>(
    `/v1/rooms/${encodeURIComponent(slug)}/me/messages`,
    {
      method: "GET",
      accessToken,
    },
  );
}

export async function postRoomMessage(accessToken: string, slug: string, body: string) {
  return apiJson<ApiRoomMessage>(
    `/v1/rooms/${encodeURIComponent(slug)}/messages`,
    {
      method: "POST",
      accessToken,
      body: JSON.stringify({ body }),
    },
  );
}

export async function createRoom(
  accessToken: string,
  payload: {
    name: string;
    slug?: string;
    description?: string;
    imageUrl?: string;
    category?: string;
    privacy?: "Public" | "Friends" | "Private";
  },
) {
  return apiJson<ApiRoom>("/v1/rooms", {
    method: "POST",
    accessToken,
    body: JSON.stringify(payload),
  });
}

export async function joinRoom(accessToken: string, slug: string) {
  return apiJson<{ status: "member" }>(`/v1/rooms/${encodeURIComponent(slug)}/join`, {
    method: "POST",
    accessToken,
  });
}

export async function requestRoomAccess(accessToken: string, slug: string) {
  return apiJson<{ status: "member" | "requested" }>(
    `/v1/rooms/${encodeURIComponent(slug)}/request-access`,
    {
      method: "POST",
      accessToken,
    },
  );
}

export async function cancelRoomJoinRequest(accessToken: string, slug: string) {
  return apiJson<{ status: "cancelled" | "none" | "member" }>(
    `/v1/rooms/${encodeURIComponent(slug)}/cancel-request`,
    {
      method: "POST",
      accessToken,
    },
  );
}

export async function leaveRoom(accessToken: string, slug: string) {
  return apiJson<{ status: "left" }>(`/v1/rooms/${encodeURIComponent(slug)}/leave`, {
    method: "POST",
    accessToken,
  });
}

export async function getRoomAccess(accessToken: string, slug: string) {
  return apiJson<ApiRoomAccess>(`/v1/rooms/${encodeURIComponent(slug)}/me/access`, {
    method: "GET",
    accessToken,
  });
}

export async function getRoomManagement(accessToken: string, slug: string) {
  return apiJson<ApiRoomManagement>(`/v1/rooms/${encodeURIComponent(slug)}/manage`, {
    method: "GET",
    accessToken,
  });
}

export async function approveRoomJoinRequest(accessToken: string, slug: string, userId: string) {
  return apiJson<{ status: "member" }>(
    `/v1/rooms/${encodeURIComponent(slug)}/manage/requests/${encodeURIComponent(userId)}/approve`,
    { method: "POST", accessToken },
  );
}

export async function rejectRoomJoinRequest(accessToken: string, slug: string, userId: string) {
  return apiJson<{ status: "rejected" }>(
    `/v1/rooms/${encodeURIComponent(slug)}/manage/requests/${encodeURIComponent(userId)}/reject`,
    { method: "POST", accessToken },
  );
}

export async function removeRoomMember(accessToken: string, slug: string, userId: string) {
  return apiJson<{ status: "removed" }>(
    `/v1/rooms/${encodeURIComponent(slug)}/manage/members/${encodeURIComponent(userId)}/remove`,
    { method: "POST", accessToken },
  );
}

export async function banRoomMember(accessToken: string, slug: string, userId: string) {
  return apiJson<{ status: "banned" }>(
    `/v1/rooms/${encodeURIComponent(slug)}/manage/members/${encodeURIComponent(userId)}/ban`,
    { method: "POST", accessToken },
  );
}

export async function unbanRoomMember(accessToken: string, slug: string, userId: string) {
  return apiJson<{ status: "unbanned" }>(
    `/v1/rooms/${encodeURIComponent(slug)}/manage/bans/${encodeURIComponent(userId)}/unban`,
    { method: "POST", accessToken },
  );
}

export async function updateRoom(
  accessToken: string,
  slug: string,
  payload: {
    name?: string;
    description?: string;
    category?: string;
    imageUrl?: string;
    privacy?: "Public" | "Friends" | "Private";
  },
) {
  return apiJson<ApiRoom>(`/v1/rooms/${encodeURIComponent(slug)}`, {
    method: "PATCH",
    accessToken,
    body: JSON.stringify(payload),
  });
}

export async function deleteRoom(accessToken: string, slug: string) {
  return apiJson<{ status: "deleted" }>(`/v1/rooms/${encodeURIComponent(slug)}`, {
    method: "DELETE",
    accessToken,
  });
}
