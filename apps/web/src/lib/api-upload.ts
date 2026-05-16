import { getApiBaseUrl } from "@/lib/api-base-url";
import { clearAuthSession, getStoredAuthSession, refresh, saveAuthSession } from "@/lib/auth-client";

export type UploadProgressHandler = (percent: number) => void;

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

function parseUploadErrorMessage(xhr: XMLHttpRequest, fallback: string): string {
  try {
    const payload = JSON.parse(xhr.responseText) as { message?: string | string[] };
    const message = Array.isArray(payload?.message) ? payload.message[0] : payload.message;
    if (message) {
      return message;
    }
  } catch {
    // ignore
  }
  return fallback;
}

function uploadFormOnce<T>(
  path: string,
  formData: FormData,
  accessToken: string | null | undefined,
  onProgress?: UploadProgressHandler,
): Promise<{ ok: true; data: T } | { ok: false; status: number; message: string }> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${getApiBaseUrl()}${path}`);

    if (accessToken) {
      xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    }

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) {
        return;
      }
      const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
      onProgress(percent);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText) as T;
          onProgress?.(100);
          resolve({ ok: true, data });
          return;
        } catch {
          resolve({ ok: false, status: xhr.status, message: "Invalid upload response" });
          return;
        }
      }
      resolve({
        ok: false,
        status: xhr.status,
        message: parseUploadErrorMessage(xhr, "Upload failed"),
      });
    };

    xhr.onerror = () => {
      resolve({ ok: false, status: 0, message: "Upload failed — check your connection" });
    };

    xhr.onabort = () => {
      resolve({ ok: false, status: 0, message: "Upload cancelled" });
    };

    xhr.send(formData);
  });
}

/** Multipart upload with upload progress (0–100). */
export async function uploadFormWithProgress<T>(
  path: string,
  formData: FormData,
  init: { accessToken?: string | null; onProgress?: UploadProgressHandler } = {},
): Promise<T> {
  const { accessToken, onProgress } = init;
  onProgress?.(0);

  let result = await uploadFormOnce<T>(path, formData, accessToken, onProgress);

  if (!result.ok && result.status === 401 && accessToken) {
    const nextToken = await refreshAccessToken();
    if (nextToken) {
      onProgress?.(0);
      result = await uploadFormOnce<T>(path, formData, nextToken, onProgress);
    }
  }

  if (!result.ok) {
    throw new Error(result.message);
  }

  return result.data;
}
