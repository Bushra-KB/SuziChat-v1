import { RoomChatView } from "@/components/app/room-chat-view";

export default async function RoomChatPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  return <RoomChatView roomSlug={roomId} />;
}
