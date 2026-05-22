import { apiJson } from "@/lib/api-auth-request";

export type DatingSwipeAction = "LIKE" | "PASS";

export type DatingUserCard = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  country: string | null;
  bio: string | null;
};

export type DatingProfilePayload = {
  id: string;
  userId: string;
  age: number | null;
  gender: string | null;
  headline: string | null;
  datingBio: string | null;
  interests: string[];
  photoUrl: string | null;
  minAgePref: number;
  maxAgePref: number;
  seekGender: string;
  isDiscoverable: boolean;
  createdAt: string;
  updatedAt: string;
  user?: DatingUserCard;
};

export type DatingDiscoverItem = DatingProfilePayload & {
  user: DatingUserCard;
  viewerSwipeAction?: DatingSwipeAction | null;
  isMatched?: boolean;
};

export type DatingMatchRow = {
  id: string;
  createdAt: string;
  peer: {
    user: DatingUserCard;
    dating: {
      age: number | null;
      gender: string | null;
      headline: string | null;
      datingBio: string | null;
      interests: string[];
      photoUrl: string | null;
    } | null;
  };
  lastMessage: {
    id: string;
    body: string;
    createdAt: string;
    senderId: string;
  } | null;
};

export type DatingMessageRow = {
  id: string;
  body: string;
  createdAt: string;
  senderId: string;
  sender: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
};

export async function getMyDatingProfile(accessToken: string) {
  return apiJson<{ profile: DatingProfilePayload | null }>("/v1/dating/me/profile", {
    method: "GET",
    accessToken,
  });
}

export async function upsertMyDatingProfile(
  accessToken: string,
  payload: {
    age?: number;
    gender?: string;
    headline?: string;
    datingBio?: string;
    interests?: string[];
    photoUrl?: string;
    minAgePref?: number;
    maxAgePref?: number;
    seekGender?: string;
    isDiscoverable?: boolean;
  },
) {
  return apiJson<{ profile: DatingProfilePayload & { interests: string[]; user: DatingUserCard } }>(
    "/v1/dating/me/profile",
    {
      method: "PUT",
      accessToken,
      body: JSON.stringify(payload),
    },
  );
}

export type DatingSummary = {
  hasProfile: boolean;
  isDiscoverable: boolean;
  matchCount: number;
  likesReceivedCount: number;
  preview: Array<{
    userId: string;
    photoUrl: string | null;
    avatarUrl: string | null;
    displayName: string | null;
    username: string;
  }>;
};

export async function getDatingSummary(accessToken: string) {
  return apiJson<DatingSummary>("/v1/dating/summary", {
    method: "GET",
    accessToken,
  });
}

export async function listDatingLikesReceived(accessToken: string) {
  return apiJson<{ items: DatingDiscoverItem[] }>("/v1/dating/likes-received", {
    method: "GET",
    accessToken,
  });
}

export async function listDatingLikesSent(accessToken: string) {
  return apiJson<{ items: DatingDiscoverItem[] }>("/v1/dating/likes-sent", {
    method: "GET",
    accessToken,
  });
}

export async function discoverDating(
  accessToken: string,
  params: {
    minAge?: number;
    maxAge?: number;
    gender?: string;
    country?: string;
    search?: string;
    take?: number;
    skip?: number;
  },
) {
  const q = new URLSearchParams();
  if (params.minAge !== undefined) {
    q.set("minAge", String(params.minAge));
  }
  if (params.maxAge !== undefined) {
    q.set("maxAge", String(params.maxAge));
  }
  if (params.gender) {
    q.set("gender", params.gender);
  }
  if (params.country) {
    q.set("country", params.country);
  }
  if (params.search) {
    q.set("search", params.search);
  }
  if (params.take !== undefined) {
    q.set("take", String(params.take));
  }
  if (params.skip !== undefined) {
    q.set("skip", String(params.skip));
  }
  const suffix = q.toString() ? `?${q.toString()}` : "";
  return apiJson<{ items: DatingDiscoverItem[]; hasMore?: boolean }>(`/v1/dating/discover${suffix}`, {
    method: "GET",
    accessToken,
  });
}

export async function datingSwipe(
  accessToken: string,
  payload: { toUserId: string; action: DatingSwipeAction },
) {
  return apiJson<{
    matched: boolean;
    match: {
      id: string;
      createdAt: string;
      peer: DatingMatchRow["peer"];
    } | null;
  }>("/v1/dating/swipes", {
    method: "POST",
    accessToken,
    body: JSON.stringify(payload),
  });
}

export async function deleteDatingSwipe(accessToken: string, toUserId: string) {
  return apiJson<{ ok: boolean }>(`/v1/dating/swipes/${encodeURIComponent(toUserId)}`, {
    method: "DELETE",
    accessToken,
  });
}

export async function listDatingMatches(accessToken: string) {
  return apiJson<{ matches: DatingMatchRow[] }>("/v1/dating/matches", {
    method: "GET",
    accessToken,
  });
}

export async function deleteDatingMatch(accessToken: string, matchId: string) {
  return apiJson<{ ok: boolean }>(`/v1/dating/matches/${encodeURIComponent(matchId)}`, {
    method: "DELETE",
    accessToken,
  });
}

export async function listDatingMessages(accessToken: string, matchId: string, take = 120) {
  const q = new URLSearchParams({ take: String(take) });
  return apiJson<{ messages: DatingMessageRow[] }>(
    `/v1/dating/matches/${encodeURIComponent(matchId)}/messages?${q.toString()}`,
    {
      method: "GET",
      accessToken,
    },
  );
}

export async function sendDatingMessage(accessToken: string, matchId: string, body: string) {
  return apiJson<{ message: DatingMessageRow }>(
    `/v1/dating/matches/${encodeURIComponent(matchId)}/messages`,
    {
      method: "POST",
      accessToken,
      body: JSON.stringify({ body }),
    },
  );
}

export async function getDatingUserProfile(accessToken: string, userId: string) {
  return apiJson<{ profile: DatingProfilePayload & { interests: string[]; user: DatingUserCard } | null }>(
    `/v1/dating/users/${encodeURIComponent(userId)}`,
    {
      method: "GET",
      accessToken,
    },
  );
}
