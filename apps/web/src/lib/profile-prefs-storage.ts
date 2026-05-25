const STORAGE_PREFIX = "suzi-profile-prefs";

export type StoredProfilePrefs = {
  version?: number;
  prefToggles: Record<string, boolean>;
  privacy: Record<string, string>;
};

const PREFS_VERSION = 2;

const DEFAULT_PREFS: StoredProfilePrefs = {
  version: PREFS_VERSION,
  prefToggles: {
    showOnline: true,
    snapsFriends: true,
    roomInvites: true,
  },
  privacy: {
    messages: "Everyone",
    snaps: "Everyone",
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
    const privacy = { ...DEFAULT_PREFS.privacy, ...parsed.privacy };
    if (
      !parsed.version &&
      privacy.messages === "Friends" &&
      privacy.snaps === "Friends" &&
      privacy.reels === "Everyone"
    ) {
      privacy.messages = "Everyone";
      privacy.snaps = "Everyone";
    }
    return {
      version: PREFS_VERSION,
      prefToggles: { ...DEFAULT_PREFS.prefToggles, ...parsed.prefToggles },
      privacy,
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
