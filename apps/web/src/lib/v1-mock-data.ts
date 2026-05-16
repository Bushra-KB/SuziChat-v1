import { gameIcons } from "@/lib/game-icons";

export type NavItem = {
  href: string;
  label: string;
  icon: string;
  exact?: boolean;
  isSoon?: boolean;
};

export type ChatLine = {
  id: string;
  senderId: string;
  kind: "mine" | "other";
  message: string;
  time: string;
};

export type Person = {
  id: string;
  name: string;
  handle: string;
  role?: string;
  age?: number;
  location?: string;
  avatar: string;
  status?: "online" | "away" | "busy" | "offline";
  bio?: string;
  headline?: string;
  flags?: string[];
  photo?: string;
};

export type Room = {
  id: string;
  name: string;
  description: string;
  category: string;
  privacy: "Public" | "Friends" | "Private";
  members: number;
  activeNow: number;
  coverTone: string;
  coverImage: string;
  tags: string[];
  owner: string;
};

export type Snap = {
  id: string;
  /** Stable id for `/app/profile/u/[userId]` when mapped from API. */
  authorId?: string;
  /** Username for `/app/profile/[username]` links; set when mapped from API posts. */
  authorUsername?: string;
  author: string;
  avatar: string;
  title: string;
  caption: string;
  visibility: "Public" | "Friends";
  views?: number;
  likes: number;
  comments: number;
  tone: string;
  image: string;
  createdAt?: string;
};

export type Reel = {
  id: string;
  authorId?: string;
  /** Username for `/app/profile/[username]` links; set when mapped from API posts. */
  authorUsername?: string;
  author: string;
  handle: string;
  title: string;
  avatar: string;
  caption: string;
  visibility?: "Public" | "Friends";
  views: number;
  likes: number;
  comments: number;
  video: string;
  tone: string;
  createdAt?: string;
};

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  copy: string;
  time: string;
  action: string;
  unread?: boolean;
};

export const appNavItems: NavItem[] = [
  {
    href: "/app",
    label: "Home",
    icon: "M3 11.5 12 4l9 7.5M6.5 10.5V20h11v-9.5",
    exact: true,
  },
  {
    href: "/app/messages",
    label: "Messages",
    icon: "M4 6h16v10H8l-4 4V6Z",
  },
  {
    href: "/app/dating",
    label: "Dating",
    icon: "M12 20s-6.5-4.3-8.6-7.4C.8 9.4 2 4.9 6.3 4.3 8.7 4 10.5 5.2 12 7c1.5-1.8 3.3-3 5.7-2.7 4.3.6 5.5 5.1 2.9 8.3C18.5 15.7 12 20 12 20Z",
  },
  {
    href: "/app/snaps",
    label: "Snaps",
    icon: "M7 7h10v10H7zM5 5h14v14H5zM9 2v3M15 2v3",
  },
  {
    href: "/app/reels",
    label: "Reels",
    icon: "M8 5h8l4 4v10a2 2 0 0 1-2 2H8a4 4 0 0 1-4-4V9a4 4 0 0 1 4-4Z M11 11.5v4l3-2-3-2Z",
  },
  {
    href: "/app/notifications",
    label: "Notifications",
    icon: "M15 17H5l2-2.5V10a5 5 0 1 1 10 0v4.5L19 17h-4ZM10 20a2 2 0 0 0 4 0",
  },
];

/**
 * Bottom-nav items for the mobile app shell.
 * Order matches the mobile design references: Home · Chat · Reels · Snaps · Profile.
 */
export const mobileNavItems: NavItem[] = [
  {
    href: "/app",
    label: "Home",
    icon: "M3 11.5 12 4l9 7.5M6.5 10.5V20h11v-9.5",
    exact: true,
  },
  {
    href: "/app/messages",
    label: "Chat",
    icon: "M4 6h16v10H8l-4 4V6Z",
  },
  {
    href: "/app/reels",
    label: "Reels",
    icon: "M8 5h8l4 4v10a2 2 0 0 1-2 2H8a4 4 0 0 1-4-4V9a4 4 0 0 1 4-4Z M11 11.5v4l3-2-3-2Z",
  },
  {
    href: "/app/snaps",
    label: "Snaps",
    icon: "M7 7h10v10H7zM5 5h14v14H5zM9 2v3M15 2v3",
  },
  {
    href: "/app/profile",
    label: "Profile",
    icon: "M20 21a8 8 0 1 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
  },
];

