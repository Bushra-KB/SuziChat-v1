import type { AuthUser } from "@/lib/auth-client";
import { getApiBaseUrl } from "@/lib/api-base-url";

type ProfilePayload = Pick<AuthUser, "displayName"> & {
  bio: string | null;
  country: string | null;
};

async function request<T>(
  path: string,
  accessToken: string,
  options: RequestInit = {},
) {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    let message = "Request failed";

    try {
      const payload = (await response.json()) as { message?: string | string[] };
      message = Array.isArray(payload.message)
        ? payload.message[0] ?? message
        : payload.message ?? message;
    } catch {
      message = "Request failed";
    }

    throw new Error(message);
  }

  return (await response.json()) as T;
}

export function getMyProfile(accessToken: string) {
  return request<ProfilePayload>("/v1/users/me/profile", accessToken);
}

export function updateMyProfile(
  accessToken: string,
  payload: {
    displayName?: string;
    bio?: string;
    country?: string;
  },
) {
  return request<ProfilePayload>("/v1/users/me/profile", accessToken, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
