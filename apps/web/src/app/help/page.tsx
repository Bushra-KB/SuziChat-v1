import { LegalPage } from "@/components/auth/legal-page";

export default function HelpPage() {
  return (
    <LegalPage eyebrow="Help" title="Help & Reporting">
      <p>
        If you cannot access your account, use forgot password from the login page. If you did not receive a verification email, use the resend verification page.
      </p>
      <p>
        To report abuse, unsafe behavior, account issues, or content concerns, contact support@suzichat.com with your account email and a short description of the problem.
      </p>
      <p>
        For administrative requests, contact admin@suzichat.com.
      </p>
    </LegalPage>
  );
}
