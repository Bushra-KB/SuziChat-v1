"use client";

import { useCallback, useEffect, useState, type Dispatch, type FormEvent, type ReactNode, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import {
  closeAdminGameSession,
  createAdminNotification,
  createAdminRoomCategory,
  deleteAdminDatingMatch,
  deleteAdminDatingProfile,
  deleteAdminDirectMessage,
  deleteAdminGameLobby,
  deleteAdminPost,
  deleteAdminPostComment,
  deleteAdminRoom,
  deleteAdminRoomCategory,
  deleteAdminRoomMessage,
  deleteAdminUser,
  getAdminDashboard,
  getAdminModeration,
  listAdminAuditLogs,
  listAdminDating,
  listAdminDirectMessages,
  listAdminGames,
  listAdminNotifications,
  listAdminPostComments,
  listAdminPosts,
  listAdminRoomCategories,
  listAdminRoomMessages,
  listAdminRooms,
  listAdminUsers,
  updateAdminDatingProfile,
  updateAdminPost,
  updateAdminRoom,
  updateAdminRoomCategory,
  updateAdminUser,
  type AdminAuditLog,
  type AdminDashboard,
  type AdminDating,
  type AdminDatingMatch,
  type AdminDatingProfile,
  type AdminGames,
  type AdminMessage,
  type AdminModerationQueues,
  type AdminNotification,
  type AdminPerson,
  type AdminPost,
  type AdminPostComment,
  type AdminRoom,
  type AdminRoomCategory,
  type AdminRoomJoinRequest,
  type AdminUser,
} from "@/lib/admin-client";
import { changePassword, clearAuthSession, getStoredAuthSession } from "@/lib/auth-client";

type AdminTab =
  | "overview"
  | "users"
  | "rooms"
  | "categories"
  | "content"
  | "messages"
  | "games"
  | "dating"
  | "notifications"
  | "moderation"
  | "audit";

const navItems: Array<{ id: AdminTab; label: string; description: string }> = [
  { id: "overview", label: "Overview", description: "KPIs and activity" },
  { id: "users", label: "Users", description: "Accounts and roles" },
  { id: "rooms", label: "Rooms", description: "Chat spaces" },
  { id: "categories", label: "Categories", description: "Room taxonomy" },
  { id: "content", label: "Content", description: "Snaps, reels, comments" },
  { id: "messages", label: "Messages", description: "Room and direct messages" },
  { id: "games", label: "Games", description: "Lobbies and sessions" },
  { id: "dating", label: "Dating", description: "Profiles and matches" },
  { id: "notifications", label: "Notifications", description: "Broadcasts" },
  { id: "moderation", label: "Moderation", description: "Queues" },
  { id: "audit", label: "Audit log", description: "Admin actions" },
];

const emptyModeration: AdminModerationQueues = {
  users: [],
  posts: [],
  datingProfiles: [],
  roomJoinRequests: [],
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "-";
  }
}

function personName(person?: AdminPerson | { username: string; displayName: string | null } | null) {
  if (!person) return "-";
  return person.displayName?.trim() || person.username;
}

function metric(value: unknown) {
  return typeof value === "number" ? value.toLocaleString() : "0";
}

function Button({
  children,
  onClick,
  tone = "neutral",
  disabled,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: "neutral" | "primary" | "danger" | "success";
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        tone === "primary" && "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700",
        tone === "danger" && "bg-rose-600 text-white shadow-sm hover:bg-rose-700",
        tone === "success" && "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700",
        tone === "neutral" && "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
      )}
    >
      {children}
    </button>
  );
}

function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "green" | "red" | "blue" | "amber" | "purple" }) {
  return (
    <span
      className={cx(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
        tone === "slate" && "bg-slate-100 text-slate-700",
        tone === "green" && "bg-emerald-100 text-emerald-700",
        tone === "red" && "bg-rose-100 text-rose-700",
        tone === "blue" && "bg-blue-100 text-blue-700",
        tone === "amber" && "bg-amber-100 text-amber-800",
        tone === "purple" && "bg-violet-100 text-violet-700",
      )}
    >
      {children}
    </span>
  );
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={cx("rounded-2xl border border-slate-200 bg-white shadow-sm", className)}>{children}</section>;
}

function SectionTitle({ title, copy }: { title: string; copy?: string }) {
  return (
    <div>
      <h2 className="text-lg font-bold text-slate-950">{title}</h2>
      {copy ? <p className="mt-1 text-sm text-slate-500">{copy}</p> : null}
    </div>
  );
}

