"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { RoomChatView } from "@/components/app/room-chat-view";

function RoomViewInner() {
  const roomSlug = useSearchParams().get("r") ?? "";
  return <RoomChatView roomSlug={roomSlug} />;
}

// Static-export friendly room screen: the room slug travels as `?r=<slug>`
// instead of a dynamic `[roomId]` path segment.
export default function RoomViewPage() {
  return (
    <Suspense fallback={null}>
      <RoomViewInner />
    </Suspense>
  );
}
