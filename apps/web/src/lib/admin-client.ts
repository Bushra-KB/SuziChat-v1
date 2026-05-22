import { apiJson } from "@/lib/api-auth-request";

export type AdminDashboard = {
  stats: Record<string, number>;
  recentUsers: AdminUser[];
  recentRooms: AdminRoom[];
  recentPosts: AdminPost[];
  recentGameSessions: AdminGameSession[];
};

export type AdminUser = {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatarUrl?: string | null;
  country?: string | null;
  role: "USER" | "ADMIN";
  isEmailVerified: boolean;
  isAdultConfirmed: boolean;
  createdAt: string;
  updatedAt?: string;
  _count?: Record<string, number>;
};

export type AdminRoom = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  imageUrl?: string | null;
  category: string;
  privacy: string;
  createdAt: string;
  updatedAt: string;
  owner?: { id?: string; username: string; displayName: string | null; email?: string };
  _count?: Record<string, number>;
};

export type AdminRoomCategory = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminMessage = {
  id: string;
  body: string;
  createdAt: string;
  room?: { id: string; slug: string; name: string };
  sender?: AdminPerson;
  recipient?: AdminPerson;
};

export type AdminPerson = {
  id: string;
  username: string;
  displayName: string | null;
  email?: string;
};

export type AdminPost = {
  id: string;
  kind: "SNAP" | "REEL";
  mediaUrl: string;
  title: string | null;
  caption: string | null;
  visibility: string;
  createdAt: string;
  updatedAt: string;
  author?: AdminPerson;
  _count?: Record<string, number>;
};

export type AdminPostComment = {
  id: string;
  body: string;
  createdAt: string;
  user?: AdminPerson;
  post?: { id: string; kind: string; title: string | null };
};

export type AdminGames = {
  lobbies: AdminGameLobby[];
  sessions: AdminGameSession[];
};

export type AdminGameLobby = {
  id: string;
  slug: string;
  gameType: string;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  owner?: { username: string; displayName: string | null; email?: string };
  _count?: Record<string, number>;
};

export type AdminGameSession = {
  id: string;
  gameType: string;
  status: string;
  winnerUserId: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt?: string | null;
  endedAt?: string | null;
  lobby?: { title: string; slug?: string; gameType?: string };
  winnerUser?: { username: string; displayName: string | null };
};

export type AdminDating = {
  profiles: AdminDatingProfile[];
  matches: AdminDatingMatch[];
};

export type AdminDatingProfile = {
  id: string;
  userId: string;
  age: number | null;
  gender: string | null;
  headline: string | null;
  isDiscoverable: boolean;
  updatedAt: string;
  user?: AdminPerson;
};

export type AdminDatingMatch = {
  id: string;
  createdAt: string;
  userA?: AdminPerson;
  userB?: AdminPerson;
  _count?: Record<string, number>;
};

export type AdminNotification = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  user?: AdminPerson;
};

