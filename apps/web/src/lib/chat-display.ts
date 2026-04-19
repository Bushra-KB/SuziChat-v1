import { mockCurrentUser, people } from "@/lib/v1-mock-data";

export function formatFirstNameLastInitial(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return fullName;
  }
  if (parts.length === 1) {
    return parts[0];
  }
  const first = parts[0];
  const initial = parts[parts.length - 1]?.charAt(0).toUpperCase() ?? "";
  return `${first} ${initial}.`;
}

export function resolveChatSender(senderId: string): {
  fullName: string;
  avatar: string;
  profileHref: string;
} {
  if (senderId === "me") {
    return {
      fullName: mockCurrentUser.name,
      avatar: mockCurrentUser.avatar,
      profileHref: "/app/profile",
    };
  }

  const person = people.find((p) => p.id === senderId);
  if (person) {
    return {
      fullName: person.name,
      avatar: person.avatar,
      profileHref: `/app/profile/${encodeURIComponent(person.id)}`,
    };
  }

  return {
    fullName: "Member",
    avatar: "/ppic/ppic1.jpeg",
    profileHref: "/app/friends",
  };
}
