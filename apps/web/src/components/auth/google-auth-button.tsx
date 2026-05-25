"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme: "outline" | "filled_blue" | "filled_black";
              size: "large" | "medium" | "small";
              text: "signin_with" | "signup_with" | "continue_with";
              shape: "pill" | "rectangular" | "circle" | "square";
              width?: number;
            },
          ) => void;
        };
      };
    };
  }
}

let googleScriptPromise: Promise<void> | null = null;

function loadGoogleScript() {
  if (googleScriptPromise) {
    return googleScriptPromise;
  }

  googleScriptPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Google sign-in."));
    document.head.appendChild(script);
  });

  return googleScriptPromise;
}

export function GoogleAuthButton({
  mode,
  disabled,
  onCredential,
}: {
  mode: "login" | "signup";
  disabled?: boolean;
  onCredential: (credential: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState("");
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !clientId || disabled) {
      return;
    }

    container.innerHTML = "";
    void loadGoogleScript()
      .then(() => {
        window.google?.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response.credential) {
              onCredential(response.credential);
            }
          },
        });
        window.google?.accounts.id.renderButton(container, {
          theme: "outline",
          size: "large",
          text: mode === "signup" ? "signup_with" : "signin_with",
          shape: "pill",
          width: Math.min(container.offsetWidth || 360, 420),
        });
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not load Google sign-in.");
      });
  }, [clientId, disabled, mode, onCredential]);

  if (!clientId) {
    return (
      <div className="rounded-[1rem] border border-white/10 bg-white/6 px-4 py-3 text-center text-sm text-white/62">
        Google sign-in is not configured yet.
      </div>
    );
  }

  return (
    <div>
      <div
        ref={containerRef}
        className={disabled ? "pointer-events-none opacity-60" : ""}
      />
      {error ? <p className="mt-2 text-xs text-amber-100">{error}</p> : null}
    </div>
  );
}
