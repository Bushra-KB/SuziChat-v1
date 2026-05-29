import { getApiBaseUrl } from "@/lib/api-base-url";

export type AuthUser = {
  id: string;
  email: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  birthday: string | null;
  gender: "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY";
  displayName: string | null;
  avatarUrl: string | null;
  role: "USER" | "ADMIN";
  isAdultConfirmed: boolean;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

export type RegisterResponse = {
  message: string;
  requiresEmailVerification: boolean;
  emailVerificationTokenPreview?: string;
  emailVerificationTokenExpiresAt?: string;
  user: AuthUser;
};

export type ForgotPasswordResponse = {
  message: string;
  resetTokenPreview?: string;
  resetTokenExpiresAt?: string;
};

type ApiErrorPayload = {
  message?: string | string[];
};

/** Storage key + event name for syncing avatar/profile updates across the shell. */
export const AUTH_SESSION_STORAGE_KEY = "suzi-chat-auth-session";

export const AUTH_SESSION_UPDATED_EVENT = "suzi-auth-session-updated";

const AUTH_SESSION_KEY = AUTH_SESSION_STORAGE_KEY;
function normalizeErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

async function request<T>(path: string, options: RequestInit = {}) {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    let payload: ApiErrorPayload | undefined;

    try {
      payload = (await response.json()) as ApiErrorPayload;
    } catch {
      payload = undefined;
    }

    const message = Array.isArray(payload?.message)
      ? payload?.message[0]
      : payload?.message;

    throw new Error(message ?? "Request failed");
  }

  return (await response.json()) as T;
}

export function getStoredAuthSession() {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(AUTH_SESSION_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as AuthSession;
  } catch {
    window.localStorage.removeItem(AUTH_SESSION_KEY);
    return null;
  }
}

export function saveAuthSession(session: AuthSession) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event(AUTH_SESSION_UPDATED_EVENT));
}

export function clearAuthSession() {
  window.localStorage.removeItem(AUTH_SESSION_KEY);
}

export async function register(payload: {
  firstName: string;
  lastName: string;
  birthday: string;
  gender: "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY";
  email: string;
  password: string;
  isAdultConfirmed: boolean;
  termsAccepted: boolean;
  privacyAccepted: boolean;
}) {
  return request<RegisterResponse>("/v1/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function login(payload: {
  emailOrUsername: string;
  password: string;
}) {
  return request<AuthSession>("/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function loginWithGoogle(payload: {
  credential: string;
  isAdultConfirmed?: boolean;
  termsAccepted?: boolean;
  privacyAccepted?: boolean;
}) {
  return request<AuthSession>("/v1/auth/google", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function refresh(payload: { refreshToken: string }) {
  return request<AuthSession>("/v1/auth/refresh", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function forgotPassword(payload: { email: string }) {
  return request<ForgotPasswordResponse>("/v1/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function resetPassword(payload: {
  token: string;
  newPassword: string;
}) {
  return request<{ message: string }>("/v1/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function verifyEmail(payload: { token: string }) {
  return request<{ message: string }>("/v1/auth/verify-email", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function resendVerification(payload: { email: string }) {
  return request<{
    message: string;
    emailVerificationTokenPreview?: string;
    emailVerificationTokenExpiresAt?: string;
  }>("/v1/auth/resend-verification", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function changePassword(
  accessToken: string,
  payload: { currentPassword: string; newPassword: string },
) {
  return request<{ message: string }>("/v1/auth/change-password", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });
}

export async function getCurrentUser(accessToken: string) {
  return request<AuthUser>("/v1/auth/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function hydrateStoredSession() {
  const session = getStoredAuthSession();

  if (!session) {
    return null;
  }

  try {
    const user = await getCurrentUser(session.accessToken);
    const updatedSession = {
      ...session,
      user,
    };

    saveAuthSession(updatedSession);
    return updatedSession;
  } catch {
    try {
      const refreshedSession = await refresh({
        refreshToken: session.refreshToken,
      });

      saveAuthSession(refreshedSession);
      return refreshedSession;
    } catch (error) {
      clearAuthSession();
      throw new Error(normalizeErrorMessage(error));
    }
  }
}
