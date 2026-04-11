import { PersonRow, ThreadRow } from "@/components/app/v1-blocks";
import { Panel, SectionHeader, cx } from "@/components/ui/suzi-primitives";
import { directMessageThreads, dmMessages, people } from "@/lib/v1-mock-data";

export default function MessagesPage() {
  const activeThread = directMessageThreads[0];

  return (
    <section className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_300px]">
      <Panel className="flex h-[75vh] min-h-[32rem] max-h-[75vh] flex-col p-5">
        <SectionHeader eyebrow="Inbox" title="Direct messages" />
        <div className="mt-5">
          <input className="suzi-input" placeholder="Search conversations" />
        </div>
        <div className="suzi-scrollbar mt-5 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          {directMessageThreads.map((thread, index) => (
            <ThreadRow
              key={thread.id}
              person={thread.person}
              preview={thread.preview}
              time={thread.time}
              unread={thread.unread}
              href="/app/messages"
              active={index === 0}
            />
          ))}
        </div>
      </Panel>

      <Panel className="flex h-[75vh] min-h-[32rem] max-h-[75vh] flex-col overflow-hidden p-0">
        <div className="border-b border-white/8 px-6 py-5">
          <SectionHeader
            eyebrow="Conversation"
            title={activeThread.person.name}
            copy={activeThread.person.location}
          />
        </div>
        <div className="suzi-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto bg-white px-6 py-6">
          {dmMessages.map((message) => {
            const mine = message.kind === "mine";
            return (
              <div key={message.id} className={cx("flex", mine ? "justify-end" : "justify-start")}>
                <div
                  className={cx(
                    "max-w-[min(36rem,100%)] rounded-[0.85rem] border px-4 py-3 shadow-sm",
                    mine ? "border-fuchsia-200 bg-fuchsia-50" : "border-slate-200 bg-slate-50",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">{message.author}</p>
                    <span className="text-xs text-slate-500">{message.time}</span>
                  </div>
                  <p className="mt-1.5 text-sm leading-6 text-slate-700">{message.message}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="border-t border-white/8 px-6 py-5">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_140px]">
            <input className="suzi-input" placeholder="Write a direct message" />
            <button type="button" className="suzi-primary-btn px-4 py-3 text-sm">
              Send
            </button>
          </div>
        </div>
      </Panel>

      <Panel className="flex h-[75vh] min-h-[32rem] max-h-[75vh] flex-col p-5">
        <SectionHeader eyebrow="Friends" title="Quick invite" />
        <div className="mt-5">
          <input className="suzi-input" placeholder="Search friends" />
        </div>
        <div className="suzi-scrollbar mt-5 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          {people.slice(0, 4).map((person) => (
            <PersonRow
              key={person.id}
              person={person}
              compact
              action={
                <button type="button" className="suzi-secondary-btn px-3 py-2 text-xs">
                  DM
                </button>
              }
            />
          ))}
        </div>
      </Panel>
    </section>
  );
}
