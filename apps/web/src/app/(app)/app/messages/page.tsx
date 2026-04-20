import { Suspense } from "react";
import { MessagesInbox } from "@/components/app/messages-inbox";
import { Panel } from "@/components/ui/suzi-primitives";

function InboxFallback() {
  return (
    <section className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_300px]">
      <Panel className="p-6">
        <p className="text-sm text-[var(--text-muted)]">Loading inbox…</p>
      </Panel>
    </section>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<InboxFallback />}>
      <MessagesInbox />
    </Suspense>
  );
}
