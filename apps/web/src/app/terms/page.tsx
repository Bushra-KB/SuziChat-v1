import { LegalPage } from "@/components/auth/legal-page";

export default function TermsPage() {
  return (
    <LegalPage eyebrow="Terms" title="Terms & Conditions">
      <p>
        You must be at least 18 years old to use Suzi Chat. You are responsible for the content you share, the messages you send, and all activity from your account.
      </p>
      <p>
        Do not harass, threaten, impersonate others, upload illegal content, or use the platform in a way that harms users or service reliability. Suzi Chat may remove content or restrict accounts to protect the community.
      </p>
      <p>
        For help with account access or moderation issues, contact support@suzichat.com.
      </p>
    </LegalPage>
  );
}
