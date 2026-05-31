"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AuthCard,
  AuthField,
  AuthMessage,
  AuthTextLink,
  PrimaryAuthButton,
  validatePassword,
} from "@/components/auth/auth-ui";
import { resetPassword } from "@/lib/auth-client";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>(
    {},
  );
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setStatus("error");
      setMessage("Open the password reset link from your email to continue.");
      return;
    }

    const nextErrors = {
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
      description="Open the secure link from your email, then choose a new password for your account."
      footer={
        <>
          Ready to sign in? <AuthTextLink href="/login">Back to login</AuthTextLink>
        </>
      }
    >
      <form className="space-y-4 sm:space-y-5" onSubmit={handleSubmit}>
        {!token ? (
          <AuthMessage tone="info">
            This page needs the secure reset link from your email. Request a new
            link if this page was opened directly.
          </AuthMessage>
        ) : null}

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

        <PrimaryAuthButton disabled={!token || status === "loading"}>
          {status === "loading" ? "Resetting..." : "Reset password"}
        </PrimaryAuthButton>
      </form>

      {message ? (
        <div className="mt-4 sm:mt-5">
          <AuthMessage tone={status === "error" ? "error" : "success"}>
            {message}
          </AuthMessage>
        </div>
      ) : null}
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <AuthCard
          eyebrow="Reset password"
          title="Choose a new password"
          description="Loading your secure reset link..."
          footer={
            <>
              Ready to sign in? <AuthTextLink href="/login">Back to login</AuthTextLink>
            </>
          }
        >
          <AuthMessage tone="info">Preparing password reset.</AuthMessage>
        </AuthCard>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
