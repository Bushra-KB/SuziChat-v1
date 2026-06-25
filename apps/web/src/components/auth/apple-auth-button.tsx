"use client";

import { Capacitor } from "@capacitor/core";
import { useState } from "react";

export type AppleCredential = {
  identityToken: string;
  firstName?: string;
  lastName?: string;
};

declare global {
  interface Window {
    AppleID?: {
      auth: {
        init: (options: {
          clientId: string;
          scope: string;
          redirectURI: string;
          state?: string;
          usePopup: boolean;
        }) => void;
        signIn: () => Promise<{
          authorization?: { id_token?: string; code?: string };
          user?: { name?: { firstName?: string; lastName?: string } };
        }>;
      };
    };
  }
}

const APPLE_JS_SDK_URL =
  "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";

let appleScriptPromise: Promise<void> | null = null;

function loadAppleScript() {
  if (appleScriptPromise) {
    return appleScriptPromise;
  }

  appleScriptPromise = new Promise((resolve, reject) => {
    if (window.AppleID?.auth) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = APPLE_JS_SDK_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Apple sign-in."));
    document.head.appendChild(script);
  });

  return appleScriptPromise;
}

const buttonLabel = {
  signin: "Sign in with Apple",
  signup: "Sign up with Apple",
} as const;

export function AppleAuthButton({
  mode,
  disabled,
  onCredential,
  onError,
}: {
  mode: "login" | "signup";
  disabled?: boolean;
  onCredential: (credential: AppleCredential) => void;
  onError?: (message: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const serviceId = process.env.NEXT_PUBLIC_APPLE_SERVICE_ID?.trim();
  const redirectUri = process.env.NEXT_PUBLIC_APPLE_REDIRECT_URI?.trim();
  const isNative = Capacitor.isNativePlatform();

  // On the web build, the button only works once an Apple Service ID + redirect
  // URI are configured. On native iOS the system flow is always available.
  if (!isNative && !serviceId) {
    return null;
  }

  async function handleClick() {
    if (disabled || loading) {
      return;
    }
    setLoading(true);
    try {
      if (isNative) {
        // Native iOS shows the system Sign in with Apple sheet. The identity
        // token is issued for the app bundle id; clientId/redirectURI are only
        // used by the web/Android fallbacks but the option is still required.
        const { SignInWithApple } = await import(
          "@capacitor-community/apple-sign-in"
        );
        const result = await SignInWithApple.authorize({
          clientId: serviceId || "com.suzichat.app",
          redirectURI: redirectUri || "https://suzichat.com",
          scopes: "email name",
        });
        const response = result.response;
        if (!response?.identityToken) {
          throw new Error("Apple sign-in was cancelled.");
        }
        onCredential({
          identityToken: response.identityToken,
          firstName: response.givenName ?? undefined,
          lastName: response.familyName ?? undefined,
        });
        return;
      }

      if (!serviceId || !redirectUri) {
        throw new Error("Apple sign-in is not configured.");
      }
      await loadAppleScript();
      window.AppleID?.auth.init({
        clientId: serviceId,
        scope: "name email",
        redirectURI: redirectUri,
        usePopup: true,
      });
      const data = await window.AppleID!.auth.signIn();
      const idToken = data?.authorization?.id_token;
      if (!idToken) {
        throw new Error("Apple sign-in did not return a token.");
      }
      onCredential({
        identityToken: idToken,
        firstName: data.user?.name?.firstName,
        lastName: data.user?.name?.lastName,
      });
    } catch (err) {
      // The user dismissing the sheet shows up as a rejected promise; surface a
      // friendly message rather than a crash.
      onError?.(err instanceof Error ? err.message : "Apple sign-in failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || loading}
      className="flex w-full max-w-[420px] items-center justify-center gap-2 rounded-full bg-black px-4 py-2.5 text-[0.9rem] font-medium text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-60 sm:py-3"
      aria-label={buttonLabel[mode === "signup" ? "signup" : "signin"]}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 384 512"
        className="h-[1.05rem] w-[1.05rem] fill-current"
      >
        <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
      </svg>
      <span>
        {loading
          ? "Connecting..."
          : buttonLabel[mode === "signup" ? "signup" : "signin"]}
      </span>
    </button>
  );
}
