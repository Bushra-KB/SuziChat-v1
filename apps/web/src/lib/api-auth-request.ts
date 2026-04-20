import { getApiBaseUrl } from "@/lib/api-base-url";

export async function apiJson<T>(
  path: string,
  init: RequestInit & { accessToken?: string | null } = {},
): Promise<T> {
  const { accessToken, headers: hdr, ...rest } = init;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(hdr ?? {}),
  };
  if (accessToken) {
    (headers as Record<string, string>).Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...rest,
    headers,
  });

  if (!response.ok) {
    let message = "Request failed";
    try {
      const payload = (await response.json()) as { message?: string | string[] };
      const m = Array.isArray(payload?.message) ? payload?.message[0] : payload?.message;
      if (m) {
        message = m;
      }
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
