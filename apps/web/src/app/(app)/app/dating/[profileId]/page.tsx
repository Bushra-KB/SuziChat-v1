import { redirect } from "next/navigation";

export default async function DatingProfileRedirectPage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  const { profileId } = await params;
  redirect(`/app/dating?view=${encodeURIComponent(profileId)}`);
}
