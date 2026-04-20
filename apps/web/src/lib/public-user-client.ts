import { apiJson } from "@/lib/api-auth-request";

export type PublicUser = {
  id: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  country: string | null;
  createdAt: string;
};

export async function getPublicUserByUsername(username: string) {
  return apiJson<PublicUser>(
    `/v1/public/users/${encodeURIComponent(username)}`,
    { method: "GET" },
  );
}
