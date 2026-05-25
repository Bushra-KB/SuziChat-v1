import { LegalPage } from "@/components/auth/legal-page";

export default function PrivacyPage() {
  return (
    <LegalPage eyebrow="Privacy" title="Privacy Policy">
      <p>
        Suzi Chat collects account details such as username, email, encrypted password, profile details, photos, messages, rooms, dating activity, game activity, and technical logs needed to operate and protect the platform.
      </p>
      <p>
        We use this information to provide app features, secure accounts, prevent abuse, support users, and improve reliability. Uploaded content and messages are processed so they can be shown to the intended users.
      </p>
      <p>
        For privacy or data questions, contact support@suzichat.com.
      </p>
    </LegalPage>
  );
}
