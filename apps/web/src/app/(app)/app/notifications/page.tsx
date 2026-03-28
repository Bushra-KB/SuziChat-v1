import { NotificationRow } from "@/components/app/v1-blocks";
import { Chip, Panel, SectionHeader } from "@/components/ui/suzi-primitives";
import { notifications } from "@/lib/v1-mock-data";

export default function NotificationsPage() {
  return (
    <section className="space-y-6">
      <Panel className="p-6 sm:p-7">
        <SectionHeader
          eyebrow="Notifications"
          title="Requests, mentions, matches, and activity"
          action={
            <button type="button" className="suzi-secondary-btn px-4 py-2.5 text-sm">
              Mark all read
            </button>
          }
        />

        <div className="mt-6 flex flex-wrap gap-2">
          <Chip active tone="pink">All</Chip>
          <Chip>Mentions</Chip>
          <Chip>Requests</Chip>
          <Chip tone="cyan">Social</Chip>
        </div>

        <div className="mt-6 space-y-4">
          {notifications.map((item) => (
            <NotificationRow key={item.id} item={item} />
          ))}
        </div>
      </Panel>
    </section>
  );
}
