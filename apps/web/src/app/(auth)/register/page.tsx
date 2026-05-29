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
  firstName?: string;
  lastName?: string;
  birthday?: string;
  gender?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  adult?: string;
  terms?: string;
  privacy?: string;
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const GENDER_OPTIONS = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
  { value: "PREFER_NOT_TO_SAY", label: "Prefer not to say" },
] as const;

function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function scorePassword(password: string) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  if (score <= 1) return { level: "Weak", color: "bg-rose-400/80" };
  if (score <= 3) return { level: "Medium", color: "bg-amber-300/85" };
  return { level: "Strong", color: "bg-emerald-300/85" };
}

export default function RegisterPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY" | "">("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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

  const monthIndex = birthMonth ? Number.parseInt(birthMonth, 10) : NaN;
  const yearValue = birthYear ? Number.parseInt(birthYear, 10) : NaN;
  const maxDays =
    Number.isInteger(yearValue) && Number.isInteger(monthIndex)
      ? daysInMonth(yearValue, monthIndex)
      : 31;
  const passwordStrength = scorePassword(password);

  const years = Array.from({ length: 100 }, (_, i) => String(new Date().getFullYear() - i));
  const days = Array.from({ length: maxDays }, (_, i) => String(i + 1));

  function birthdayIsoValue() {
    if (!birthYear || !birthMonth || !birthDay) {
      return "";
    }
    const year = Number.parseInt(birthYear, 10);
    const month = Number.parseInt(birthMonth, 10) + 1;
    const day = Number.parseInt(birthDay, 10);
    const mm = String(month).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${year}-${mm}-${dd}`;
  }

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
        firstName,
        lastName,
        birthday: birthdayIsoValue(),
        gender: gender || "PREFER_NOT_TO_SAY",
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
    const birthday = birthdayIsoValue();
    let birthdayError = "";
    if (!birthday) {
      birthdayError = "Birthday is required.";
    } else {
      const birthDate = new Date(`${birthday}T00:00:00.000Z`);
      const now = new Date();
      const minAdultDate = new Date(
        now.getFullYear() - 18,
        now.getMonth(),
        now.getDate(),
      );
      if (Number.isNaN(birthDate.getTime())) {
        birthdayError = "Enter a valid birthday.";
      } else if (birthDate > minAdultDate) {
        birthdayError = "You must be at least 18 years old.";
      }
    }

    return {
      firstName: firstName.trim() ? "" : "First name is required.",
      lastName: lastName.trim() ? "" : "Last name is required.",
      birthday: birthdayError,
      gender: gender ? "" : "Gender is required.",
      email: validateEmail(email) ? "" : "Enter a valid email address.",
      password: validatePassword(password) ? "" : "Password must be at least 8 characters.",
      confirmPassword: password === confirmPassword ? "" : "Passwords do not match.",
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
            id="register-first-name"
            label="First name"
            type="text"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            placeholder="First name"
            autoComplete="given-name"
            error={errors.firstName}
          />
          <AuthField
            id="register-last-name"
            label="Last name"
            type="text"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            placeholder="Last name"
            autoComplete="family-name"
            error={errors.lastName}
          />
        </div>

        <div>
          <p className="text-sm font-semibold text-white">Birthday</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            <label className="block">
              <select
                value={birthMonth}
                onChange={(event) => {
                  setBirthMonth(event.target.value);
                  setBirthDay("");
                }}
                className="w-full rounded-[1rem] border border-white/10 bg-[#3b0a59]/82 px-4 py-3.5 text-white outline-none transition focus:border-cyan-300/45 focus:bg-[#461066]/88"
              >
                <option value="">Month</option>
                {MONTHS.map((month, idx) => (
                  <option key={month} value={String(idx)}>{month}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <select
                value={birthDay}
                onChange={(event) => setBirthDay(event.target.value)}
                className="w-full rounded-[1rem] border border-white/10 bg-[#3b0a59]/82 px-4 py-3.5 text-white outline-none transition focus:border-cyan-300/45 focus:bg-[#461066]/88"
              >
                <option value="">Day</option>
                {days.map((day) => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <select
                value={birthYear}
                onChange={(event) => {
                  setBirthYear(event.target.value);
                  setBirthDay("");
                }}
                className="w-full rounded-[1rem] border border-white/10 bg-[#3b0a59]/82 px-4 py-3.5 text-white outline-none transition focus:border-cyan-300/45 focus:bg-[#461066]/88"
              >
                <option value="">Year</option>
                {years.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </label>
          </div>
          {errors.birthday ? <span className="mt-2 block text-xs font-medium text-amber-100">{errors.birthday}</span> : null}
        </div>

        <label className="block">
          <span className="text-sm font-semibold text-white">Gender</span>
          <select
            value={gender}
            onChange={(event) => setGender(event.target.value as typeof gender)}
            className="mt-2 w-full rounded-[1rem] border border-white/10 bg-[#3b0a59]/82 px-4 py-3.5 text-white outline-none transition focus:border-cyan-300/45 focus:bg-[#461066]/88"
          >
            <option value="">Select your gender</option>
            {GENDER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.gender ? <span className="mt-2 block text-xs font-medium text-amber-100">{errors.gender}</span> : null}
        </label>

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
        <div className="rounded-[1rem] border border-white/10 bg-white/6 px-3 py-3">
          <div className="mb-2 h-2 overflow-hidden rounded-full bg-white/10">
            <div className={`h-full rounded-full transition-all ${passwordStrength.color}`} style={{ width: `${Math.min(password.length * 8, 100)}%` }} />
          </div>
          <p className="text-xs text-blue-100/78">
            Password strength: <span className="font-semibold text-white">{passwordStrength.level}</span>
          </p>
          <p className="mt-1 text-[11px] text-blue-100/62">
            Use at least 8 characters with uppercase, lowercase, number, and symbol.
          </p>
        </div>

        <AuthField
          id="register-confirm-password"
          label="Re-enter password"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Re-enter your password"
          autoComplete="new-password"
          error={errors.confirmPassword}
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

      <div className="mt-5 space-y-5 text-center">
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
