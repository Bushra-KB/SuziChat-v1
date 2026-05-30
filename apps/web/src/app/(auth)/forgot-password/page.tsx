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
import { forgotPassword } from "@/lib/auth-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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

    try {
      const response = await forgotPassword({ email });
      setStatus("success");
      setMessage(response.message);
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
    </AuthCard>
  );
}
