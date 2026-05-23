const STORAGE_PREFIX = "suzi-profile-prefs";

export type StoredProfilePrefs = {
  prefToggles: Record<string, boolean>;
  privacy: Record<string, string>;
};

const DEFAULT_PREFS: StoredProfilePrefs = {
  prefToggles: {
    showOnline: true,
    snapsFriends: true,
    roomInvites: true,
  },
  privacy: {
    messages: "Friends",
    snaps: "Friends",
    reels: "Everyone",
  },
};

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}:${userId}`;
}

export function loadProfilePrefs(userId: string): StoredProfilePrefs {
  if (typeof window === "undefined") {
    return DEFAULT_PREFS;
  }
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) {
      return DEFAULT_PREFS;
    }
    const parsed = JSON.parse(raw) as Partial<StoredProfilePrefs>;
    return {
      prefToggles: { ...DEFAULT_PREFS.prefToggles, ...parsed.prefToggles },
      privacy: { ...DEFAULT_PREFS.privacy, ...parsed.privacy },
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function saveProfilePrefs(userId: string, prefs: StoredProfilePrefs) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(prefs));
  } catch {
    // ignore quota / private mode
  }
}
