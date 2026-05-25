"use client";

import { useState } from "react";
import {
  AuthCard,
  AuthField,
  AuthMessage,
  AuthTextLink,
  PrimaryAuthButton,
  validateEmail,
} from "@/components/auth/auth-ui";
import {
  forgotPassword,
  type ForgotPasswordResponse,
} from "@/lib/auth-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [resetPreview, setResetPreview] = useState<ForgotPasswordResponse | null>(
    null,
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateEmail(email)) {
      setStatus("error");
      setError("Enter a valid email address.");
      setMessage("Please correct the highlighted field.");
      return;
    }

    setStatus("loading");
    setMessage("");
    setError("");
    setResetPreview(null);

    try {
      const response = await forgotPassword({ email });
      setStatus("success");
      setMessage(response.message);
      setResetPreview(response);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Request failed.");
    }
  }

  return (
    <AuthCard
      eyebrow="Password reset"
      title="Reset your password"
      description="Enter your account email and we will send a secure link to choose a new password."
      footer={
        <>
          Remembered it? <AuthTextLink href="/login">Back to login</AuthTextLink>
        </>
      }
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <AuthField
          id="forgot-email"
          label="Account email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          error={error}
        />

        <PrimaryAuthButton disabled={status === "loading"}>
          {status === "loading" ? "Sending..." : "Send reset link"}
        </PrimaryAuthButton>
      </form>

      {message ? (
        <div className="mt-5">
          <AuthMessage tone={status === "error" ? "error" : "success"}>
            {message}
          </AuthMessage>
        </div>
      ) : null}

      {resetPreview?.resetTokenPreview ? (
        <div className="mt-5 rounded-[1.3rem] border border-cyan-300/25 bg-cyan-400/10 px-4 py-4 text-sm text-blue-100/86 backdrop-blur-md">
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-100/72">
            Preview reset token
          </p>
          <p className="mt-3 break-all rounded-[1rem] border border-white/10 bg-white/8 px-3 py-3 font-mono text-xs text-white/90">
            {resetPreview.resetTokenPreview}
          </p>
          <p className="mt-3 text-xs text-blue-100/72">
            Expires at: {resetPreview.resetTokenExpiresAt}
          </p>
          <AuthTextLink
            href={`/reset-password?token=${encodeURIComponent(resetPreview.resetTokenPreview)}`}
          >
            Continue to reset password
          </AuthTextLink>
        </div>
      ) : null}
    </AuthCard>
  );
}
