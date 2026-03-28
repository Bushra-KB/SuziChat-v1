import { ChatBubble, PersonRow, ThreadRow } from "@/components/app/v1-blocks";
import { Panel, SectionHeader } from "@/components/ui/suzi-primitives";
import { directMessageThreads, dmMessages, people } from "@/lib/v1-mock-data";

export default function MessagesPage() {
  const activeThread = directMessageThreads[0];

  return (
    <section className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_300px]">
      <Panel className="p-5">
        <SectionHeader eyebrow="Inbox" title="Direct messages" />
        <div className="mt-5">
          <input className="suzi-input" placeholder="Search conversations" />
        </div>
        <div className="mt-5 space-y-3">
          {directMessageThreads.map((thread, index) => (
            <ThreadRow
              key={thread.id}
              person={thread.person}
              preview={thread.preview}
              time={thread.time}
              unread={thread.unread}
              href={`/app/messages/${thread.id}`}
              active={index === 0}
            />
          ))}
        </div>
      </Panel>

      <Panel className="flex min-h-[72vh] flex-col p-0">
        <div className="border-b border-white/8 px-6 py-5">
          <SectionHeader
            eyebrow="Conversation"
            title={activeThread.person.name}
            copy={activeThread.person.location}
          />
        </div>
        <div className="suzi-scrollbar flex-1 space-y-4 overflow-y-auto px-6 py-6">
          {dmMessages.map((message) => (
            <ChatBubble key={message.id} {...message} />
          ))}
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

      <Panel className="p-5">
        <SectionHeader eyebrow="Friends" title="Quick invite" />
        <div className="mt-5 space-y-3">
          {people.slice(0, 4).map((person) => (
            <PersonRow
              key={person.id}
              person={person}
              compact
              action={
                <button type="button" className="suzi-secondary-btn px-3 py-2 text-xs">
                  Invite
                </button>
              }
            />
          ))}
        </div>
      </Panel>
    </section>
  );
}