export const createMenuItems = [
  {
    href: "/app/snaps?create=1",
    label: "Post Snap",
    icon: "M12 4v10M8 8l4-4 4 4M5 18h14",
  },
  {
    href: "/app/reels?create=1",
    label: "Upload Reel",
    icon: "M8 5h8l4 4v10a2 2 0 0 1-2 2H8a4 4 0 0 1-4-4V9a4 4 0 0 1 4-4Z M11 11.5v4l3-2-3-2Z",
  },
];

export const people: Person[] = [
  {
    id: "alan",
    name: "Alan Rivera",
    handle: "@alan",
    role: "Friend",
    age: 31,
    location: "Dublin, IE",
    avatar: "/ppic/ppic1.jpeg",
    status: "online",
    headline: "Always in music and games.",
    bio: "Night owl, room regular, and the first person to spin up a quick chess lobby.",
    flags: ["EN", "IE"],
  },
  {
    id: "mary",
    name: "Mary Njoroge",
    handle: "@mary",
    role: "Moderator",
    age: 29,
    location: "Nairobi, KE",
    avatar: "/ppic/ppic2.png",
    status: "online",
    headline: "Hosting friendly late-night rooms.",
    bio: "Keeps community rooms warm, safe, and active. Usually in Night Chat or matchmaking friends for games.",
    flags: ["EN", "KE"],
  },
  {
    id: "john",
    name: "John Tesfaye",
    handle: "@john",
    role: "Friend",
    age: 28,
    location: "Addis Ababa, ET",
    avatar: "/ppic/ppic3.jpg",
    status: "away",
    headline: "DMs, reels, and rooms.",
    bio: "Usually floating between voice rooms and direct messages, with a soft spot for reels and sports rooms.",
    flags: ["EN", "ET"],
  },
  {
    id: "nadia",
    name: "Nadia Okello",
    handle: "@nadia",
    role: "New Match",
    age: 27,
    location: "Kampala, UG",
    avatar: "/ppic/ppic2.png",
    status: "busy",
    headline: "Dating + snaps + travel rooms.",
    bio: "Likes low-pressure conversations, public snaps, and cozy travel-themed rooms.",
    flags: ["EN", "UG"],
  },
  {
    id: "steve",
    name: "Steve Laurent",
    handle: "@steve",
    role: "Friend",
    age: 33,
    location: "Paris, FR",
    avatar: "/ppic/ppic1.jpeg",
    status: "online",
    headline: "Game lobbies and quick tables.",
    bio: "Mostly in poker or connect-four lobbies, and always ready to invite people into a private table.",
    flags: ["FR", "EN"],
  },
  {
    id: "lisa",
    name: "Lisa Bauer",
    handle: "@lisa",
    role: "Friend",
    age: 26,
    location: "Berlin, DE",
    avatar: "/ppic/ppic3.jpg",
    status: "online",
    headline: "Snaps and city-night reels.",
    bio: "Builds a lot of visual content, shares friends-only snaps, and collects nightlife room recommendations.",
    flags: ["DE", "EN"],
  },
];

export const mockCurrentUser = {
  id: "me",
  name: "Alex Kim",
  avatar: "/ppic/ppic2.png",
} as const;

