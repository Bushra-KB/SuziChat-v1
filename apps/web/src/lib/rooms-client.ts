import { apiJson } from "@/lib/api-auth-request";

export type ApiRoom = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  privacy: string;
  createdAt: string;
  owner: { id: string; username: string; displayName: string | null };
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

export async function listRooms() {
  return apiJson<ApiRoom[]>("/v1/rooms", { method: "GET" });
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
