import { apiJson } from "@/lib/api-auth-request";

export type FriendSummaryUser = {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
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
