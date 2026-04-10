"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  getCurrentUser,
  login,
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
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");
  const [user, setUser] = useState<AuthUser | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const session = await login({
        emailOrUsername,
        password,
      });
      const currentUser = await getCurrentUser(session.accessToken);
      const hydratedSession = {
        ...session,
        user: currentUser,
      };

      saveAuthSession(hydratedSession);
      setUser(currentUser);
      setStatus("success");
      setMessage("Signed in successfully.");
      router.push("/app");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Login failed.");
    }
  }

  return (
    <section
      className={`rounded-[2.1rem] border border-white/12 bg-[linear-gradient(180deg,rgba(49,10,82,0.78),rgba(33,6,55,0.84))] p-6 shadow-[0_24px_80px_rgba(8,0,24,0.48),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-xl sm:p-8 ${className}`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.38em] text-cyan-100/70">
        {eyebrow}
      </p>
      <h2 className="mt-5 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
        {title}
      </h2>
      <p className="mt-4 max-w-xl text-sm leading-7 text-white/68 sm:text-base">
        {description}
      </p>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <div>
          <label
            htmlFor="login-email"
            className="text-sm font-semibold text-white"
          >
            Email or username
          </label>
          <input
            id="login-email"
            type="text"
            value={emailOrUsername}
            onChange={(event) => setEmailOrUsername(event.target.value)}
            placeholder="yourname@gmail.com"
            className="mt-3 w-full rounded-[1.1rem] border border-white/8 bg-[#3b0a59]/82 px-4 py-4 text-white outline-none transition placeholder:text-white/36 focus:border-cyan-300/45 focus:bg-[#461066]/88"
          />
        </div>
        <div>
          <label
            htmlFor="login-password"
            className="text-sm font-semibold text-white"
          >
            Password
          </label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            className="mt-3 w-full rounded-[1.1rem] border border-white/8 bg-[#3b0a59]/82 px-4 py-4 text-white outline-none transition placeholder:text-white/36 focus:border-cyan-300/45 focus:bg-[#461066]/88"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-white/68 transition hover:text-white"
            >
              Forgot password?
            </Link>
            <Link
              href="/register"
              className="text-sm font-medium text-cyan-100/88 transition hover:text-white"
            >
              Create account
            </Link>
          </div>
        </div>

        <button
          type="submit"
          className="w-full rounded-[1.1rem] border border-cyan-300/20 bg-[linear-gradient(90deg,#7f10c9,#8744f6_52%,#3f89d3)] px-5 py-4 text-lg font-semibold text-white shadow-[0_16px_36px_rgba(88,49,224,0.34)] transition hover:brightness-110"
        >
          {status === "loading" ? "Signing in..." : "Sign in"}
        </button>
      </form>

      {message ? (
        <p
          className={`mt-5 text-sm ${
            status === "error" ? "text-amber-100/90" : "text-cyan-100/85"
          }`}
        >
          {message}
        </p>
      ) : null}

      {user ? (
        <div className="mt-5 rounded-[1.2rem] border border-white/10 bg-white/6 px-4 py-4 text-sm text-blue-100/82 backdrop-blur-md">
          Signed in as <span className="font-semibold text-white">{user.username}</span>
          .
        </div>
      ) : null}
    </section>
  );
}
