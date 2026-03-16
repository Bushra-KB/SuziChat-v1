import Link from "next/link";

export default function LoginPage() {
  return (
    <section className="rounded-[2rem] border border-white/18 bg-[linear-gradient(180deg,rgba(88,70,255,0.34),rgba(57,24,121,0.38))] p-6 shadow-[0_0_30px_rgba(117,84,255,0.28),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-xl sm:p-8">
      <p className="text-sm font-medium uppercase tracking-[0.35em] text-pink-100/78">
        Login
      </p>
      <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">
        Welcome back
      </h2>
      <p className="mt-4 max-w-xl text-base leading-7 text-blue-100/78">
        Sign in to continue your chats, reconnect with friends, and pick up
        where you left off.
      </p>

      <form className="mt-8 space-y-5">
        <div>
          <label
            htmlFor="login-email"
            className="text-xs uppercase tracking-[0.28em] text-cyan-100/70"
          >
            Email
          </label>
          <input
            id="login-email"
            type="email"
            placeholder="you@example.com"
            className="mt-2 w-full rounded-[1.35rem] border border-white/15 bg-white/10 px-4 py-3 text-white outline-none backdrop-blur-md placeholder:text-blue-100/45"
          />
        </div>
        <div>
          <div className="flex items-center justify-between gap-3">
            <label
              htmlFor="login-password"
              className="text-xs uppercase tracking-[0.28em] text-cyan-100/70"
            >
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-pink-100/85 transition hover:text-white"
            >
              Forgot password?
            </Link>
          </div>
          <input
            id="login-password"
            type="password"
            placeholder="Enter your password"
            className="mt-2 w-full rounded-[1.35rem] border border-white/15 bg-white/10 px-4 py-3 text-white outline-none backdrop-blur-md placeholder:text-blue-100/45"
          />
        </div>

        <button
          type="button"
          className="w-full rounded-full border border-pink-300/45 bg-[linear-gradient(90deg,rgba(246,94,219,0.8),rgba(114,76,255,0.85))] px-5 py-3 text-base font-semibold text-white shadow-[0_0_28px_rgba(255,86,214,0.28)] transition hover:brightness-110"
        >
          Sign in
        </button>
      </form>

      <p className="mt-6 text-sm text-blue-100/72">
        New here?{" "}
        <Link
          href="/register"
          className="font-medium text-white transition hover:text-pink-100"
        >
          Create an account
        </Link>
      </p>
    </section>
  );
}
