import { apiJson } from "@/lib/api-auth-request";

export type PostKind = "SNAP" | "REEL";

export type ApiPost = {
  id: string;
  kind: PostKind;
  mediaUrl: string;
  title: string | null;
  caption: string | null;
  visibility: string;
  createdAt: string;
  author: {
    id: string;
    username: string;
    displayName: string | null;
  };
};

export async function listPosts(kind: PostKind, take = 40) {
  const q = new URLSearchParams({ kind, take: String(take) });
  return apiJson<ApiPost[]>(`/v1/posts?${q.toString()}`, { method: "GET" });
}

export async function getPost(id: string) {
  return apiJson<ApiPost>(`/v1/posts/${encodeURIComponent(id)}`, { method: "GET" });
}

export async function createPost(
  accessToken: string,
  payload: {
    kind: PostKind;
    mediaUrl: string;
    title?: string;
    caption?: string;
    visibility?: string;
  },
) {
  return apiJson<ApiPost>("/v1/posts", {
    method: "POST",
    accessToken,
    body: JSON.stringify(payload),
  });
}
