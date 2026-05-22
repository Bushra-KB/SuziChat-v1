import type { DatingDiscoverItem, DatingMatchRow } from "@/lib/dating-client";
import { resolveUserAvatarUrl } from "@/lib/avatar-url";

export type DeckLayer = {
  transform: string;
  opacity: number;
  zIndex: number;
  isActive: boolean;
};

export function cardImageUrl(item: DatingDiscoverItem) {
  return item.photoUrl?.trim() || resolveUserAvatarUrl(item.user.avatarUrl);
}

export function peerPhoto(m: DatingMatchRow) {
  return m.peer.dating?.photoUrl?.trim() || resolveUserAvatarUrl(m.peer.user.avatarUrl);
}

export function getCircularOffset(index: number, activeIndex: number, total: number) {
  let offset = index - activeIndex;
  if (offset > total / 2) {
    offset -= total;
  }
  if (offset < -total / 2) {
    offset += total;
  }
  return offset;
}

export function getLayerForOffset(offset: number): DeckLayer | null {
  const absOffset = Math.abs(offset);
  if (absOffset > 2) {
    return null;
  }
  if (offset === 0) {
    return {
      transform: "translate3d(0, 0, 50px) scale(1.08)",
      opacity: 1,
      zIndex: 20,
      isActive: true,
    };
  }
  const leftSide = offset < 0;
  if (absOffset === 1) {
    return {
      transform: `translate3d(${leftSide ? "-72%" : "72%"}, 0, -150px) rotateY(${leftSide ? "25deg" : "-25deg"}) translateX(${leftSide ? "-20%" : "20%"}) scale(0.84)`,
      opacity: 0.62,
      zIndex: 10,
      isActive: false,
    };
  }
  return {
    transform: `translate3d(${leftSide ? "-124%" : "124%"}, 0, -280px) rotateY(${leftSide ? "34deg" : "-34deg"}) translateX(${leftSide ? "-26%" : "26%"}) scale(0.68)`,
    opacity: 0.32,
    zIndex: 5,
    isActive: false,
  };
}

export function filtersFromProfile(profile: {
  minAgePref: number;
  maxAgePref: number;
  seekGender: string;
} | null) {
  if (!profile) {
    return { minAge: 18, maxAge: 99, gender: "any", country: "", search: "" };
  }
  return {
    minAge: profile.minAgePref,
    maxAge: profile.maxAgePref,
    gender: profile.seekGender || "any",
    country: "",
    search: "",
  };
}
