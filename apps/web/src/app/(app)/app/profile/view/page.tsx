"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PublicProfileClient } from "@/components/app/public-profile-client";

function ProfileViewInner() {
  const params = useSearchParams();
  const userId = params.get("uid") ?? undefined;
  const username = params.get("u") ?? undefined;
  return <PublicProfileClient username={username} userId={userId} />;
}

// Static-export friendly public profile screen. Prefer `?uid=<id>` for reliable
// deep links; `?u=<username>` is the fallback when only a username is known.
export default function ProfileViewPage() {
  return (
    <Suspense fallback={null}>
      <ProfileViewInner />
    </Suspense>
  );
}
