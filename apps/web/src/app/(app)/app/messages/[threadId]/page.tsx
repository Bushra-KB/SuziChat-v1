import { ChatBubble, PersonRow } from "@/components/app/v1-blocks";
import { Panel, SectionHeader } from "@/components/ui/suzi-primitives";
import { directMessageThreads, dmMessages, people } from "@/lib/v1-mock-data";

export default async function MessageThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;
  const thread = directMessageThreads.find((item) => item.id === threadId) ?? directMessageThreads[0];

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Panel className="flex min-h-[72vh] flex-col p-0">
        <div className="border-b border-white/8 px-6 py-5">
          <SectionHeader
            eyebrow="DM Chat"
            title={thread.person.name}
            copy={thread.person.headline}
          />
        </div>
        <div className="suzi-scrollbar flex-1 space-y-4 overflow-y-auto px-6 py-6">
          {dmMessages.map((message) => (
            <ChatBubble key={message.id} {...message} />
          ))}
        </div>
        <div className="border-t border-white/8 px-6 py-5">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_140px]">
            <input className="suzi-input" placeholder={`Message ${thread.person.name}`} />
            <button type="button" className="suzi-primary-btn px-4 py-3 text-sm">
              Send
            </button>
          </div>
        </div>
      </Panel>

      <Panel className="p-5">
        <SectionHeader eyebrow="Actions" title="Safety + quick links" />
        <div className="mt-5 space-y-3">
          <button type="button" className="suzi-secondary-btn w-full px-4 py-3 text-sm">
            Report user
          </button>
          <button type="button" className="suzi-secondary-btn w-full px-4 py-3 text-sm">
            Block user
          </button>
        </div>
        <div className="mt-6 space-y-3">
          {people.slice(0, 3).map((person) => (
            <PersonRow key={person.id} person={person} compact />
          ))}
        </div>
      </Panel>
    </section>
  );
}