export const rooms: Room[] = [
  {
    id: "general-chat",
    name: "General Chat",
    description: "Warm open room for friendly conversations and community check-ins.",
    category: "Social",
    privacy: "Public",
    members: 1480,
    activeNow: 126,
    coverTone:
      "from-fuchsia-500/40 via-violet-500/16 to-cyan-400/10",
    coverImage: "/banner/general_chat_banner.png",
    tags: ["Friendly", "Open", "Daily"],
    owner: "Mary",
  },
  {
    id: "music-lounge",
    name: "Music Lounge",
    description: "Share playlists, compare headphones, and post your current mood track.",
    category: "Music",
    privacy: "Public",
    members: 930,
    activeNow: 88,
    coverTone: "from-cyan-400/34 via-blue-500/18 to-violet-500/12",
    coverImage: "/banner/Music_lounch_banner.png",
    tags: ["Tunes", "Chill", "Requests"],
    owner: "Alan",
  },
  {
    id: "late-night-chat",
    name: "Late Night Chat",
    description: "Adults-only conversations with a slower, more intimate pace.",
    category: "Dating",
    privacy: "Public",
    members: 610,
    activeNow: 43,
    coverTone: "from-pink-500/38 via-fuchsia-500/20 to-amber-400/10",
    coverImage: "/banner/Late_Night_chat_banner.png",
    tags: ["18+", "After Hours", "Voice"],
    owner: "Nadia",
  },
  {
    id: "movie-nights",
    name: "Movie Nights",
    description: "Watchlist swaps, room rewatches, and scene-by-scene reactions.",
    category: "Media",
    privacy: "Friends",
    members: 280,
    activeNow: 27,
    coverTone: "from-amber-500/30 via-orange-500/16 to-pink-500/10",
    coverImage: "/banner/hobbies_banner.png",
    tags: ["Watchlist", "Friends", "Weekly"],
    owner: "Lisa",
  },
  {
    id: "gaming-hangout",
    name: "Gaming Hangout",
    description: "Organize quick matches, invite friends, and move into game tables fast.",
    category: "Games",
    privacy: "Public",
    members: 720,
    activeNow: 64,
    coverTone: "from-violet-500/38 via-indigo-500/18 to-cyan-400/10",
    coverImage: "/banner/gamming_hangout_banner.png",
    tags: ["Tables", "Competitive", "Voice"],
    owner: "Steve",
  },
];

export const roomCategories = [
  "Social",
  "Music",
  "Dating",
  "Games",
  "Sports",
  "Media",
  "Travel",
];

export const directMessageThreads = [
  {
    id: "alan-thread",
    person: people[0],
    preview: "Want to join the chess lobby after rooms?",
    time: "2m",
    unread: 3,
  },
  {
    id: "mary-thread",
    person: people[1],
    preview: "I pinned the new moderation note in General Chat.",
    time: "18m",
    unread: 1,
  },
  {
    id: "john-thread",
    person: people[2],
    preview: "The reels draft looks better on mobile now.",
    time: "1h",
    unread: 0,
  },
  {
    id: "nadia-thread",
    person: people[3],
    preview: "Open to a low-key room tonight if you are.",
    time: "3h",
    unread: 0,
  },
];

export const roomMessages: ChatLine[] = [
  {
    id: "m1",
    senderId: "alan",
    kind: "other" as const,
    message: "The evening room feels quieter now, we can shift into game tables if people want.",
    time: "18:32",
  },
  {
    id: "m2",
    senderId: "me",
    kind: "mine" as const,
    message: "Let’s keep chat open and spin up a chess table on the side for anyone interested.",
    time: "18:35",
  },
  {
    id: "m3",
    senderId: "mary",
    kind: "other" as const,
    message: "Pinned the update. Also inviting John and Lisa into the room now.",
    time: "18:37",
  },
  {
    id: "m4",
    senderId: "john",
    kind: "other" as const,
    message: "I can moderate the thread while the quick game starts.",
    time: "18:39",
  },
  {
    id: "m5",
    senderId: "me",
    kind: "mine" as const,
    message: "Great. I’ll keep the main room warm and route game invites here.",
    time: "18:41",
  },
  {
    id: "m6",
    senderId: "nadia",
    kind: "other" as const,
    message: "I’m here too. We can run quick intros for new people joining.",
    time: "18:42",
  },
  {
    id: "m7",
    senderId: "steve",
    kind: "other" as const,
    message: "Opened one public table and one private table for overflow.",
    time: "18:44",
  },
  {
    id: "m8",
    senderId: "me",
    kind: "mine" as const,
    message: "Perfect. Share private code only in DM if the lobby gets crowded.",
    time: "18:45",
  },
  {
    id: "m9",
    senderId: "alan",
    kind: "other" as const,
    message: "Two new users asked where to start. Sending them to the open table.",
    time: "18:47",
  },
  {
    id: "m10",
    senderId: "mary",
    kind: "other" as const,
    message: "Added quick room rules at the top: be respectful and keep it adult.",
    time: "18:49",
  },
  {
    id: "m11",
    senderId: "me",
    kind: "mine" as const,
    message: "Nice. I’ll also pin a short ‘how to join game tables’ message.",
    time: "18:50",
  },
  {
    id: "m12",
    senderId: "john",
    kind: "other" as const,
    message: "Thread is clean right now. No moderation issues so far.",
    time: "18:52",
  },
  {
    id: "m13",
    senderId: "lisa",
    kind: "other" as const,
    message: "I can host a music queue in voice after this round if people want.",
    time: "18:54",
  },
  {
    id: "m14",
    senderId: "me",
    kind: "mine" as const,
    message: "Yes please. Let’s do game round first, then switch into music lounge energy.",
    time: "18:55",
  },
  {
    id: "m15",
    senderId: "steve",
    kind: "other" as const,
    message: "Table one finished. Opening rematch slot now.",
    time: "18:57",
  },
  {
    id: "m16",
    senderId: "nadia",
    kind: "other" as const,
    message: "New joiners coming from reels. Welcoming them in chat.",
    time: "18:58",
  },
  {
    id: "m17",
    senderId: "me",
    kind: "mine" as const,
    message: "Thanks all. Keep updates flowing here so everyone sees what’s active.",
    time: "19:00",
  },
  {
    id: "m18",
    senderId: "alan",
    kind: "other" as const,
    message: "Copy that. Posting status every few minutes.",
    time: "19:01",
  },
];

