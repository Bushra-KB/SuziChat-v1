import { getApiBaseUrl } from "@/lib/api-base-url";

export type FriendUser = {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  country: string | null;
};

export type FriendSummary = {
  friends: Array<
    FriendUser & {
      friendshipId: string;
      createdAt: string;
    }
  >;
  incomingRequests: Array<{
    id: string;
    createdAt: string;
    user: FriendUser;
  }>;
  outgoingRequests: Array<{
    id: string;
    createdAt: string;
    user: FriendUser;
  }>;
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

export function getFriendSummary(accessToken: string) {
  return request<FriendSummary>("/v1/friends", accessToken);
}

export function sendFriendRequest(
  accessToken: string,
  usernameOrEmail: string,
) {
  return request<{ id: string }>("/v1/friends/requests", accessToken, {
    method: "POST",
    body: JSON.stringify({ usernameOrEmail }),
  });
}

export function acceptFriendRequest(accessToken: string, requestId: string) {
  return request<{ message: string }>(
    `/v1/friends/requests/${requestId}/accept`,
    accessToken,
    {
      method: "POST",
    },
  );
}

export function declineFriendRequest(accessToken: string, requestId: string) {
  return request<{ message: string }>(
    `/v1/friends/requests/${requestId}/decline`,
    accessToken,
    {
      method: "POST",
    },
  );
}

export function unfriend(accessToken: string, friendId: string) {
  return request<{ message: string }>(`/v1/friends/${friendId}`, accessToken, {
    method: "DELETE",
  });
}
