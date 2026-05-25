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
import { resendVerification } from "@/lib/auth-client";

export default function ResendVerificationPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [previewToken, setPreviewToken] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateEmail(email)) {
      setError("Enter a valid email address.");
      setStatus("error");
      setMessage("Please correct the highlighted field.");
      return;
    }

    setStatus("loading");
    setError("");
    setMessage("");
    setPreviewToken("");

    try {
      const response = await resendVerification({ email });
      setStatus("success");
      setMessage(response.message);
      setPreviewToken(response.emailVerificationTokenPreview ?? "");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Could not resend verification.");
    }
  }

  return (
    <AuthCard
      eyebrow="Verify email"
      title="Resend verification"
      description="Enter your email and we will send a fresh verification link if your account still needs one."
      footer={
        <>
          Already verified? <AuthTextLink href="/login">Back to login</AuthTextLink>
        </>
      }
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <AuthField
          id="verify-email"
          label="Account email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          error={error}
        />

        <PrimaryAuthButton disabled={status === "loading"}>
          {status === "loading" ? "Sending..." : "Send verification link"}
        </PrimaryAuthButton>
      </form>

      {message ? (
        <div className="mt-5">
          <AuthMessage tone={status === "error" ? "error" : "success"}>
            {message}
          </AuthMessage>
        </div>
      ) : null}

      {previewToken ? (
        <div className="mt-5 rounded-[1rem] border border-cyan-300/25 bg-cyan-400/10 px-4 py-4 text-sm text-blue-100/86 backdrop-blur-md">
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-100/72">Preview verification token</p>
          <p className="mt-3 break-all rounded-[0.9rem] border border-white/10 bg-white/8 px-3 py-3 font-mono text-xs text-white/90">
            {previewToken}
          </p>
          <div className="mt-4">
            <AuthTextLink href={`/verify-email?token=${encodeURIComponent(previewToken)}`}>
              Continue to verification
            </AuthTextLink>
          </div>
        </div>
      ) : null}
    </AuthCard>
  );
}