export const dmMessages: ChatLine[] = [
  {
    id: "d1",
    senderId: "alan",
    kind: "other" as const,
    message: "Want the private chess table or public lobby tonight?",
    time: "19:14",
  },
  {
    id: "d2",
    senderId: "me",
    kind: "mine" as const,
    message: "Start public. If it gets full, we can move people into a private invite table.",
    time: "19:16",
  },
  {
    id: "d3",
    senderId: "alan",
    kind: "other" as const,
    message: "Perfect. I’ll hold table two and call it out in lobby chat.",
    time: "19:18",
  },
];

export const datingProfiles = [
  {
    id: "emma",
    name: "Emma",
    handle: "@emma",
    age: 29,
    location: "NYC, NY, USA",
    avatar: "/ppic/ppic2.png",
    photo: "/snaps/snap3.jpeg",
    headline: "Live music, city walks, and low-pressure chats.",
    bio: "Looking for playful, adult conversation that can move from public rooms into something more personal if the vibe is right.",
    flags: ["Music", "Travel", "Nightlife"],
  },
  {
    id: "jake",
    name: "Jake",
    handle: "@jake",
    age: 30,
    location: "Chicago, IL, USA",
    avatar: "/ppic/ppic1.jpeg",
    photo: "/snaps/snap4.jpeg",
    headline: "Games hub regular and movie room fan.",
    bio: "Usually online in evenings. Likes rooms first, then matches and DMs after there is some comfort.",
    flags: ["Games", "Movies", "Travel"],
  },
  {
    id: "hannah",
    name: "Hannah",
    handle: "@hannah",
    age: 26,
    location: "Dublin, IE",
    avatar: "/ppic/ppic2.png",
    photo: "/snaps/snap01.png",
    headline: "Friends-only snaps and relaxed rooms.",
    bio: "Here for mature energy, visual storytelling, and the occasional quick lounge conversation.",
    flags: ["Snaps", "Travel", "Chill"],
  },
  {
    id: "lucas",
    name: "Lucas",
    handle: "@lucas",
    age: 32,
    location: "Miami, FL, USA",
    avatar: "/ppic/ppic1.jpeg",
    photo: "/snaps/snap2.png",
    headline: "Sports rooms and dating discover.",
    bio: "Prefers direct conversations after a clean mutual match. Good with voice rooms and travel plans.",
    flags: ["Sports", "Voice", "Travel"],
  },
];

export const snaps: Snap[] = [
  {
    id: "sunset-walk",
    author: "Bushra",
    avatar: "/ppic/ppic2.png",
    title: "Sunset walk",
    caption: "Quiet city light and a slower evening mood.",
    visibility: "Public",
    likes: 342,
    comments: 48,
    tone: "from-orange-400/40 via-pink-500/22 to-violet-500/10",
    image: "/snaps/snap3.jpeg",
  },
  {
    id: "night-friends",
    author: "Bushra",
    avatar: "/ppic/ppic1.jpeg",
    title: "Night with friends",
    caption: "Music room energy moved offline for the weekend.",
    visibility: "Friends",
    likes: 275,
    comments: 32,
    tone: "from-fuchsia-500/38 via-violet-500/22 to-indigo-500/10",
    image: "/snaps/snap01.png",
  },
  {
    id: "ocean-view",
    author: "Bushra",
    avatar: "/ppic/ppic3.jpg",
    title: "Ocean view",
    caption: "A softer reset before jumping back into room chat.",
    visibility: "Public",
    likes: 154,
    comments: 12,
    tone: "from-cyan-400/36 via-sky-500/18 to-violet-500/10",
    image: "/snaps/snap2.png",
  },
  {
    id: "city-lights",
    author: "Bushra",
    avatar: "/ppic/ppic2.png",
    title: "City cafe vibes",
    caption: "Late snack, quick reel draft, then back to DMs.",
    visibility: "Friends",
    likes: 218,
    comments: 27,
    tone: "from-amber-400/30 via-orange-500/18 to-rose-500/12",
    image: "/snaps/snap0.png",
  },
];

