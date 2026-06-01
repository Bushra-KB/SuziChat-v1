import { uploadFormWithProgress } from "@/lib/api-upload";
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
    avatarUrl?: string | null;
  };
  _count?: {
    likes: number;
    comments: number;
    views: number;
  };
};

export type ApiPostEngagement = {
  postId: string;
  likes: number;
  comments: number;
  views: number;
  likedByMe?: boolean;
};

export type ApiPostComment = {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl?: string | null;
  };
};

export async function listPosts(kind: PostKind, take = 40) {
  const q = new URLSearchParams({ kind, take: String(take) });
  return apiJson<ApiPost[]>(`/v1/posts?${q.toString()}`, { method: "GET" });
}

export async function listMyPosts(accessToken: string, kind: PostKind, take = 40) {
  const q = new URLSearchParams({ kind, take: String(take) });
  return apiJson<ApiPost[]>(`/v1/posts/me/list?${q.toString()}`, {
    method: "GET",
    accessToken,
  });
}

/** Only posts created by the signed-in user (for profile management). */
export async function listMyAuthoredPosts(accessToken: string, kind: PostKind, take = 40) {
  const q = new URLSearchParams({ kind, take: String(take) });
  return apiJson<ApiPost[]>(`/v1/posts/me/authored?${q.toString()}`, {
    method: "GET",
    accessToken,
  });
}

/** Snaps/reels by another user visible to the signed-in viewer (profile page). */
export async function listUserProfilePosts(
  accessToken: string,
  userId: string,
  kind: PostKind,
  take = 40,
) {
  const q = new URLSearchParams({ kind, take: String(take) });
  return apiJson<ApiPost[]>(
    `/v1/posts/user/${encodeURIComponent(userId)}?${q.toString()}`,
    { method: "GET", accessToken },
  );
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

export async function uploadReelVideo(
  accessToken: string,
  file: File,
  onProgress?: (percent: number) => void,
) {
  const form = new FormData();
  form.append("file", file);
  return uploadFormWithProgress<{ mediaUrl: string }>("/v1/posts/upload/reel", form, {
    accessToken,
    onProgress,
  });
}

export async function uploadSnapImage(
  accessToken: string,
  file: File,
  onProgress?: (percent: number) => void,
) {
  const form = new FormData();
  form.append("file", file);
  return uploadFormWithProgress<{ mediaUrl: string }>("/v1/posts/upload/snap", form, {
    accessToken,
    onProgress,
  });
}

export async function togglePostLike(accessToken: string, postId: string) {
  return apiJson<ApiPostEngagement>(`/v1/posts/${encodeURIComponent(postId)}/like`, {
    method: "POST",
    accessToken,
  });
}

export async function trackPostView(accessToken: string, postId: string) {
  return apiJson<ApiPostEngagement>(`/v1/posts/${encodeURIComponent(postId)}/view`, {
    method: "POST",
    accessToken,
  });
}

export async function getPostEngagement(accessToken: string, postId: string) {
  return apiJson<ApiPostEngagement>(`/v1/posts/${encodeURIComponent(postId)}/engagement`, {
    method: "GET",
    accessToken,
  });
}

export async function listPostComments(accessToken: string, postId: string, take = 80) {
  const q = new URLSearchParams({ take: String(take) });
  return apiJson<ApiPostComment[]>(
    `/v1/posts/${encodeURIComponent(postId)}/comments?${q.toString()}`,
    { method: "GET", accessToken },
  );
}

export async function createPostComment(accessToken: string, postId: string, body: string) {
  return apiJson<{ comment: ApiPostComment; engagement: ApiPostEngagement }>(
    `/v1/posts/${encodeURIComponent(postId)}/comments`,
    {
      method: "POST",
      accessToken,
      body: JSON.stringify({ body }),
    },
  );
}

export async function deleteMyPost(accessToken: string, postId: string) {
  return apiJson<{ status: "deleted"; id: string }>(
    `/v1/posts/${encodeURIComponent(postId)}`,
    {
      method: "DELETE",
      accessToken,
    },
  );
}