function EmptyState({ text = "Nothing to show yet." }: { text?: string }) {
  return <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">{text}</div>;
}

function inputClass(extra = "") {
  return cx(
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100",
    extra,
  );
}

export function AdminPanelClient() {
  const router = useRouter();
  const session = getStoredAuthSession();
  const accessToken = session?.accessToken ?? "";
  const adminUser = session?.user;
  const [tab, setTab] = useState<AdminTab>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState("");
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [categories, setCategories] = useState<AdminRoomCategory[]>([]);
  const [roomMessages, setRoomMessages] = useState<AdminMessage[]>([]);
  const [directMessages, setDirectMessages] = useState<AdminMessage[]>([]);
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [comments, setComments] = useState<AdminPostComment[]>([]);
  const [games, setGames] = useState<AdminGames>({ lobbies: [], sessions: [] });
  const [dating, setDating] = useState<AdminDating>({ profiles: [], matches: [] });
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [moderation, setModeration] = useState<AdminModerationQueues>(emptyModeration);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: "", description: "", color: "#4f46e5", sortOrder: 0 });
  const [notificationForm, setNotificationForm] = useState({ title: "", body: "", userId: "", broadcast: true });

  const loadAll = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError("");
    try {
      const [
        dashboardNext,
        usersNext,
        roomsNext,
        categoriesNext,
        roomMessagesNext,
        directMessagesNext,
        postsNext,
        commentsNext,
        gamesNext,
        datingNext,
        notificationsNext,
        moderationNext,
        auditNext,
      ] = await Promise.all([
        getAdminDashboard(accessToken),
        listAdminUsers(accessToken, { search }),
        listAdminRooms(accessToken, { search }),
        listAdminRoomCategories(accessToken),
        listAdminRoomMessages(accessToken, { search }),
        listAdminDirectMessages(accessToken, { search }),
        listAdminPosts(accessToken, { search }),
        listAdminPostComments(accessToken, { search }),
        listAdminGames(accessToken),
        listAdminDating(accessToken),
        listAdminNotifications(accessToken),
        getAdminModeration(accessToken),
        listAdminAuditLogs(accessToken),
      ]);
      setDashboard(dashboardNext);
      setUsers(usersNext);
      setRooms(roomsNext);
      setCategories(categoriesNext);
      setRoomMessages(roomMessagesNext);
      setDirectMessages(directMessagesNext);
      setPosts(postsNext);
      setComments(commentsNext);
      setGames(gamesNext);
      setDating(datingNext);
      setNotifications(notificationsNext);
      setModeration(moderationNext);
      setAuditLogs(auditNext);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load admin dashboard.");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, search]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  async function runMutation(action: () => Promise<unknown>, reload = true) {
    setIsMutating(true);
    setError("");
    try {
      await action();
      if (reload) await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Admin action failed.");
    } finally {
      setIsMutating(false);
    }
  }

  function logout() {
    clearAuthSession();
    router.push("/login");
  }

  const activeNav = navItems.find((item) => item.id === tab) ?? navItems[0];
  const stats = dashboard?.stats ?? {};
  const health = dashboard?.health ?? {};
  const kpis = [
    { label: "Total users", value: stats.users, sub: `${metric(stats.newUsers7d)} new this week`, tone: "blue" },
    { label: "Rooms", value: stats.rooms, sub: `${metric(stats.rooms7d)} new this week`, tone: "purple" },
    { label: "Posts", value: stats.posts, sub: `${metric(stats.posts7d)} new this week`, tone: "green" },
    { label: "Messages", value: Number(stats.roomMessages ?? 0) + Number(stats.directMessages ?? 0), sub: `${metric(Number(stats.roomMessages7d ?? 0) + Number(stats.directMessages7d ?? 0))} this week`, tone: "amber" },
    { label: "Dating profiles", value: stats.datingProfiles, sub: `${metric(stats.discoverableDatingProfiles)} discoverable`, tone: "red" },
    { label: "Active games", value: stats.activeSessions, sub: `${metric(stats.finishedSessions7d)} finished this week`, tone: "slate" },
  ];

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      {sidebarOpen ? <div className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden" onClick={() => setSidebarOpen(false)} /> : null}
      <aside
        className={cx(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200 bg-slate-950 text-white transition-transform lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="border-b border-white/10 px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-200">Suzi Chat</p>
          <h1 className="mt-2 text-xl font-bold">Admin Console</h1>
          <p className="mt-1 text-sm text-slate-400">Operational dashboard</p>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setTab(item.id);
                setSidebarOpen(false);
              }}
              className={cx(
                "w-full rounded-xl px-3 py-3 text-left transition",
                tab === item.id ? "bg-indigo-600 text-white shadow-sm" : "text-slate-300 hover:bg-white/8 hover:text-white",
              )}
            >
              <span className="block text-sm font-semibold">{item.label}</span>
              <span className="mt-0.5 block text-xs opacity-70">{item.description}</span>
            </button>
          ))}
        </nav>
        <div className="border-t border-white/10 p-4">
          <p className="text-sm font-semibold">{adminUser?.displayName || adminUser?.username || "Admin"}</p>
          <p className="truncate text-xs text-slate-400">{adminUser?.email}</p>
        </div>
      </aside>

      <section className="min-h-screen lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button type="button" className="rounded-lg border border-slate-200 bg-white p-2 lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open admin navigation">
                <span className="block h-0.5 w-5 bg-slate-800" />
                <span className="mt-1 block h-0.5 w-5 bg-slate-800" />
                <span className="mt-1 block h-0.5 w-5 bg-slate-800" />
              </button>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{activeNav.description}</p>
                <h2 className="truncate text-xl font-bold text-slate-950">{activeNav.label}</h2>
              </div>
            </div>
            <div className="hidden min-w-[18rem] max-w-md flex-1 md:block">
              <input value={search} onChange={(event) => setSearch(event.target.value)} className={inputClass()} placeholder="Search users, rooms, content, messages..." />
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => void loadAll()} disabled={isLoading}>Refresh</Button>
              <Button onClick={() => setChangePasswordOpen(true)}>Change password</Button>
              <Button tone="danger" onClick={logout}>Logout</Button>
            </div>
          </div>
          <div className="border-t border-slate-100 px-4 py-3 md:hidden">
            <input value={search} onChange={(event) => setSearch(event.target.value)} className={inputClass()} placeholder="Search admin data..." />
          </div>
        </header>

        <div className="px-4 py-6 sm:px-6 lg:px-8">
          {error ? <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
          {isLoading ? <Card className="p-6 text-sm text-slate-600">Loading dashboard data...</Card> : null}
          {!isLoading && tab === "overview" ? (
            <OverviewTab kpis={kpis} dashboard={dashboard} health={health} />
          ) : null}
          {!isLoading && tab === "users" ? (
            <UsersTab users={users} isMutating={isMutating} onUpdate={(user, payload) => runMutation(() => updateAdminUser(accessToken, user.id, payload))} onDelete={(user) => runMutation(() => deleteAdminUser(accessToken, user.id))} />
          ) : null}
          {!isLoading && tab === "rooms" ? (
            <RoomsTab rooms={rooms} categories={categories} onUpdate={(room, payload) => runMutation(() => updateAdminRoom(accessToken, room.slug, payload))} onDelete={(room) => runMutation(() => deleteAdminRoom(accessToken, room.slug))} />
          ) : null}
          {!isLoading && tab === "categories" ? (
            <CategoriesTab form={categoryForm} setForm={setCategoryForm} categories={categories} isMutating={isMutating} onCreate={() => runMutation(async () => { await createAdminRoomCategory(accessToken, categoryForm); setCategoryForm({ name: "", description: "", color: "#4f46e5", sortOrder: 0 }); })} onUpdate={(category, payload) => runMutation(() => updateAdminRoomCategory(accessToken, category.id, payload))} onDelete={(category) => runMutation(() => deleteAdminRoomCategory(accessToken, category.id))} />
          ) : null}
          {!isLoading && tab === "content" ? (
            <ContentTab posts={posts} comments={comments} onPostVisibility={(post) => runMutation(() => updateAdminPost(accessToken, post.id, { visibility: post.visibility === "Public" ? "Hidden" : "Public" }))} onPostDelete={(post) => runMutation(() => deleteAdminPost(accessToken, post.id))} onCommentDelete={(comment) => runMutation(() => deleteAdminPostComment(accessToken, comment.id))} />
          ) : null}
          {!isLoading && tab === "messages" ? (
            <MessagesTab roomMessages={roomMessages} directMessages={directMessages} onRoomDelete={(message) => runMutation(() => deleteAdminRoomMessage(accessToken, message.id))} onDirectDelete={(message) => runMutation(() => deleteAdminDirectMessage(accessToken, message.id))} />
          ) : null}
          {!isLoading && tab === "games" ? (
            <GamesTab games={games} onClose={(sessionRow) => runMutation(() => closeAdminGameSession(accessToken, sessionRow.id))} onDeleteLobby={(lobby) => runMutation(() => deleteAdminGameLobby(accessToken, lobby.id))} />
          ) : null}
          {!isLoading && tab === "dating" ? (
            <DatingTab dating={dating} onProfileUpdate={(profile) => runMutation(() => updateAdminDatingProfile(accessToken, profile.id, { isDiscoverable: !profile.isDiscoverable }))} onProfileDelete={(profile) => runMutation(() => deleteAdminDatingProfile(accessToken, profile.id))} onMatchDelete={(match) => runMutation(() => deleteAdminDatingMatch(accessToken, match.id))} />
          ) : null}
          {!isLoading && tab === "notifications" ? (
            <NotificationsTab form={notificationForm} setForm={setNotificationForm} notifications={notifications} isMutating={isMutating} onSend={() => runMutation(async () => { await createAdminNotification(accessToken, notificationForm); setNotificationForm({ title: "", body: "", userId: "", broadcast: true }); })} />
          ) : null}
          {!isLoading && tab === "moderation" ? <ModerationTab moderation={moderation} /> : null}
          {!isLoading && tab === "audit" ? <AuditTab auditLogs={auditLogs} /> : null}
        </div>
      </section>

      {changePasswordOpen ? (
        <ChangePasswordModal
          accessToken={accessToken}
          onClose={() => setChangePasswordOpen(false)}
          onSaved={() => {
            setChangePasswordOpen(false);
            logout();
          }}
        />
      ) : null}
    </main>
  );
}

