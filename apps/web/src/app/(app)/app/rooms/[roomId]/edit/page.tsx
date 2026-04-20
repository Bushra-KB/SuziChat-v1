import { EditRoomPageClient } from "@/components/app/edit-room-page-client";

export default async function EditRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  return <EditRoomPageClient roomSlug={roomId} />;
}
