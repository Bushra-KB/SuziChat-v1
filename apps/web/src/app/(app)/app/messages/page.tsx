import { Suspense } from "react";
import { MessagesInbox } from "@/components/app/messages-inbox";
import { Panel } from "@/components/ui/suzi-primitives";

function InboxFallback() {
  return (
    <section className="suzi-app-frame-fill">
      <div className="suzi-messages-grid">
        <Panel className="flex h-full min-h-0 items-center justify-center p-[var(--panel-pad)]">
          <p className="text-[var(--fs-sm)] text-[var(--text-muted)]">Loading inbox…</p>
        </Panel>
        <Panel className="flex h-full min-h-0 items-center justify-center p-[var(--panel-pad)]">
          <p className="text-[var(--fs-sm)] text-[var(--text-muted)]">Loading messages…</p>
        </Panel>
        <Panel className="flex h-full min-h-0 items-center justify-center p-[var(--panel-pad)]">
          <p className="text-[var(--fs-sm)] text-[var(--text-muted)]">Loading friends…</p>
        </Panel>
      </div>
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
