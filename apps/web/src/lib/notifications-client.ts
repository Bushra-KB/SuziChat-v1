import { apiJson } from "@/lib/api-auth-request";

export type ApiNotification = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};

export async function listNotifications(accessToken: string) {
  return apiJson<ApiNotification[]>("/v1/notifications", {
    method: "GET",
    accessToken,
  });
}

export async function markNotificationRead(accessToken: string, id: string) {
  return apiJson<{ id: string; read: boolean }>(
    `/v1/notifications/${encodeURIComponent(id)}/read`,
    { method: "PATCH", accessToken },
  );
}

export async function markAllNotificationsRead(accessToken: string) {
  return apiJson<{ updated: number }>("/v1/notifications/read-all", {
    method: "POST",
    accessToken,
  });
}