function OverviewTab({
  kpis,
  dashboard,
  health,
}: {
  kpis: Array<{ label: string; value: unknown; sub: string; tone: string }>;
  dashboard: AdminDashboard | null;
  health: Record<string, number>;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {kpis.map((item) => (
          <Card key={item.label} className="p-5">
            <p className="text-sm font-medium text-slate-500">{item.label}</p>
            <p className="mt-3 text-3xl font-bold text-slate-950">{metric(item.value)}</p>
            <p className="mt-2 text-xs text-slate-500">{item.sub}</p>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="p-5">
          <SectionTitle title="Platform health" copy="Common admin dashboard health indicators." />
          <div className="mt-5 space-y-4">
            {[
              ["User verification", health.userVerificationRate],
              ["Adult confirmation", health.adultConfirmationRate],
              ["Discoverable dating", health.discoverableDatingRate],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-slate-700">{label}</span>
                  <span className="text-slate-500">{value ?? 0}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-indigo-600" style={{ width: `${Math.min(100, Number(value ?? 0))}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <SectionTitle title="Recent admin activity" copy="Latest actions performed in the admin panel." />
          <div className="mt-5 space-y-3">
            {(dashboard?.recentAuditLogs ?? []).slice(0, 6).map((log) => (
              <ActivityRow key={log.id} title={log.action.replaceAll("_", " ")} meta={`${personName(log.admin)} - ${log.entityType} - ${formatDate(log.createdAt)}`} />
            ))}
            {dashboard?.recentAuditLogs?.length ? null : <EmptyState />}
          </div>
        </Card>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <MiniList title="Recent users" items={dashboard?.recentUsers ?? []} getTitle={(item) => item.displayName || item.username} getMeta={(item) => `${item.email} - ${item.role}`} />
        <MiniList title="Recent rooms" items={dashboard?.recentRooms ?? []} getTitle={(item) => item.name} getMeta={(item) => `${item.category} - ${item.privacy}`} />
        <MiniList title="Recent content" items={dashboard?.recentPosts ?? []} getTitle={(item) => item.title || item.caption || item.kind} getMeta={(item) => `${item.kind} - ${personName(item.author)}`} />
        <MiniList title="Recent games" items={dashboard?.recentGameSessions ?? []} getTitle={(item) => item.lobby?.title || item.gameType} getMeta={(item) => `${item.status} - ${formatDate(item.updatedAt)}`} />
      </div>
    </div>
  );
}

function UsersTab({
  users,
  isMutating,
  onUpdate,
  onDelete,
}: {
  users: AdminUser[];
  isMutating: boolean;
  onUpdate: (user: AdminUser, payload: Partial<AdminUser>) => Promise<void>;
  onDelete: (user: AdminUser) => Promise<void>;
}) {
  return (
    <Card className="overflow-hidden">
      <TableHeader title="Users" copy="Manage account roles, verification, and adult confirmation." />
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3">User</th>
              <th className="px-5 py-3">Role</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Activity</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-5 py-4">
                  <p className="font-semibold text-slate-950">{user.displayName || user.username}</p>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </td>
                <td className="px-5 py-4"><Badge tone={user.role === "ADMIN" ? "purple" : "blue"}>{user.role}</Badge></td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={user.isEmailVerified ? "green" : "amber"}>{user.isEmailVerified ? "Verified" : "Unverified"}</Badge>
                    <Badge tone={user.isAdultConfirmed ? "green" : "red"}>{user.isAdultConfirmed ? "Adult OK" : "Adult pending"}</Badge>
                  </div>
                </td>
                <td className="px-5 py-4 text-slate-500">{user._count?.posts ?? 0} posts, {user._count?.roomsOwned ?? 0} rooms</td>
                <td className="px-5 py-4">
                  <div className="flex justify-end gap-2">
                    <Button disabled={isMutating} onClick={() => void onUpdate(user, { role: user.role === "ADMIN" ? "USER" : "ADMIN" })}>{user.role === "ADMIN" ? "Make user" : "Make admin"}</Button>
                    <Button disabled={isMutating} onClick={() => void onUpdate(user, { isEmailVerified: !user.isEmailVerified })}>{user.isEmailVerified ? "Unverify" : "Verify"}</Button>
                    <Button tone="danger" disabled={isMutating} onClick={() => window.confirm("Delete this user?") && void onDelete(user)}>Delete</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {users.length === 0 ? <div className="p-5"><EmptyState /></div> : null}
    </Card>
  );
}

function RoomsTab({
  rooms,
  categories,
  onUpdate,
  onDelete,
}: {
  rooms: AdminRoom[];
  categories: AdminRoomCategory[];
  onUpdate: (room: AdminRoom, payload: Partial<AdminRoom>) => Promise<void>;
  onDelete: (room: AdminRoom) => Promise<void>;
}) {
  return (
    <Card className="overflow-hidden">
      <TableHeader title="Rooms" copy="Moderate rooms, categories, privacy, memberships, and message volume." />
      <div className="grid gap-4 p-5">
        {rooms.map((room) => (
          <div key={room.id} className="rounded-xl border border-slate-200 p-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-950">{room.name}</p>
                <p className="mt-1 text-sm text-slate-500">{room.description || room.slug}</p>
                <p className="mt-2 text-xs text-slate-500">Owner: {personName(room.owner)} - {room._count?.memberships ?? 0} members - {room._count?.messages ?? 0} messages</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-[11rem_9rem_auto]">
                <select className={inputClass()} value={room.category} onChange={(event) => void onUpdate(room, { category: event.target.value })}>
                  {[room.category, ...categories.map((cat) => cat.name)].filter((value, index, all) => value && all.indexOf(value) === index).map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                <select className={inputClass()} value={room.privacy} onChange={(event) => void onUpdate(room, { privacy: event.target.value })}>
                  {["Public", "Friends", "Private"].map((privacy) => <option key={privacy} value={privacy}>{privacy}</option>)}
                </select>
                <Button tone="danger" onClick={() => window.confirm("Delete this room?") && void onDelete(room)}>Delete</Button>
              </div>
            </div>
          </div>
        ))}
        {rooms.length === 0 ? <EmptyState /> : null}
      </div>
    </Card>
  );
}

function CategoriesTab({
  form,
  setForm,
  categories,
  isMutating,
  onCreate,
  onUpdate,
  onDelete,
}: {
  form: { name: string; description: string; color: string; sortOrder: number };
  setForm: Dispatch<SetStateAction<{ name: string; description: string; color: string; sortOrder: number }>>;
  categories: AdminRoomCategory[];
  isMutating: boolean;
  onCreate: () => Promise<void>;
  onUpdate: (category: AdminRoomCategory, payload: Partial<AdminRoomCategory>) => Promise<void>;
  onDelete: (category: AdminRoomCategory) => Promise<void>;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
      <Card className="p-5">
        <SectionTitle title="Create category" copy="Add standard room categories for user-created rooms." />
        <div className="mt-5 grid gap-3">
          <input className={inputClass()} value={form.name} onChange={(event) => setForm((next) => ({ ...next, name: event.target.value }))} placeholder="Category name" />
          <input className={inputClass()} value={form.description} onChange={(event) => setForm((next) => ({ ...next, description: event.target.value }))} placeholder="Description" />
          <input className={inputClass()} value={form.color} onChange={(event) => setForm((next) => ({ ...next, color: event.target.value }))} placeholder="#4f46e5" />
          <input className={inputClass()} type="number" value={form.sortOrder} onChange={(event) => setForm((next) => ({ ...next, sortOrder: Number(event.target.value) }))} placeholder="Sort order" />
          <Button tone="primary" disabled={!form.name.trim() || isMutating} onClick={() => void onCreate()}>Create category</Button>
        </div>
      </Card>
      <Card className="p-5">
        <SectionTitle title="Categories" copy="Enable, disable, or remove room categories." />
        <div className="mt-5 space-y-3">
          {categories.map((category) => (
            <div key={category.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color ?? "#4f46e5" }} />
                  <p className="font-semibold text-slate-950">{category.name}</p>
                  <Badge tone={category.isActive ? "green" : "amber"}>{category.isActive ? "Active" : "Inactive"}</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-500">{category.description || "-"}</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => void onUpdate(category, { isActive: !category.isActive })}>{category.isActive ? "Disable" : "Enable"}</Button>
                <Button tone="danger" onClick={() => window.confirm("Delete this category?") && void onDelete(category)}>Delete</Button>
              </div>
            </div>
          ))}
          {categories.length === 0 ? <EmptyState /> : null}
        </div>
      </Card>
    </div>
  );
}

function ContentTab({
  posts,
  comments,
  onPostVisibility,
  onPostDelete,
  onCommentDelete,
}: {
  posts: AdminPost[];
  comments: AdminPostComment[];
  onPostVisibility: (post: AdminPost) => Promise<void>;
  onPostDelete: (post: AdminPost) => Promise<void>;
  onCommentDelete: (comment: AdminPostComment) => Promise<void>;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <ListCard title="Snaps and Reels" copy="Review user media posts.">
        {posts.map((post) => (
          <ActionRow key={post.id} title={post.title || post.caption || post.kind} meta={`${post.kind} - ${personName(post.author)} - ${post.visibility}`}>
            <Button onClick={() => void onPostVisibility(post)}>Toggle visibility</Button>
            <Button tone="danger" onClick={() => window.confirm("Delete this post?") && void onPostDelete(post)}>Delete</Button>
          </ActionRow>
        ))}
        {posts.length === 0 ? <EmptyState /> : null}
      </ListCard>
      <ListCard title="Comments" copy="Moderate comments across posts.">
        {comments.map((comment) => (
          <ActionRow key={comment.id} title={comment.body} meta={`${personName(comment.user)} - ${formatDate(comment.createdAt)}`}>
            <Button tone="danger" onClick={() => window.confirm("Delete this comment?") && void onCommentDelete(comment)}>Delete</Button>
          </ActionRow>
        ))}
        {comments.length === 0 ? <EmptyState /> : null}
      </ListCard>
    </div>
  );
}

function MessagesTab({
  roomMessages,
  directMessages,
  onRoomDelete,
  onDirectDelete,
}: {
  roomMessages: AdminMessage[];
  directMessages: AdminMessage[];
  onRoomDelete: (message: AdminMessage) => Promise<void>;
  onDirectDelete: (message: AdminMessage) => Promise<void>;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <MessageList title="Room messages" messages={roomMessages} onDelete={onRoomDelete} />
      <MessageList title="Direct messages" messages={directMessages} onDelete={onDirectDelete} />
    </div>
  );
}

function GamesTab({
  games,
  onClose,
  onDeleteLobby,
}: {
  games: AdminGames;
  onClose: (sessionRow: AdminGames["sessions"][number]) => Promise<void>;
  onDeleteLobby: (lobby: AdminGames["lobbies"][number]) => Promise<void>;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <ListCard title="Game lobbies" copy="Delete abandoned or abusive lobbies.">
        {games.lobbies.map((lobby) => (
          <ActionRow key={lobby.id} title={lobby.title} meta={`${lobby.gameType} - ${lobby.status} - ${personName(lobby.owner)}`}>
            <Button tone="danger" onClick={() => window.confirm("Delete this lobby?") && void onDeleteLobby(lobby)}>Delete</Button>
          </ActionRow>
        ))}
        {games.lobbies.length === 0 ? <EmptyState /> : null}
      </ListCard>
      <ListCard title="Game sessions" copy="Close stuck active game sessions.">
        {games.sessions.map((sessionRow) => (
          <ActionRow key={sessionRow.id} title={sessionRow.lobby?.title || sessionRow.gameType} meta={`${sessionRow.status} - ${formatDate(sessionRow.updatedAt)}`}>
            <Button disabled={sessionRow.status !== "ACTIVE"} onClick={() => window.confirm("Close this session?") && void onClose(sessionRow)}>Close</Button>
          </ActionRow>
        ))}
        {games.sessions.length === 0 ? <EmptyState /> : null}
      </ListCard>
    </div>
  );
}

function DatingTab({
  dating,
  onProfileUpdate,
  onProfileDelete,
  onMatchDelete,
}: {
  dating: AdminDating;
  onProfileUpdate: (profile: AdminDatingProfile) => Promise<void>;
  onProfileDelete: (profile: AdminDatingProfile) => Promise<void>;
  onMatchDelete: (match: AdminDatingMatch) => Promise<void>;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <ListCard title="Dating profiles" copy="Hide or remove dating profiles.">
        {dating.profiles.map((profile) => (
          <ActionRow key={profile.id} title={personName(profile.user)} meta={`${profile.headline || profile.gender || "-"} - ${profile.isDiscoverable ? "Discoverable" : "Hidden"}`}>
            <Button onClick={() => void onProfileUpdate(profile)}>{profile.isDiscoverable ? "Hide" : "Make discoverable"}</Button>
            <Button tone="danger" onClick={() => window.confirm("Delete this dating profile?") && void onProfileDelete(profile)}>Delete</Button>
          </ActionRow>
        ))}
        {dating.profiles.length === 0 ? <EmptyState /> : null}
      </ListCard>
      <ListCard title="Dating matches" copy="Remove problematic matches and conversations.">
        {dating.matches.map((match) => (
          <ActionRow key={match.id} title={`${personName(match.userA)} / ${personName(match.userB)}`} meta={`${match._count?.messages ?? 0} messages - ${formatDate(match.createdAt)}`}>
            <Button tone="danger" onClick={() => window.confirm("Delete this match?") && void onMatchDelete(match)}>Delete</Button>
          </ActionRow>
        ))}
        {dating.matches.length === 0 ? <EmptyState /> : null}
      </ListCard>
    </div>
  );
}

function NotificationsTab({
  form,
  setForm,
  notifications,
  isMutating,
  onSend,
}: {
  form: { title: string; body: string; userId: string; broadcast: boolean };
  setForm: Dispatch<SetStateAction<{ title: string; body: string; userId: string; broadcast: boolean }>>;
  notifications: AdminNotification[];
  isMutating: boolean;
  onSend: () => Promise<void>;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
      <Card className="p-5">
        <SectionTitle title="Send notification" copy="Broadcast to all users or target one user by ID." />
        <div className="mt-5 grid gap-3">
          <input className={inputClass()} value={form.title} onChange={(event) => setForm((next) => ({ ...next, title: event.target.value }))} placeholder="Title" />
          <textarea className={inputClass("min-h-32 resize-none")} value={form.body} onChange={(event) => setForm((next) => ({ ...next, body: event.target.value }))} placeholder="Body" />
          {!form.broadcast ? <input className={inputClass()} value={form.userId} onChange={(event) => setForm((next) => ({ ...next, userId: event.target.value }))} placeholder="Recipient user ID" /> : null}
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={form.broadcast} onChange={(event) => setForm((next) => ({ ...next, broadcast: event.target.checked }))} />
            Broadcast to all users
          </label>
          <Button tone="primary" disabled={!form.title.trim() || !form.body.trim() || isMutating} onClick={() => void onSend()}>Send notification</Button>
        </div>
      </Card>
      <ListCard title="Recent notifications" copy="Latest platform notifications.">
        {notifications.map((notification) => (
          <ActivityRow key={notification.id} title={notification.title} meta={`${personName(notification.user)} - ${formatDate(notification.createdAt)}`} body={notification.body} />
        ))}
        {notifications.length === 0 ? <EmptyState /> : null}
      </ListCard>
    </div>
  );
}

function ModerationTab({ moderation }: { moderation: AdminModerationQueues }) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <MiniList title="Users needing review" items={moderation.users} getTitle={(item) => item.displayName || item.username} getMeta={(item) => `${item.email} - ${item.isEmailVerified ? "verified" : "unverified"} - ${item.isAdultConfirmed ? "adult OK" : "adult pending"}`} />
      <MiniList title="Hidden content" items={moderation.posts} getTitle={(item) => item.title || item.caption || item.kind} getMeta={(item) => `${item.kind} - ${personName(item.author)} - ${item.visibility}`} />
      <MiniList title="Hidden dating profiles" items={moderation.datingProfiles} getTitle={(item) => personName(item.user)} getMeta={(item) => item.headline || item.gender || "Hidden dating profile"} />
      <MiniList title="Pending room requests" items={moderation.roomJoinRequests} getTitle={(item: AdminRoomJoinRequest) => item.room?.name ?? "Room request"} getMeta={(item) => `${personName(item.user)} - ${formatDate(item.createdAt)}`} />
    </div>
  );
}

function AuditTab({ auditLogs }: { auditLogs: AdminAuditLog[] }) {
  return (
    <ListCard title="Audit log" copy="Administrative actions recorded for traceability.">
      {auditLogs.map((log) => (
        <ActivityRow key={log.id} title={log.action.replaceAll("_", " ")} meta={`${personName(log.admin)} - ${log.entityType}${log.entityId ? ` - ${log.entityId.slice(0, 10)}` : ""} - ${formatDate(log.createdAt)}`} />
      ))}
      {auditLogs.length === 0 ? <EmptyState /> : null}
    </ListCard>
  );
}

function ChangePasswordModal({
  accessToken,
  onClose,
  onSaved,
}: {
  accessToken: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await changePassword(accessToken, { currentPassword, newPassword });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Change admin password</h2>
            <p className="mt-1 text-sm text-slate-500">You will be logged out after the password changes.</p>
          </div>
          <button type="button" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" onClick={onClose}>Close</button>
        </div>
        {error ? <div className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}
        <div className="mt-5 grid gap-3">
          <input className={inputClass()} type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} placeholder="Current password" />
          <input className={inputClass()} type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="New password" />
          <Button type="submit" tone="primary" disabled={!currentPassword || newPassword.length < 8 || busy}>{busy ? "Saving..." : "Change password"}</Button>
        </div>
      </form>
    </div>
  );
}

function TableHeader({ title, copy }: { title: string; copy?: string }) {
  return (
    <div className="border-b border-slate-200 px-5 py-4">
      <SectionTitle title={title} copy={copy} />
    </div>
  );
}

function MiniList<T>({
  title,
  items,
  getTitle,
  getMeta,
}: {
  title: string;
  items: T[];
  getTitle: (item: T) => string;
  getMeta: (item: T) => string;
}) {
  return (
    <ListCard title={title}>
      {items.map((item, index) => (
        <ActivityRow key={index} title={getTitle(item)} meta={getMeta(item)} />
      ))}
      {items.length === 0 ? <EmptyState /> : null}
    </ListCard>
  );
}

function ListCard({ title, copy, children }: { title: string; copy?: string; children: ReactNode }) {
  return (
    <Card className="p-5">
      <SectionTitle title={title} copy={copy} />
      <div className="mt-5 space-y-3">{children}</div>
    </Card>
  );
}

function ActivityRow({ title, meta, body }: { title: string; meta: string; body?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="line-clamp-2 text-sm font-semibold text-slate-950">{title}</p>
      {body ? <p className="mt-1 line-clamp-2 text-sm text-slate-600">{body}</p> : null}
      <p className="mt-2 text-xs text-slate-500">{meta}</p>
    </div>
  );
}

function ActionRow({ title, meta, children }: { title: string; meta: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <p className="line-clamp-2 text-sm font-semibold text-slate-950">{title}</p>
        <p className="mt-1 text-xs text-slate-500">{meta}</p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">{children}</div>
    </div>
  );
}

function MessageList({
  title,
  messages,
  onDelete,
}: {
  title: string;
  messages: AdminMessage[];
  onDelete: (message: AdminMessage) => Promise<void>;
}) {
  return (
    <ListCard title={title} copy="Search, inspect, and delete unsafe messages.">
      {messages.map((message) => (
        <ActionRow key={message.id} title={message.body} meta={`${personName(message.sender)} ${message.recipient ? `to ${personName(message.recipient)}` : message.room ? `in #${message.room.name}` : ""} - ${formatDate(message.createdAt)}`}>
          <Button tone="danger" onClick={() => window.confirm("Delete this message?") && void onDelete(message)}>Delete</Button>
        </ActionRow>
      ))}
      {messages.length === 0 ? <EmptyState /> : null}
    </ListCard>
  );
}
