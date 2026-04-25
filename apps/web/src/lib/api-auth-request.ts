import { getApiBaseUrl } from "@/lib/api-base-url";
import { clearAuthSession, getStoredAuthSession, refresh, saveAuthSession } from "@/lib/auth-client";

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const session = getStoredAuthSession();
  if (!session?.refreshToken) {
    return null;
  }
  if (!refreshInFlight) {
    refreshInFlight = refresh({ refreshToken: session.refreshToken })
      .then((next) => {
        saveAuthSession(next);
        return next.accessToken;
      })
      .catch(() => {
        clearAuthSession();
        return null;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

export async function apiJson<T>(
  path: string,
  init: RequestInit & { accessToken?: string | null } = {},
): Promise<T> {
  const { accessToken, headers: hdr, ...rest } = init;

  const run = async (token?: string | null) => {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(hdr ?? {}),
    };
    if (token) {
      (headers as Record<string, string>).Authorization = `Bearer ${token}`;
    }
    return fetch(`${getApiBaseUrl()}${path}`, {
      ...rest,
      headers,
    });
  };

  let response = await run(accessToken);
  if (response.status === 401 && accessToken) {
    const nextToken = await refreshAccessToken();
    if (nextToken) {
      response = await run(nextToken);
    }
  }

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