function withQuery(path: string, query: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export function getAdminDashboard(accessToken: string) {
  return apiJson<AdminDashboard>("/v1/admin/dashboard", { method: "GET", accessToken });
}

export function listAdminUsers(accessToken: string, query: Record<string, string | undefined> = {}) {
  return apiJson<AdminUser[]>(withQuery("/v1/admin/users", query), { method: "GET", accessToken });
}

export function updateAdminUser(accessToken: string, id: string, payload: Partial<AdminUser>) {
  return apiJson<AdminUser>(`/v1/admin/users/${encodeURIComponent(id)}`, {
    method: "PATCH",
    accessToken,
    body: JSON.stringify(payload),
  });
}

export function deleteAdminUser(accessToken: string, id: string) {
  return apiJson<{ id: string }>(`/v1/admin/users/${encodeURIComponent(id)}`, { method: "DELETE", accessToken });
}

export function listAdminRooms(accessToken: string, query: Record<string, string | undefined> = {}) {
  return apiJson<AdminRoom[]>(withQuery("/v1/admin/rooms", query), { method: "GET", accessToken });
}

export function updateAdminRoom(accessToken: string, slug: string, payload: Partial<AdminRoom>) {
  return apiJson<AdminRoom>(`/v1/admin/rooms/${encodeURIComponent(slug)}`, {
    method: "PATCH",
    accessToken,
    body: JSON.stringify(payload),
  });
}

export function deleteAdminRoom(accessToken: string, slug: string) {
  return apiJson<{ id: string }>(`/v1/admin/rooms/${encodeURIComponent(slug)}`, { method: "DELETE", accessToken });
}

export function listAdminRoomCategories(accessToken: string) {
  return apiJson<AdminRoomCategory[]>("/v1/admin/room-categories", { method: "GET", accessToken });
}

export function createAdminRoomCategory(
  accessToken: string,
  payload: Pick<AdminRoomCategory, "name"> & Partial<AdminRoomCategory>,
) {
  return apiJson<AdminRoomCategory>("/v1/admin/room-categories", {
    method: "POST",
    accessToken,
    body: JSON.stringify(payload),
  });
}

export function updateAdminRoomCategory(accessToken: string, id: string, payload: Partial<AdminRoomCategory>) {
  return apiJson<AdminRoomCategory>(`/v1/admin/room-categories/${encodeURIComponent(id)}`, {
    method: "PATCH",
    accessToken,
    body: JSON.stringify(payload),
  });
}

export function deleteAdminRoomCategory(accessToken: string, id: string) {
  return apiJson<{ id: string }>(`/v1/admin/room-categories/${encodeURIComponent(id)}`, {
    method: "DELETE",
    accessToken,
  });
}

export function listAdminRoomMessages(accessToken: string, query: Record<string, string | undefined> = {}) {
  return apiJson<AdminMessage[]>(withQuery("/v1/admin/room-messages", query), { method: "GET", accessToken });
}

export function deleteAdminRoomMessage(accessToken: string, id: string) {
  return apiJson<{ id: string }>(`/v1/admin/room-messages/${encodeURIComponent(id)}`, { method: "DELETE", accessToken });
}

export function listAdminDirectMessages(accessToken: string, query: Record<string, string | undefined> = {}) {
  return apiJson<AdminMessage[]>(withQuery("/v1/admin/direct-messages", query), { method: "GET", accessToken });
}

export function deleteAdminDirectMessage(accessToken: string, id: string) {
  return apiJson<{ id: string }>(`/v1/admin/direct-messages/${encodeURIComponent(id)}`, { method: "DELETE", accessToken });
}

export function listAdminPosts(accessToken: string, query: Record<string, string | undefined> = {}) {
  return apiJson<AdminPost[]>(withQuery("/v1/admin/posts", query), { method: "GET", accessToken });
}

export function updateAdminPost(accessToken: string, id: string, payload: Partial<AdminPost>) {
  return apiJson<AdminPost>(`/v1/admin/posts/${encodeURIComponent(id)}`, {
    method: "PATCH",
    accessToken,
    body: JSON.stringify(payload),
  });
}

export function deleteAdminPost(accessToken: string, id: string) {
  return apiJson<{ id: string }>(`/v1/admin/posts/${encodeURIComponent(id)}`, { method: "DELETE", accessToken });
}

export function listAdminPostComments(accessToken: string, query: Record<string, string | undefined> = {}) {
  return apiJson<AdminPostComment[]>(withQuery("/v1/admin/post-comments", query), { method: "GET", accessToken });
}

export function deleteAdminPostComment(accessToken: string, id: string) {
  return apiJson<{ id: string }>(`/v1/admin/post-comments/${encodeURIComponent(id)}`, { method: "DELETE", accessToken });
}

export function listAdminGames(accessToken: string) {
  return apiJson<AdminGames>("/v1/admin/games", { method: "GET", accessToken });
}

export function closeAdminGameSession(accessToken: string, id: string) {
  return apiJson<AdminGameSession>(`/v1/admin/games/sessions/${encodeURIComponent(id)}/close`, {
    method: "POST",
    accessToken,
  });
}

export function deleteAdminGameLobby(accessToken: string, id: string) {
  return apiJson<{ id: string }>(`/v1/admin/games/lobbies/${encodeURIComponent(id)}`, { method: "DELETE", accessToken });
}

export function listAdminDating(accessToken: string) {
  return apiJson<AdminDating>("/v1/admin/dating", { method: "GET", accessToken });
}

export function updateAdminDatingProfile(accessToken: string, id: string, payload: Partial<AdminDatingProfile>) {
  return apiJson<AdminDatingProfile>(`/v1/admin/dating/profiles/${encodeURIComponent(id)}`, {
    method: "PATCH",
    accessToken,
    body: JSON.stringify(payload),
  });
}

export function deleteAdminDatingProfile(accessToken: string, id: string) {
  return apiJson<{ id: string }>(`/v1/admin/dating/profiles/${encodeURIComponent(id)}`, {
    method: "DELETE",
    accessToken,
  });
}

export function deleteAdminDatingMatch(accessToken: string, id: string) {
  return apiJson<{ id: string }>(`/v1/admin/dating/matches/${encodeURIComponent(id)}`, {
    method: "DELETE",
    accessToken,
  });
}

export function listAdminNotifications(accessToken: string) {
  return apiJson<AdminNotification[]>("/v1/admin/notifications", { method: "GET", accessToken });
}

export function createAdminNotification(
  accessToken: string,
  payload: { title: string; body: string; userId?: string; broadcast?: boolean },
) {
  return apiJson<AdminNotification | { ok: true; sent: number }>("/v1/admin/notifications", {
    method: "POST",
    accessToken,
    body: JSON.stringify(payload),
  });
}
