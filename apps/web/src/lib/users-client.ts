import { apiFormJson } from "@/lib/api-auth-request";
import { getApiBaseUrl } from "@/lib/api-base-url";

export type UserProfile = {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  country: string | null;
  role: "USER" | "ADMIN";
  isAdultConfirmed: boolean;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProfileRelationship =
  | { kind: "self" }
  | { kind: "none" }
  | { kind: "blocked_by_me" }
  | { kind: "blocked_you" }
  | { kind: "friends"; friendsSince: string }
  | { kind: "outgoing_request"; requestId: string; createdAt: string }
  | { kind: "incoming_request"; requestId: string; createdAt: string };

export type UserProfileView = {
  profile: UserProfile;
  relationship: ProfileRelationship;
  counts: {
    friends: number;
    rooms: number;
    snaps: number;
    reels: number;
  };
};

function normalizeErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

async function authedRequest<T>(path: string, accessToken: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    let message = "Request failed";
    try {
      const payload = (await response.json()) as { message?: string | string[] };
      const m = Array.isArray(payload?.message) ? payload?.message[0] : payload?.message;
      if (m) {
        message = m;
      }
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export async function getMyProfile(accessToken: string) {
  return authedRequest<UserProfile>("/v1/users/me/profile", accessToken, { method: "GET" });
}

export async function updateMyProfile(
  accessToken: string,
  payload: { displayName?: string; bio?: string; country?: string; avatarUrl?: string },
) {
  return authedRequest<UserProfile>("/v1/users/me/profile", accessToken, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function uploadProfileAvatar(accessToken: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  return apiFormJson<UserProfile>("/v1/users/me/profile/avatar", form, {
    accessToken,
  });
}

export async function getUserProfileView(accessToken: string, username: string) {
  return authedRequest<UserProfileView>(
    `/v1/users/${encodeURIComponent(username)}/profile`,
    accessToken,
    { method: "GET" },
  );
}

export async function getUserProfileViewByUserId(accessToken: string, userId: string) {
  return authedRequest<UserProfileView>(
    `/v1/users/u/${encodeURIComponent(userId)}/profile`,
    accessToken,
    { method: "GET" },
  );
}

export function parseUsersApiError(error: unknown): string {
  return normalizeErrorMessage(error);
}
