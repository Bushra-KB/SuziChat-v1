import { PublicProfileClient } from "@/components/app/public-profile-client";

export default async function PublicProfileByIdPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  return <PublicProfileClient userId={userId} />;
}
