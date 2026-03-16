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
    <section className="rounded-[2rem] border border-white/18 bg-[linear-gradient(180deg,rgba(88,70,255,0.34),rgba(57,24,121,0.38))] p-6 shadow-[0_0_30px_rgba(117,84,255,0.28),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-xl sm:p-8">
      <p className="text-sm font-medium uppercase tracking-[0.35em] text-pink-100/78">
        Register
      </p>
      <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">
        Create your account
      </h2>
      <p className="mt-4 max-w-xl text-base leading-7 text-blue-100/78">
        Join Suzi Chat to explore rooms, direct messages, dating, snaps, reels,
        and social games in one place.
      </p>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="register-username"
              className="text-xs uppercase tracking-[0.28em] text-cyan-100/70"
            >
              Username
            </label>
            <input
              id="register-username"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="suziuser"
              className="mt-2 w-full rounded-[1.35rem] border border-white/15 bg-white/10 px-4 py-3 text-white outline-none backdrop-blur-md placeholder:text-blue-100/45"
            />
          </div>
          <div>
            <label
              htmlFor="register-email"
              className="text-xs uppercase tracking-[0.28em] text-cyan-100/70"
            >
              Email
            </label>
            <input
              id="register-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="mt-2 w-full rounded-[1.35rem] border border-white/15 bg-white/10 px-4 py-3 text-white outline-none backdrop-blur-md placeholder:text-blue-100/45"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="register-password"
            className="text-xs uppercase tracking-[0.28em] text-cyan-100/70"
          >
            Password
          </label>
          <input
            id="register-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Choose a secure password"
            className="mt-2 w-full rounded-[1.35rem] border border-white/15 bg-white/10 px-4 py-3 text-white outline-none backdrop-blur-md placeholder:text-blue-100/45"
          />
        </div>

        <label className="flex items-start gap-3 rounded-[1.2rem] border border-white/12 bg-white/8 px-4 py-4 text-sm leading-6 text-blue-100/82 backdrop-blur-md">
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
          className="w-full rounded-full border border-pink-300/45 bg-[linear-gradient(90deg,rgba(246,94,219,0.8),rgba(114,76,255,0.85))] px-5 py-3 text-base font-semibold text-white shadow-[0_0_28px_rgba(255,86,214,0.28)] transition hover:brightness-110"
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
        <div className="mt-5 rounded-[1.3rem] border border-white/12 bg-white/8 px-4 py-4 text-sm text-blue-100/82 backdrop-blur-md">
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
