import { apiJson } from "@/lib/api-auth-request";

export type FriendSummaryUser = {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatarUrl?: string | null;
  country: string | null;
};

export type FriendsSummary = {
  friends: Array<
    FriendSummaryUser & {
      friendshipId: string;
      createdAt: string;
    }
  >;
  incomingRequests: Array<{
    id: string;
    createdAt: string;
    user: FriendSummaryUser;
  }>;
  outgoingRequests: Array<{
    id: string;
    createdAt: string;
    user: FriendSummaryUser;
  }>;
};

export type BlockedUserRow = {
  id: string;
  createdAt: string;
  user: FriendSummaryUser;
};

export async function getFriendsSummary(accessToken: string) {
  return apiJson<FriendsSummary>("/v1/friends", {
    method: "GET",
    accessToken,
  });
}

export async function sendFriendRequest(accessToken: string, usernameOrEmail: string) {
  return apiJson<{ id: string; createdAt: string; user: FriendSummaryUser }>(
    "/v1/friends/requests",
    {
      method: "POST",
      accessToken,
      body: JSON.stringify({ usernameOrEmail }),
    },
  );
}

export async function acceptFriendRequest(accessToken: string, requestId: string) {
  return apiJson<{ message: string; user: FriendSummaryUser }>(
    `/v1/friends/requests/${encodeURIComponent(requestId)}/accept`,
    { method: "POST", accessToken },
  );
}

export async function declineFriendRequest(accessToken: string, requestId: string) {
  return apiJson<{ message: string }>(
    `/v1/friends/requests/${encodeURIComponent(requestId)}/decline`,
    { method: "POST", accessToken },
  );
}

export async function unfriend(accessToken: string, friendId: string) {
  return apiJson<{ message: string }>(`/v1/friends/${encodeURIComponent(friendId)}`, {
    method: "DELETE",
    accessToken,
  });
}

export async function cancelOutgoingFriendRequest(accessToken: string, requestId: string) {
  return apiJson<{ message: string }>(
    `/v1/friends/requests/${encodeURIComponent(requestId)}`,
    {
      method: "DELETE",
      accessToken,
    },
  );
}

export async function getSuggestedPeople(accessToken: string, take = 12) {
  const q = new URLSearchParams({ take: String(take) });
  return apiJson<FriendSummaryUser[]>(`/v1/friends/suggestions?${q.toString()}`, {
    method: "GET",
    accessToken,
  });
}

export async function explorePeople(accessToken: string, query: string, take = 24) {
  const q = new URLSearchParams({ q: query, take: String(take) });
  return apiJson<FriendSummaryUser[]>(`/v1/friends/explore?${q.toString()}`, {
    method: "GET",
    accessToken,
  });
}

export async function listBlockedPeople(accessToken: string) {
  return apiJson<BlockedUserRow[]>("/v1/friends/blocked", {
    method: "GET",
    accessToken,
  });
}

export async function blockPerson(accessToken: string, userId: string) {
  return apiJson<{ message: string; user: FriendSummaryUser }>(
    `/v1/friends/blocked/${encodeURIComponent(userId)}`,
    {
      method: "POST",
      accessToken,
    },
  );
}

export async function unblockPerson(accessToken: string, userId: string) {
  return apiJson<{ message: string }>(
    `/v1/friends/blocked/${encodeURIComponent(userId)}`,
    {
      method: "DELETE",
      accessToken,
    },
  );
}
