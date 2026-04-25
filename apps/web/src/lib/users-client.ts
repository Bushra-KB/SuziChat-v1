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

export function parseUsersApiError(error: unknown): string {
  return normalizeErrorMessage(error);
}
