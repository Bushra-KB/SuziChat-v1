"use client";

import { useState } from "react";
import {
  AuthCard,
  AuthField,
  AuthMessage,
  AuthTextLink,
  AuthTextarea,
  PrimaryAuthButton,
  validatePassword,
} from "@/components/auth/auth-ui";
import { resetPassword } from "@/lib/auth-client";

export default function ResetPasswordPage() {
  const [token, setToken] = useState(() =>
    typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("token") ?? "",
  );
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{ token?: string; password?: string; confirm?: string }>({});
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = {
      token: token.trim() ? "" : "Reset token is required.",
      password: validatePassword(newPassword) ? "" : "Password must be at least 8 characters.",
      confirm: newPassword === confirmPassword ? "" : "Passwords do not match.",
    };
    setErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean)) {
      setStatus("error");
      setMessage("Please correct the highlighted fields.");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const response = await resetPassword({
        token,
        newPassword,
      });
      setStatus("success");
      setMessage(response.message);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Reset failed.");
    }
  }

  return (
    <AuthCard
      eyebrow="Reset password"
      title="Choose a new password"
      description="Use the secure token from your email and choose a new password for your account."
      footer={
        <>
          Ready to sign in? <AuthTextLink href="/login">Back to login</AuthTextLink>
        </>
      }
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <AuthTextarea
          id="reset-token"
          label="Reset token"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          placeholder="Paste the reset token"
          rows={3}
          error={errors.token}
        />

        <AuthField
          id="reset-password"
          label="New password"
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          placeholder="Choose a new password"
          autoComplete="new-password"
          error={errors.password}
        />

        <AuthField
          id="reset-password-confirm"
          label="Confirm password"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Re-enter the new password"
          autoComplete="new-password"
          error={errors.confirm}
        />

        <PrimaryAuthButton disabled={status === "loading"}>
          {status === "loading" ? "Resetting..." : "Reset password"}
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
