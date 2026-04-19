import { notFound } from "next/navigation";
import { MemberProfileView } from "@/components/app/member-profile-view";
import { people } from "@/lib/v1-mock-data";

export default async function MemberProfileRoute({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = await params;
  const person = people.find((p) => p.id === memberId);

  if (!person) {
    notFound();
  }

  return <MemberProfileView person={person} />;
}
