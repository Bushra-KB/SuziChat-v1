"use client";

import Link from "next/link";
import { useState } from "react";
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
  const [resetPreview, setResetPreview] = useState<ForgotPasswordResponse | null>(
    null,
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");
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
    <section className="rounded-[2rem] border border-white/18 bg-[linear-gradient(180deg,rgba(88,70,255,0.34),rgba(57,24,121,0.38))] p-6 shadow-[0_0_30px_rgba(117,84,255,0.28),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-xl sm:p-8">
      <p className="text-sm font-medium uppercase tracking-[0.35em] text-pink-100/78">
        Password Reset
      </p>
      <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">
        Reset your password
      </h2>
      <p className="mt-4 max-w-xl text-base leading-7 text-blue-100/78">
        Enter your account email to request a password reset. For V1 preview,
        the API returns a temporary reset token instead of sending email.
      </p>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <div>
          <label
            htmlFor="forgot-email"
            className="text-xs uppercase tracking-[0.28em] text-cyan-100/70"
          >
            Account email
          </label>
          <input
            id="forgot-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="mt-2 w-full rounded-[1.35rem] border border-white/15 bg-white/10 px-4 py-3 text-white outline-none backdrop-blur-md placeholder:text-blue-100/45"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-full border border-cyan-300/35 bg-[linear-gradient(90deg,rgba(108,220,255,0.72),rgba(104,92,255,0.76))] px-5 py-3 text-base font-semibold text-white shadow-[0_0_26px_rgba(86,208,255,0.2)] transition hover:brightness-110"
        >
          {status === "loading" ? "Sending..." : "Send reset link"}
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
          <Link
            href={`/reset-password?token=${encodeURIComponent(resetPreview.resetTokenPreview)}`}
            className="mt-4 inline-flex rounded-full border border-pink-300/40 bg-pink-400/16 px-4 py-2 text-sm font-medium text-white transition hover:bg-pink-400/22"
          >
            Continue to reset password
          </Link>
        </div>
      ) : null}

      <p className="mt-6 text-sm text-blue-100/72">
        Remembered it?{" "}
        <Link
          href="/login"
          className="font-medium text-white transition hover:text-pink-100"
        >
          Back to login
        </Link>
      </p>
    </section>
  );
}
