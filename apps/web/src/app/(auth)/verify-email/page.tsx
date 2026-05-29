"use client";

import { useEffect, useState } from "react";
import {
  AuthCard,
  AuthMessage,
  AuthTextLink,
} from "@/components/auth/auth-ui";
import { verifyEmail } from "@/lib/auth-client";

export default function VerifyEmailPage() {
  const [token] = useState(() =>
    typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("token") ?? "",
  );
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    token ? "loading" : "error",
  );
  const [message, setMessage] = useState(
    token ? "Verifying your email..." : "Verification token is missing.",
  );

  useEffect(() => {
    if (!token) {
      return;
    }

    void verifyEmail({ token })
      .then((response) => {
        setStatus("success");
        setMessage(response.message);
      })
      .catch((error) => {
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Email verification failed.");
      });
  }, [token]);

  return (
    <AuthCard
      eyebrow="Email verification"
      title={status === "success" ? "Email verified" : "Verify your email"}
      description="Confirming your email protects your account and unlocks sign in."
      footer={
        <>
          <AuthTextLink href="/login">Back to login</AuthTextLink>
        </>
      }
    >
      <AuthMessage tone={status === "error" ? "error" : status === "success" ? "success" : "info"}>
        {message}
      </AuthMessage>
    </AuthCard>
  );
}
