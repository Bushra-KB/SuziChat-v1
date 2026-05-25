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
  validateEmail,
  validatePassword,
} from "@/components/auth/auth-ui";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import {
  loginWithGoogle,
  register,
  saveAuthSession,
  type AuthUser,
} from "@/lib/auth-client";

type RegisterErrors = {
  username?: string;
  email?: string;
  password?: string;
  adult?: string;
  terms?: string;
  privacy?: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAdultConfirmed, setIsAdultConfirmed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");
  const [verificationPreview, setVerificationPreview] = useState("");
  const [user, setUser] = useState<AuthUser | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateForm();
    setErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean)) {
      setStatus("error");
      setMessage("Please correct the highlighted fields.");
      return;
    }

    setStatus("loading");
    setMessage("");
    setVerificationPreview("");

    try {
      const response = await register({
        username,
        email,
        password,
        isAdultConfirmed,
        termsAccepted,
        privacyAccepted,
      });
      setUser(response.user);
      setStatus("success");
      setMessage(response.message);
      setVerificationPreview(response.emailVerificationTokenPreview ?? "");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Registration failed.");
    }
  }

  function validateForm(): RegisterErrors {
    return {
      username: username.trim().length >= 3 ? "" : "Username must be at least 3 characters.",
      email: validateEmail(email) ? "" : "Enter a valid email address.",
      password: validatePassword(password) ? "" : "Password must be at least 8 characters.",
      adult: isAdultConfirmed ? "" : "Confirm that you are 18+.",
      terms: termsAccepted ? "" : "Accept the terms to continue.",
      privacy: privacyAccepted ? "" : "Accept the privacy policy to continue.",
    };
  }

  const handleGoogleCredential = useCallback(
    async (credential: string) => {
      const nextErrors = {
        adult: isAdultConfirmed ? "" : "Confirm that you are 18+.",
        terms: termsAccepted ? "" : "Accept the terms to continue.",
        privacy: privacyAccepted ? "" : "Accept the privacy policy to continue.",
      };
      setErrors(nextErrors);
      if (Object.values(nextErrors).some(Boolean)) {
        setStatus("error");
        setMessage("Accept the age, terms, and privacy confirmations before Google signup.");
        return;
      }
      setStatus("loading");
      setMessage("");
      try {
        const session = await loginWithGoogle({
          credential,
          isAdultConfirmed,
          termsAccepted,
          privacyAccepted,
        });
        saveAuthSession(session);
        setUser(session.user);
        setStatus("success");
        setMessage("Account created with Google.");
        router.push(session.user.role === "ADMIN" ? "/app/admin" : "/app");
      } catch (error) {
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Google signup failed.");
      }
    },
    [isAdultConfirmed, privacyAccepted, router, termsAccepted],
  );

  return (
    <AuthCard
      eyebrow="Register"
      title="Create your account"
      description="Join Suzi Chat to explore rooms, direct messages, dating, snaps, reels, and social games in one place."
      footer={
        <>
          Already have an account? <AuthTextLink href="/login">Sign in</AuthTextLink>
        </>
      }
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="grid gap-5 sm:grid-cols-2">
          <AuthField
            id="register-username"
            label="Username"
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="suziuser"
            autoComplete="username"
            error={errors.username}
          />
          <AuthField
            id="register-email"
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            error={errors.email}
          />
        </div>

        <AuthField
          id="register-password"
          label="Password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Choose a secure password"
          autoComplete="new-password"
          error={errors.password}
        />

        <div className="space-y-3">
          {[
            {
              checked: isAdultConfirmed,
              onChange: setIsAdultConfirmed,
              key: "adult",
              content: "I confirm that I am 18+ and agree to use the platform responsibly.",
              error: errors.adult,
            },
            {
              checked: termsAccepted,
              onChange: setTermsAccepted,
              key: "terms",
              content: (
                <>
                  I accept the Suzi Chat <AuthTextLink href="/terms">terms and conditions</AuthTextLink>.
                </>
              ),
              error: errors.terms,
            },
            {
              checked: privacyAccepted,
              onChange: setPrivacyAccepted,
              key: "privacy",
              content: (
                <>
                  I accept the Suzi Chat <AuthTextLink href="/privacy">privacy policy</AuthTextLink>.
                </>
              ),
              error: errors.privacy,
            },
          ].map((item) => (
            <label key={item.key} className="block rounded-[1rem] border border-white/10 bg-white/6 px-4 py-3 text-sm leading-6 text-blue-100/82 backdrop-blur-md">
              <span className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={(event) => item.onChange(event.target.checked)}
                  className="mt-1 h-4 w-4 accent-pink-400"
                />
                <span>{item.content}</span>
              </span>
              {item.error ? <span className="mt-2 block text-xs font-medium text-amber-100">{item.error}</span> : null}
            </label>
          ))}
        </div>

        <PrimaryAuthButton disabled={status === "loading"}>
          {status === "loading" ? "Creating account..." : "Create account"}
        </PrimaryAuthButton>
      </form>

      <div className="mt-5 space-y-5">
        <AuthDivider />
        <GoogleAuthButton
          mode="signup"
          disabled={status === "loading"}
          onCredential={handleGoogleCredential}
        />
      </div>

      {message ? (
        <div className="mt-5">
          <AuthMessage tone={status === "error" ? "error" : "success"}>
            {message}
          </AuthMessage>
        </div>
      ) : null}

      {user ? (
        <div className="mt-5 rounded-[1.2rem] border border-white/10 bg-white/6 px-4 py-4 text-sm text-blue-100/82 backdrop-blur-md">
          Account created for <span className="font-semibold text-white">{user.username}</span>
          .
        </div>
      ) : null}

      {verificationPreview ? (
        <div className="mt-5 rounded-[1rem] border border-cyan-300/25 bg-cyan-400/10 px-4 py-4 text-sm text-blue-100/86 backdrop-blur-md">
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-100/72">Preview verification token</p>
          <p className="mt-3 break-all rounded-[0.9rem] border border-white/10 bg-white/8 px-3 py-3 font-mono text-xs text-white/90">
            {verificationPreview}
          </p>
          <div className="mt-4">
            <AuthTextLink href={`/verify-email?token=${encodeURIComponent(verificationPreview)}`}>
              Continue to verification
            </AuthTextLink>
          </div>
        </div>
      ) : null}
    </AuthCard>
  );
}
