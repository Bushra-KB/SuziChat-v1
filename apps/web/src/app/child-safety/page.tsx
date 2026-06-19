import { LegalPage } from "@/components/auth/legal-page";

export default function ChildSafetyPage() {
  return (
    <LegalPage eyebrow="Child Safety" title="Child Safety Standards">
      <p>
        Suzi Chat is an adults-only platform intended for users aged 18 and over. We have
        zero tolerance for child sexual abuse and exploitation (CSAE) and for any content,
        conduct, or contact that endangers minors.
      </p>
      <p>
        <strong>Prohibited content and conduct.</strong> The following are strictly
        forbidden and result in immediate content removal and permanent account
        termination: any child sexual abuse material (CSAM); sexualization of minors;
        grooming or attempts to contact, solicit, or exploit minors; and any other content
        that endangers children.
      </p>
      <p>
        <strong>Reporting.</strong> You can report accounts or content directly in the app
        using the block and report tools, or by emailing{" "}
        <a href="mailto:support@suzichat.com">support@suzichat.com</a>. Reports involving
        child safety are prioritized and reviewed promptly.
      </p>
      <p>
        <strong>Our response.</strong> We remove violating content, terminate the accounts
        responsible, preserve relevant data, and report CSAE to law enforcement and the
        appropriate authorities (including the National Center for Missing &amp; Exploited
        Children, NCMEC, where applicable) as required by law.
      </p>
      <p>
        <strong>Age requirement.</strong> Accounts are restricted to adults. Users confirm
        they are 18 or older during sign-up, and accounts found to belong to minors are
        removed.
      </p>
      <p>
        <strong>Compliance.</strong> These standards align with applicable child-safety
        laws and the Google Play CSAE standards. For child-safety questions or to reach our
        designated child-safety contact, email{" "}
        <a href="mailto:support@suzichat.com">support@suzichat.com</a>.
      </p>
    </LegalPage>
  );
}
