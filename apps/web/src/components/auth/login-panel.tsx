"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import {
  AuthCard,
  AuthDivider,
  AuthField,
  AuthMessage,
  AuthTextLink,
  PrimaryAuthButton,
} from "@/components/auth/auth-ui";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import {
  login,
  loginWithGoogle,
  saveAuthSession,
  type AuthUser,
} from "@/lib/auth-client";

type LoginPanelProps = {
  eyebrow?: string;
  title: string;
  description: string;
  className?: string;
};

export function LoginPanel({
  eyebrow = "Login",
  title,
  description,
  className = "",
}: LoginPanelProps) {
  const router = useRouter();
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");
  const [user, setUser] = useState<AuthUser | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = {
      identifier: emailOrUsername.trim() ? "" : "Email or username is required.",
      password: password ? "" : "Password is required.",
    };
    setErrors(nextErrors);

    if (nextErrors.identifier || nextErrors.password) {
      setStatus("error");
      setMessage("Please correct the highlighted fields.");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const session = await login({
        emailOrUsername,
        password,
      });
      saveAuthSession(session);
      setUser(session.user);
      setStatus("success");
      setMessage("Signed in successfully.");
      router.push(session.user.role === "ADMIN" ? "/app/admin" : "/app");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Login failed.");
    }
  }

  const handleGoogleCredential = useCallback(
    async (credential: string) => {
      setStatus("loading");
      setMessage("");
      try {
        const session = await loginWithGoogle({ credential });
        saveAuthSession(session);
        setUser(session.user);
        setStatus("success");
        setMessage("Signed in with Google.");
        router.push(session.user.role === "ADMIN" ? "/app/admin" : "/app");
      } catch (error) {
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Google sign-in failed.");
      }
    },
    [router],
  );

  return (
    <div className={className}>
      <AuthCard
        eyebrow={eyebrow}
        title={title}
        description={description}
        footer={
          <>
            New here? <AuthTextLink href="/register">Create an account</AuthTextLink>
          </>
        }
      >
      <form className="space-y-4 sm:space-y-5" onSubmit={handleSubmit}>
        <AuthField
          id="login-email"
          label="Email or username"
          type="text"
          value={emailOrUsername}
          onChange={(event) => setEmailOrUsername(event.target.value)}
          placeholder="yourname@gmail.com"
          autoComplete="username"
          error={errors.identifier}
        />
        <AuthField
          id="login-password"
          label="Password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter your password"
          autoComplete="current-password"
          error={errors.password}
        />
          <div className="mt-3 flex flex-wrap items-center justify-end gap-3">
            <AuthTextLink href="/forgot-password">Forgot password?</AuthTextLink>
          </div>

        <PrimaryAuthButton disabled={status === "loading"}>
          {status === "loading" ? "Logging in..." : "Login"}
        </PrimaryAuthButton>
      </form>

      <div className="mt-5 space-y-4 text-center sm:space-y-5">
        <AuthDivider />
        <GoogleAuthButton
          mode="login"
          disabled={status === "loading"}
          onCredential={handleGoogleCredential}
        />
      </div>

      {message ? (
        <div className="mt-4 sm:mt-5">
          <AuthMessage tone={status === "error" ? "error" : "success"}>{message}</AuthMessage>
        </div>
      ) : null}

      {user ? (
        <div className="mt-4 rounded-[0.9rem] border border-white/10 bg-white/6 px-4 py-3 text-[0.78rem] text-blue-100/82 backdrop-blur-md sm:mt-5 sm:rounded-[1rem] sm:text-[0.86rem]">
          Signed in as <span className="font-semibold text-white">{user.username}</span>
          .
        </div>
      ) : null}
      </AuthCard>
    </div>
  );
}
