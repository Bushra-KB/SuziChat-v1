import { LegalPage } from "@/components/auth/legal-page";

export default function DataDeletionPage() {
  return (
    <LegalPage eyebrow="Data Deletion" title="Delete Your Account & Data">
      <p>
        You can permanently delete your Suzi Chat account and all associated data at any
        time. Deletion is immediate and cannot be undone.
      </p>
      <p>
        <strong>In the app:</strong> open the menu and choose <strong>Delete account</strong>
        {" "}(or, while signed in, go to <strong>suzichat.com/app/delete-account</strong>),
        then confirm by typing your username. Your account and data are removed right away.
      </p>
      <p>
        <strong>By email:</strong> if you can&apos;t sign in, email{" "}
        <a href="mailto:support@suzichat.com">support@suzichat.com</a> from the email
        address on your account and request deletion. We verify ownership and delete your
        data within 30 days.
      </p>
      <p>
        <strong>What gets deleted:</strong> your profile and account details; direct, room,
        and dating messages; posts (reels and snaps) with their likes and comments; your
        dating profile, swipes, and matches; rooms you own; game lobbies and history;
        friends and friend requests; and notifications.
      </p>
      <p>
        A limited amount of information may be retained briefly where required for security,
        fraud prevention, or legal compliance, and is then deleted.
      </p>
    </LegalPage>
  );
}