export const reels: Reel[] = [
  {
    id: "chill-mix",
    author: "Bushra",
    handle: "@bushra",
    title: "City lights & late nights",
    avatar: "/ppic/ppic2.png",
    caption: "Chillin with my favorite tunes tonight.",
    views: 1200,
    likes: 321,
    comments: 21,
    video: "/reels/reel1.mp4",
    tone: "from-fuchsia-500/34 via-indigo-500/20 to-cyan-400/12",
  },
  {
    id: "night-drive",
    author: "Bushra",
    handle: "@bushra",
    title: "Ocean breeze",
    avatar: "/ppic/ppic2.png",
    caption: "Night drive and room-cleanup playlist.",
    views: 856,
    likes: 210,
    comments: 14,
    video: "/reels/reel2.mp4",
    tone: "from-cyan-400/30 via-violet-500/18 to-pink-500/12",
  },
  {
    id: "game-lobby",
    author: "Bushra",
    handle: "@bushra",
    title: "Dance vibes",
    avatar: "/ppic/ppic1.jpeg",
    caption: "Setting up table lobbies for tonight’s quick matches.",
    views: 2100,
    likes: 188,
    comments: 16,
    video: "/reels/reel3.mp4",
    tone: "from-violet-500/36 via-fuchsia-500/16 to-amber-400/10",
  },
  {
    id: "sunset-therapy",
    author: "Bushra",
    handle: "@bushra",
    title: "Sunset therapy",
    avatar: "/ppic/ppic1.jpeg",
    caption: "Sunset walk with mellow beats and soft city glow.",
    views: 1500,
    likes: 244,
    comments: 19,
    video: "/reels/reel4.mp4",
    tone: "from-amber-400/24 via-pink-500/20 to-fuchsia-500/16",
  },
  {
    id: "good-energy",
    author: "Bushra",
    handle: "@bushra",
    title: "Good energy only",
    avatar: "/ppic/ppic1.jpeg",
    caption: "Weekend crowd, bright lights, and dance-floor momentum.",
    views: 987,
    likes: 176,
    comments: 11,
    video: "/reels/reel5.mp4",
    tone: "from-violet-500/36 via-fuchsia-500/16 to-amber-400/10",
  },
  {
    id: "weekend-wave",
    author: "Bushra",
    handle: "@bushra",
    title: "Weekend wave",
    avatar: "/ppic/ppic2.png",
    caption: "Quick glow-up clip before jumping into voice rooms.",
    views: 1320,
    likes: 262,
    comments: 17,
    video: "/reels/reel6.mp4",
    tone: "from-cyan-400/28 via-blue-500/18 to-violet-500/12",
  },
];

export const games = [
  {
    id: "chess",
    name: "Chess",
    icon: gameIcons.chess,
    copy: "Play with friends or keep a private table open.",
    tone: "from-cyan-400/24 via-blue-400/10 to-transparent",
    playing: "1.2K playing",
  },
  {
    id: "checkers",
    name: "Checkers",
    icon: gameIcons.checkers,
    copy: "Fast two-player tables with public or friends-only queues.",
    tone: "from-pink-400/24 via-fuchsia-400/12 to-transparent",
    playing: "842 playing",
  },
  {
    id: "poker",
    name: "Poker",
    icon: gameIcons.poker,
    copy: "Private and public lobbies with easy invite flow.",
    tone: "from-emerald-400/24 via-cyan-400/12 to-transparent",
    playing: "1.5K playing",
  },
  {
    id: "connect4",
    name: "Connect 4",
    icon: gameIcons.connect4,
    copy: "Quick lobby matches for short sessions and low friction.",
    tone: "from-amber-400/24 via-orange-400/12 to-transparent",
    playing: "623 playing",
  },
  {
    id: "texasholdem",
    name: "Texas Hold'em",
    icon: gameIcons.texasholdem,
    copy: "Classic no-limit tables with blinds, raises, and showdown.",
    tone: "from-rose-400/24 via-fuchsia-400/12 to-transparent",
    playing: "932 playing",
  },
];

