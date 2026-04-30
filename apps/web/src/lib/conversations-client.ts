import { apiJson } from "@/lib/api-auth-request";

export type PeerSummary = {
  id: string;
  username: string;
  displayName: string | null;
  country: string | null;
  avatarUrl?: string | null;
};

export type ConversationThread = {
  peer: PeerSummary;
  lastMessage: { id: string; body: string; createdAt: string; senderId: string };
};

export type DirectMessageRow = {
  id: string;
  body: string;
  createdAt: string;
  sender: PeerSummary;
  recipient: { id: string };
};

export async function listConversationThreads(accessToken: string) {
  return apiJson<ConversationThread[]>("/v1/conversations", {
    method: "GET",
    accessToken,
  });
}

export async function listDirectMessages(accessToken: string, peerId: string) {
  return apiJson<DirectMessageRow[]>(
    `/v1/conversations/${encodeURIComponent(peerId)}/messages`,
    { method: "GET", accessToken },
  );
}

export async function sendDirectMessage(accessToken: string, peerId: string, body: string) {
  return apiJson<DirectMessageRow>(
    `/v1/conversations/${encodeURIComponent(peerId)}/messages`,
    {
      method: "POST",
      accessToken,
      body: JSON.stringify({ body }),
    },
  );
}

export async function getConversationPeer(accessToken: string, peerId: string) {
  return apiJson<PeerSummary>(`/v1/conversations/peers/${encodeURIComponent(peerId)}`, {
    method: "GET",
    accessToken,
  });
}
