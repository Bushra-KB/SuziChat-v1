"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  getCurrentUser,
  register,
  saveAuthSession,
  type AuthUser,
} from "@/lib/auth-client";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAdultConfirmed, setIsAdultConfirmed] = useState(false);
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
      const session = await register({
        username,
        email,
        password,
        isAdultConfirmed,
      });
      const currentUser = await getCurrentUser(session.accessToken);
      const hydratedSession = {
        ...session,
        user: currentUser,
      };

      saveAuthSession(hydratedSession);
      setUser(currentUser);
      setStatus("success");
      setMessage("Account created and signed in.");
      router.push("/app");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Registration failed.");
    }
  }

  return (
    <section className="rounded-[2.1rem] border border-white/10 bg-[linear-gradient(180deg,rgba(49,10,82,0.88),rgba(33,6,55,0.94))] p-6 shadow-[0_24px_80px_rgba(8,0,24,0.55),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-xl sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.38em] text-cyan-100/70">
        Register
      </p>
      <h2 className="mt-5 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
        Create your account
      </h2>
      <p className="mt-4 max-w-xl text-sm leading-7 text-white/68 sm:text-base">
        Join Suzi Chat to explore rooms, direct messages, dating, snaps, reels,
        and social games in one place.
      </p>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="register-username"
              className="text-sm font-semibold text-white"
            >
              Username
            </label>
            <input
              id="register-username"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="suziuser"
              className="mt-3 w-full rounded-[1.1rem] border border-white/6 bg-[#3b0a59]/92 px-4 py-4 text-white outline-none transition placeholder:text-white/36 focus:border-cyan-300/45 focus:bg-[#461066]"
            />
          </div>
          <div>
            <label
              htmlFor="register-email"
              className="text-sm font-semibold text-white"
            >
              Email
            </label>
            <input
              id="register-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="mt-3 w-full rounded-[1.1rem] border border-white/6 bg-[#3b0a59]/92 px-4 py-4 text-white outline-none transition placeholder:text-white/36 focus:border-cyan-300/45 focus:bg-[#461066]"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="register-password"
            className="text-sm font-semibold text-white"
          >
            Password
          </label>
          <input
            id="register-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Choose a secure password"
            className="mt-3 w-full rounded-[1.1rem] border border-white/6 bg-[#3b0a59]/92 px-4 py-4 text-white outline-none transition placeholder:text-white/36 focus:border-cyan-300/45 focus:bg-[#461066]"
          />
        </div>

        <label className="flex items-start gap-3 rounded-[1.2rem] border border-white/10 bg-white/6 px-4 py-4 text-sm leading-6 text-blue-100/82 backdrop-blur-md">
          <input
            type="checkbox"
            checked={isAdultConfirmed}
            onChange={(event) => setIsAdultConfirmed(event.target.checked)}
            className="mt-1 h-4 w-4 accent-pink-400"
          />
          <span>I confirm that I am 18+ and agree to use the platform responsibly.</span>
        </label>

        <button
          type="submit"
          className="w-full rounded-[1.1rem] border border-cyan-300/20 bg-[linear-gradient(90deg,#7f10c9,#8744f6_52%,#3f89d3)] px-5 py-4 text-lg font-semibold text-white shadow-[0_16px_36px_rgba(88,49,224,0.34)] transition hover:brightness-110"
        >
          {status === "loading" ? "Creating account..." : "Create account"}
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

      <p className="mt-6 text-sm text-blue-100/72">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-white transition hover:text-pink-100"
        >
          Sign in
        </Link>
      </p>
    </section>
  );
}