export const gameLobbyTables = [
  { table: "Table 1", players: "Alan vs Jane", status: "Playing", watchers: 3 },
  { table: "Table 2", players: "Mary vs Empty", status: "Watching", watchers: 2 },
  { table: "Table 3", players: "John vs Sue", status: "Playing", watchers: 5 },
  { table: "Table 4", players: "Empty vs Lisa", status: "Playing", watchers: 1 },
  { table: "Table 5", players: "Steve vs Nathan", status: "Private", watchers: 0 },
  { table: "Table 6", players: "Mark vs Sally", status: "Playing", watchers: 4 },
  { table: "Table 7", players: "Sarah vs Empty", status: "Waiting", watchers: 1 },
  { table: "Table 8", players: "Empty vs Alex", status: "Watching", watchers: 2 },
];

export const gameLobbyChat = [
  "Alan: anyone for chess?",
  "Mary: table 6 is free",
  "John: I’m watching table 2",
  "Steve: private table open if you know the invite code",
];

export const notifications: NotificationItem[] = [
  {
    id: "n1",
    type: "Friend Request",
    title: "Catherine sent you a friend request",
    copy: "They found you from a room invite and want to connect.",
    time: "5 minutes ago",
    action: "Review",
    unread: true,
  },
  {
    id: "n2",
    type: "New Message",
    title: "Alan mentioned you in Music Lounge",
    copy: "“Can you post the reel draft in the room?”",
    time: "18 minutes ago",
    action: "Open",
    unread: true,
  },
  {
    id: "n3",
    type: "Dating Match",
    title: "You matched with Maria",
    copy: "You can start a DM now that interest is mutual.",
    time: "1 hour ago",
    action: "Chat",
  },
  {
    id: "n4",
    type: "Snap Activity",
    title: "Your sunset snap got new comments",
    copy: "3 people responded to the public post.",
    time: "2 hours ago",
    action: "View",
  },
];

export const settingsSections = [
  {
    title: "Privacy",
    items: [
      "Show online status",
      "Default snaps visibility",
      "Default reels visibility",
      "Show or hide dating profile",
    ],
  },
  {
    title: "Safety",
    items: ["Blocked users", "Reports you submitted", "Room moderation history"],
  },
  {
    title: "Appearance",
    items: ["Reduced transparency", "Reduced motion", "High contrast"],
  },
];

export const adminStats = [
  { label: "Active Users", value: "35,439", tone: "from-cyan-400/30 to-transparent" },
  { label: "Daily Reports", value: "148", tone: "from-pink-400/30 to-transparent" },
  { label: "Active Rooms", value: "2,646", tone: "from-violet-400/30 to-transparent" },
  { label: "Pending Reports", value: "56", tone: "from-amber-400/30 to-transparent" },
];

export const adminReports = [
  {
    title: "Spam room promotion",
    reporter: "Nadia",
    severity: "High",
    area: "Rooms",
    status: "Open",
  },
  {
    title: "Harassment in DM thread",
    reporter: "Mary",
    severity: "High",
    area: "Messages",
    status: "Review",
  },
  {
    title: "Snap visibility dispute",
    reporter: "John",
    severity: "Medium",
    area: "Snaps",
    status: "Queued",
  },
];

export const adminRoomRows = [
  {
    name: "General Chat",
    email: "owner@suzichat.com",
    role: "Admin",
    category: "Social",
    status: "Live",
  },
  {
    name: "Music Lounge",
    email: "mary@suzichat.com",
    role: "Moderator",
    category: "Music",
    status: "Stable",
  },
  {
    name: "Late Night Chat",
    email: "nadia@suzichat.com",
    role: "Owner",
    category: "Dating",
    status: "Flagged",
  },
  {
    name: "Chess Club",
    email: "steve@suzichat.com",
    role: "Owner",
    category: "Games",
    status: "Stable",
  },
];
