"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
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
  type AdminDashboard,
  type AdminDating,
  type AdminGames,
  type AdminMessage,
  type AdminNotification,
  type AdminPost,
  type AdminPostComment,
  type AdminRoom,
  type AdminRoomCategory,
  type AdminUser,
} from "@/lib/admin-client";
import { getStoredAuthSession } from "@/lib/auth-client";
import { useI18n } from "@/lib/i18n";
import { Chip, Panel, SectionHeader, cx } from "@/components/ui/suzi-primitives";

type AdminTab =
  | "overview"
  | "users"
  | "rooms"
  | "categories"
  | "content"
  | "messages"
  | "games"
  | "dating"
  | "notifications";

const tabs: Array<{ id: AdminTab; labelKey: Parameters<ReturnType<typeof useI18n>["t"]>[0] }> = [
  { id: "overview", labelKey: "admin.tabs.overview" },
  { id: "users", labelKey: "admin.tabs.users" },
  { id: "rooms", labelKey: "admin.tabs.rooms" },
  { id: "categories", labelKey: "admin.tabs.categories" },
  { id: "content", labelKey: "admin.tabs.content" },
  { id: "messages", labelKey: "admin.tabs.messages" },
  { id: "games", labelKey: "admin.tabs.games" },
  { id: "dating", labelKey: "admin.tabs.dating" },
  { id: "notifications", labelKey: "admin.tabs.notifications" },
];

function formatDate(value?: string | null) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "—";
  }
}

function personName(person?: { username: string; displayName: string | null } | null) {
  if (!person) return "—";
  return person.displayName || person.username;
}

function cardClass(active = false) {
  return cx(
    "rounded-2xl border bg-white/[0.03] p-4 shadow-[0_16px_40px_rgba(15,23,42,0.18)]",
    active ? "border-cyan-300/35 bg-cyan-300/[0.08]" : "border-white/10",
  );
}

function inputClass(extra?: string) {
  return cx(
    "rounded-xl border border-white/10 bg-slate-950/35 px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/45",
    extra,
  );
}

function ActionButton({
  children,
  onClick,
  tone = "neutral",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: "neutral" | "danger" | "primary";
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "rounded-xl border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-45",
        tone === "primary" &&
          "border-cyan-300/35 bg-cyan-300/15 text-cyan-100 hover:bg-cyan-300/25",
        tone === "danger" &&
          "border-rose-300/25 bg-rose-400/10 text-rose-100 hover:bg-rose-400/18",
        tone === "neutral" &&
          "border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]",
      )}
    >
      {children}
    </button>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/12 bg-white/[0.02] p-6 text-center text-sm text-slate-400">
      {text}
    </div>
  );
}

export function AdminPanelClient() {
  const { t } = useI18n();
  const session = getStoredAuthSession();
  const accessToken = session?.accessToken ?? "";
  const isAdmin = session?.user.role === "ADMIN";
  const [tab, setTab] = useState<AdminTab>("overview");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
    color: "#22d3ee",
    sortOrder: 0,
  });
  const [notificationForm, setNotificationForm] = useState({
    title: "",
    body: "",
    userId: "",
    broadcast: true,
  });

  const loadAll = useCallback(async () => {
    if (!accessToken || !isAdmin) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.error"));
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, isAdmin, search, t]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  async function runMutation(action: () => Promise<unknown>, reload = true) {
    setIsMutating(true);
    setError(null);
    try {
      await action();
      if (reload) await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.error"));
    } finally {
      setIsMutating(false);
    }
  }

  const statCards = useMemo(() => {
    const stats = dashboard?.stats ?? {};
    return [
      ["admin.stats.users", stats.users],
      ["admin.stats.rooms", stats.rooms],
      ["admin.stats.posts", stats.posts],
      ["admin.stats.roomMessages", stats.roomMessages],
      ["admin.stats.directMessages", stats.directMessages],
      ["admin.stats.datingProfiles", stats.datingProfiles],
      ["admin.stats.datingMatches", stats.datingMatches],
      ["admin.stats.gameLobbies", stats.gameLobbies],
      ["admin.stats.activeSessions", stats.activeSessions],
      ["admin.stats.notifications", stats.notifications],
    ] as const;
  }, [dashboard]);

  if (!isAdmin) {
    return (
      <section className="suzi-app-frame-fill">
        <div className="suzi-app-frame-scroll suzi-scrollbar pr-1">
          <Panel className="p-7">
            <SectionHeader
              eyebrow={t("admin.eyebrow")}
              title={t("admin.accessDenied")}
              copy={t("admin.accessDeniedCopy")}
            />
          </Panel>
        </div>
      </section>
    );
  }

  return (
    <section className="suzi-app-frame-fill">
      <div className="suzi-app-frame-scroll suzi-scrollbar space-y-5 pr-1">
        <Panel className="overflow-hidden p-0">
          <div className="relative p-5 sm:p-7">
            <div className="pointer-events-none absolute inset-0 opacity-60 [background:radial-gradient(ellipse_at_8%_0%,rgba(34,211,238,0.16),transparent_48%),radial-gradient(ellipse_at_88%_20%,rgba(217,70,239,0.14),transparent_44%)]" />
            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <SectionHeader eyebrow={t("admin.eyebrow")} title={t("admin.title")} copy={t("admin.copy")} />
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className={inputClass("w-full min-w-[14rem] sm:w-auto")}
                  placeholder={t("admin.search")}
                />
                <ActionButton tone="primary" onClick={() => void loadAll()} disabled={isLoading}>
                  {t("admin.refresh")}
                </ActionButton>
              </div>
            </div>
            {error ? (
              <div className="relative mt-5 rounded-2xl border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                {error}
              </div>
            ) : null}
          </div>
        </Panel>

        <div className="flex gap-2 overflow-x-auto pb-1 suzi-thin-scroll">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cx(
                "shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition",
                tab === item.id
                  ? "border-cyan-300/40 bg-cyan-300/16 text-cyan-100"
                  : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.07]",
              )}
            >
              {t(item.labelKey)}
            </button>
          ))}
        </div>

        {isLoading ? (
          <Panel className="p-7 text-sm text-slate-300">{t("admin.loading")}...</Panel>
        ) : null}

        {!isLoading && tab === "overview" ? (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {statCards.map(([key, value]) => (
                <div key={key} className={cardClass()}>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-slate-400">
                    {t(key)}
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-white">{value ?? 0}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-5 xl:grid-cols-2">
              <MiniList title={t("admin.recentUsers")} items={dashboard?.recentUsers ?? []} getTitle={(item) => item.displayName || item.username} getMeta={(item) => `${item.email} · ${item.role}`} />
              <MiniList title={t("admin.recentRooms")} items={dashboard?.recentRooms ?? []} getTitle={(item) => item.name} getMeta={(item) => `${item.category} · ${item.privacy}`} />
              <MiniList title={t("admin.recentPosts")} items={dashboard?.recentPosts ?? []} getTitle={(item) => item.title || item.caption || item.kind} getMeta={(item) => `${item.kind} · ${personName(item.author)}`} />
              <MiniList title={t("admin.recentGames")} items={dashboard?.recentGameSessions ?? []} getTitle={(item) => item.lobby?.title || item.gameType} getMeta={(item) => `${item.status} · ${formatDate(item.updatedAt)}`} />
            </div>
          </div>
        ) : null}

        {!isLoading && tab === "users" ? (
          <Panel className="p-5">
            <SectionHeader eyebrow={t("admin.tabs.users")} title={`${users.length} ${t("admin.user")}`} />
            <div className="mt-5 grid gap-3">
              {users.map((user) => (
                <div key={user.id} className={cardClass(user.role === "ADMIN")}>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="font-semibold text-white">{user.displayName || user.username}</p>
                      <p className="mt-1 text-sm text-slate-400">{user.email}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Chip tone={user.role === "ADMIN" ? "pink" : "cyan"}>{user.role}</Chip>
                        <Chip tone={user.isEmailVerified ? "cyan" : "gold"}>
                          {user.isEmailVerified ? "Verified" : "Unverified"}
                        </Chip>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <ActionButton
                        onClick={() =>
                          void runMutation(() =>
                            updateAdminUser(accessToken, user.id, {
                              role: user.role === "ADMIN" ? "USER" : "ADMIN",
                            }),
                          )
                        }
                      >
                        {user.role === "ADMIN" ? t("admin.makeUser") : t("admin.makeAdmin")}
                      </ActionButton>
                      <ActionButton
                        onClick={() =>
                          void runMutation(() =>
                            updateAdminUser(accessToken, user.id, {
                              isEmailVerified: !user.isEmailVerified,
                            }),
                          )
                        }
                      >
                        {user.isEmailVerified ? t("admin.unverify") : t("admin.verify")}
                      </ActionButton>
                      <ActionButton
                        tone="danger"
                        onClick={() => {
                          if (window.confirm(t("admin.confirmDelete"))) {
                            void runMutation(() => deleteAdminUser(accessToken, user.id));
                          }
                        }}
                      >
                        {t("admin.delete")}
                      </ActionButton>
                    </div>
                  </div>
                </div>
              ))}
              {users.length === 0 ? <EmptyState text={t("admin.empty")} /> : null}
            </div>
          </Panel>
        ) : null}

        {!isLoading && tab === "rooms" ? (
          <Panel className="p-5">
            <SectionHeader eyebrow={t("admin.tabs.rooms")} title={`${rooms.length} ${t("admin.tabs.rooms")}`} />
            <div className="mt-5 grid gap-3">
              {rooms.map((room) => (
                <div key={room.id} className={cardClass()}>
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">{room.name}</p>
                      <p className="mt-1 text-sm text-slate-400">{room.description || room.slug}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        {t("admin.owner")}: {personName(room.owner)} · {room._count?.memberships ?? 0} members · {room._count?.messages ?? 0} messages
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <select
                        className={inputClass()}
                        value={room.category}
                        onChange={(event) =>
                          void runMutation(() =>
                            updateAdminRoom(accessToken, room.slug, { category: event.target.value }),
                          )
                        }
                      >
                        {[room.category, ...categories.map((cat) => cat.name)]
                          .filter((value, index, all) => value && all.indexOf(value) === index)
                          .map((category) => (
                            <option key={category} value={category} className="bg-slate-950">
                              {category}
                            </option>
                          ))}
                      </select>
                      <select
                        className={inputClass()}
                        value={room.privacy}
                        onChange={(event) =>
                          void runMutation(() =>
                            updateAdminRoom(accessToken, room.slug, { privacy: event.target.value }),
                          )
                        }
                      >
                        {["Public", "Friends", "Private"].map((privacy) => (
                          <option key={privacy} value={privacy} className="bg-slate-950">
                            {privacy}
                          </option>
                        ))}
                      </select>
                      <ActionButton
                        tone="danger"
                        onClick={() => {
                          if (window.confirm(t("admin.confirmDelete"))) {
                            void runMutation(() => deleteAdminRoom(accessToken, room.slug));
                          }
                        }}
                      >
                        {t("admin.delete")}
                      </ActionButton>
                    </div>
                  </div>
                </div>
              ))}
              {rooms.length === 0 ? <EmptyState text={t("admin.empty")} /> : null}
            </div>
          </Panel>
        ) : null}

        {!isLoading && tab === "categories" ? (
          <Panel className="p-5">
            <SectionHeader eyebrow={t("admin.tabs.categories")} title={t("admin.addCategory")} />
            <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_1fr_8rem_8rem_auto]">
              <input className={inputClass()} value={categoryForm.name} onChange={(event) => setCategoryForm((form) => ({ ...form, name: event.target.value }))} placeholder={t("admin.categoryName")} />
              <input className={inputClass()} value={categoryForm.description} onChange={(event) => setCategoryForm((form) => ({ ...form, description: event.target.value }))} placeholder={t("admin.description")} />
              <input className={inputClass()} value={categoryForm.color} onChange={(event) => setCategoryForm((form) => ({ ...form, color: event.target.value }))} placeholder={t("admin.color")} />
              <input className={inputClass()} type="number" value={categoryForm.sortOrder} onChange={(event) => setCategoryForm((form) => ({ ...form, sortOrder: Number(event.target.value) }))} placeholder={t("admin.sortOrder")} />
              <ActionButton
                tone="primary"
                disabled={!categoryForm.name.trim() || isMutating}
                onClick={() =>
                  void runMutation(async () => {
                    await createAdminRoomCategory(accessToken, categoryForm);
                    setCategoryForm({ name: "", description: "", color: "#22d3ee", sortOrder: 0 });
                  })
                }
              >
                {t("admin.create")}
              </ActionButton>
            </div>
            <div className="mt-5 grid gap-3">
              {categories.map((category) => (
                <div key={category.id} className={cardClass(category.isActive)}>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color ?? "#22d3ee" }} />
                        <p className="font-semibold text-white">{category.name}</p>
                        <Chip tone={category.isActive ? "cyan" : "gold"}>
                          {category.isActive ? t("admin.active") : t("admin.inactive")}
                        </Chip>
                      </div>
                      <p className="mt-1 text-sm text-slate-400">{category.description || "—"}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <ActionButton
                        onClick={() =>
                          void runMutation(() =>
                            updateAdminRoomCategory(accessToken, category.id, {
                              isActive: !category.isActive,
                            }),
                          )
                        }
                      >
                        {category.isActive ? t("admin.disable") : t("admin.enable")}
                      </ActionButton>
                      <ActionButton
                        tone="danger"
                        onClick={() => {
                          if (window.confirm(t("admin.confirmDelete"))) {
                            void runMutation(() => deleteAdminRoomCategory(accessToken, category.id));
                          }
                        }}
                      >
                        {t("admin.delete")}
                      </ActionButton>
                    </div>
                  </div>
                </div>
              ))}
              {categories.length === 0 ? <EmptyState text={t("admin.empty")} /> : null}
            </div>
          </Panel>
        ) : null}

        {!isLoading && tab === "content" ? (
          <div className="grid gap-5 xl:grid-cols-2">
            <ContentList
              title={t("admin.snapsReels")}
              posts={posts}
              onVisibility={(post) =>
                runMutation(() =>
                  updateAdminPost(accessToken, post.id, {
                    visibility: post.visibility === "Public" ? "Hidden" : "Public",
                  }),
                )
              }
              onDelete={(post) => runMutation(() => deleteAdminPost(accessToken, post.id))}
              t={t}
            />
            <CommentList
              title={t("admin.comments")}
              comments={comments}
              onDelete={(comment) => runMutation(() => deleteAdminPostComment(accessToken, comment.id))}
              t={t}
            />
          </div>
        ) : null}

        {!isLoading && tab === "messages" ? (
          <div className="grid gap-5 xl:grid-cols-2">
            <MessageList title={t("admin.roomMessages")} messages={roomMessages} onDelete={(message) => runMutation(() => deleteAdminRoomMessage(accessToken, message.id))} t={t} />
            <MessageList title={t("admin.directMessages")} messages={directMessages} onDelete={(message) => runMutation(() => deleteAdminDirectMessage(accessToken, message.id))} t={t} />
          </div>
        ) : null}

        {!isLoading && tab === "games" ? (
          <div className="grid gap-5 xl:grid-cols-2">
            <Panel className="p-5">
              <SectionHeader eyebrow={t("admin.tabs.games")} title={t("admin.lobbies")} />
              <div className="mt-5 grid gap-3">
                {games.lobbies.map((lobby) => (
                  <div key={lobby.id} className={cardClass()}>
                    <p className="font-semibold text-white">{lobby.title}</p>
                    <p className="mt-1 text-sm text-slate-400">{lobby.gameType} · {lobby.status} · {personName(lobby.owner)}</p>
                    <div className="mt-3">
                      <ActionButton tone="danger" onClick={() => window.confirm(t("admin.confirmDelete")) && void runMutation(() => deleteAdminGameLobby(accessToken, lobby.id))}>
                        {t("admin.delete")}
                      </ActionButton>
                    </div>
                  </div>
                ))}
                {games.lobbies.length === 0 ? <EmptyState text={t("admin.empty")} /> : null}
              </div>
            </Panel>
            <Panel className="p-5">
              <SectionHeader eyebrow={t("admin.tabs.games")} title={t("admin.sessions")} />
              <div className="mt-5 grid gap-3">
                {games.sessions.map((sessionRow) => (
                  <div key={sessionRow.id} className={cardClass(sessionRow.status === "ACTIVE")}>
                    <p className="font-semibold text-white">{sessionRow.lobby?.title || sessionRow.gameType}</p>
                    <p className="mt-1 text-sm text-slate-400">{sessionRow.status} · {formatDate(sessionRow.updatedAt)}</p>
                    <div className="mt-3">
                      <ActionButton disabled={sessionRow.status !== "ACTIVE"} onClick={() => window.confirm(t("admin.confirmCloseSession")) && void runMutation(() => closeAdminGameSession(accessToken, sessionRow.id))}>
                        {t("admin.close")}
                      </ActionButton>
                    </div>
                  </div>
                ))}
                {games.sessions.length === 0 ? <EmptyState text={t("admin.empty")} /> : null}
              </div>
            </Panel>
          </div>
        ) : null}

        {!isLoading && tab === "dating" ? (
          <div className="grid gap-5 xl:grid-cols-2">
            <Panel className="p-5">
              <SectionHeader eyebrow={t("admin.tabs.dating")} title={t("admin.profiles")} />
              <div className="mt-5 grid gap-3">
                {dating.profiles.map((profile) => (
                  <div key={profile.id} className={cardClass(profile.isDiscoverable)}>
                    <p className="font-semibold text-white">{personName(profile.user)}</p>
                    <p className="mt-1 text-sm text-slate-400">{profile.headline || profile.gender || "—"}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <ActionButton onClick={() => void runMutation(() => updateAdminDatingProfile(accessToken, profile.id, { isDiscoverable: !profile.isDiscoverable }))}>
                        {profile.isDiscoverable ? t("admin.hidden") : t("admin.discoverable")}
                      </ActionButton>
                      <ActionButton tone="danger" onClick={() => window.confirm(t("admin.confirmDelete")) && void runMutation(() => deleteAdminDatingProfile(accessToken, profile.id))}>
                        {t("admin.delete")}
                      </ActionButton>
                    </div>
                  </div>
                ))}
                {dating.profiles.length === 0 ? <EmptyState text={t("admin.empty")} /> : null}
              </div>
            </Panel>
            <Panel className="p-5">
              <SectionHeader eyebrow={t("admin.tabs.dating")} title={t("admin.matches")} />
              <div className="mt-5 grid gap-3">
                {dating.matches.map((match) => (
                  <div key={match.id} className={cardClass()}>
                    <p className="font-semibold text-white">{personName(match.userA)} ↔ {personName(match.userB)}</p>
                    <p className="mt-1 text-sm text-slate-400">{match._count?.messages ?? 0} messages · {formatDate(match.createdAt)}</p>
                    <div className="mt-3">
                      <ActionButton tone="danger" onClick={() => window.confirm(t("admin.confirmDelete")) && void runMutation(() => deleteAdminDatingMatch(accessToken, match.id))}>
                        {t("admin.delete")}
                      </ActionButton>
                    </div>
                  </div>
                ))}
                {dating.matches.length === 0 ? <EmptyState text={t("admin.empty")} /> : null}
              </div>
            </Panel>
          </div>
        ) : null}

        {!isLoading && tab === "notifications" ? (
          <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
            <Panel className="p-5">
              <SectionHeader eyebrow={t("admin.tabs.notifications")} title={t("admin.sendNotification")} />
              <div className="mt-5 grid gap-3">
                <input className={inputClass()} value={notificationForm.title} onChange={(event) => setNotificationForm((form) => ({ ...form, title: event.target.value }))} placeholder={t("admin.notificationTitle")} />
                <textarea className={inputClass("min-h-28 resize-none")} value={notificationForm.body} onChange={(event) => setNotificationForm((form) => ({ ...form, body: event.target.value }))} placeholder={t("admin.notificationBody")} />
                {!notificationForm.broadcast ? (
                  <input className={inputClass()} value={notificationForm.userId} onChange={(event) => setNotificationForm((form) => ({ ...form, userId: event.target.value }))} placeholder={t("admin.recipientUserId")} />
                ) : null}
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input type="checkbox" checked={notificationForm.broadcast} onChange={(event) => setNotificationForm((form) => ({ ...form, broadcast: event.target.checked }))} />
                  {t("admin.broadcast")}
                </label>
                <ActionButton
                  tone="primary"
                  disabled={!notificationForm.title.trim() || !notificationForm.body.trim() || isMutating}
                  onClick={() =>
                    void runMutation(async () => {
                      await createAdminNotification(accessToken, notificationForm);
                      setNotificationForm({ title: "", body: "", userId: "", broadcast: true });
                    })
                  }
                >
                  {t("admin.sendNotification")}
                </ActionButton>
              </div>
            </Panel>
            <Panel className="p-5">
              <SectionHeader eyebrow={t("admin.tabs.notifications")} title={`${notifications.length} ${t("admin.tabs.notifications")}`} />
              <div className="mt-5 grid gap-3">
                {notifications.map((notification) => (
                  <div key={notification.id} className={cardClass(!notification.read)}>
                    <p className="font-semibold text-white">{notification.title}</p>
                    <p className="mt-1 text-sm text-slate-400">{notification.body}</p>
                    <p className="mt-2 text-xs text-slate-500">{personName(notification.user)} · {formatDate(notification.createdAt)}</p>
                  </div>
                ))}
                {notifications.length === 0 ? <EmptyState text={t("admin.empty")} /> : null}
              </div>
            </Panel>
          </div>
        ) : null}
      </div>
    </section>
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
    <Panel className="p-5">
      <SectionHeader eyebrow={title} title={title} />
      <div className="mt-5 grid gap-2">
        {items.map((item, index) => (
          <div key={index} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <p className="truncate text-sm font-semibold text-white">{getTitle(item)}</p>
            <p className="mt-1 truncate text-xs text-slate-400">{getMeta(item)}</p>
          </div>
        ))}
        {items.length === 0 ? <EmptyState text="Nothing to show yet." /> : null}
      </div>
    </Panel>
  );
}

function ContentList({
  title,
  posts,
  onVisibility,
  onDelete,
  t,
}: {
  title: string;
  posts: AdminPost[];
  onVisibility: (post: AdminPost) => Promise<void>;
  onDelete: (post: AdminPost) => Promise<void>;
  t: ReturnType<typeof useI18n>["t"];
}) {
  return (
    <Panel className="p-5">
      <SectionHeader eyebrow={title} title={title} />
      <div className="mt-5 grid gap-3">
        {posts.map((post) => (
          <div key={post.id} className={cardClass(post.visibility === "Public")}>
            <p className="font-semibold text-white">{post.title || post.caption || post.kind}</p>
            <p className="mt-1 text-sm text-slate-400">{post.kind} · {personName(post.author)} · {post.visibility}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <ActionButton onClick={() => void onVisibility(post)}>{t("admin.visibility")}</ActionButton>
              <ActionButton tone="danger" onClick={() => window.confirm(t("admin.confirmDelete")) && void onDelete(post)}>
                {t("admin.delete")}
              </ActionButton>
            </div>
          </div>
        ))}
        {posts.length === 0 ? <EmptyState text={t("admin.empty")} /> : null}
      </div>
    </Panel>
  );
}

function CommentList({
  title,
  comments,
  onDelete,
  t,
}: {
  title: string;
  comments: AdminPostComment[];
  onDelete: (comment: AdminPostComment) => Promise<void>;
  t: ReturnType<typeof useI18n>["t"];
}) {
  return (
    <Panel className="p-5">
      <SectionHeader eyebrow={title} title={title} />
      <div className="mt-5 grid gap-3">
        {comments.map((comment) => (
          <div key={comment.id} className={cardClass()}>
            <p className="text-sm text-white">{comment.body}</p>
            <p className="mt-2 text-xs text-slate-500">{personName(comment.user)} · {formatDate(comment.createdAt)}</p>
            <div className="mt-3">
              <ActionButton tone="danger" onClick={() => window.confirm(t("admin.confirmDelete")) && void onDelete(comment)}>
                {t("admin.delete")}
              </ActionButton>
            </div>
          </div>
        ))}
        {comments.length === 0 ? <EmptyState text={t("admin.empty")} /> : null}
      </div>
    </Panel>
  );
}

function MessageList({
  title,
  messages,
  onDelete,
  t,
}: {
  title: string;
  messages: AdminMessage[];
  onDelete: (message: AdminMessage) => Promise<void>;
  t: ReturnType<typeof useI18n>["t"];
}) {
  return (
    <Panel className="p-5">
      <SectionHeader eyebrow={title} title={title} />
      <div className="mt-5 grid gap-3">
        {messages.map((message) => (
          <div key={message.id} className={cardClass()}>
            <p className="text-sm text-white">{message.body}</p>
            <p className="mt-2 text-xs text-slate-500">
              {personName(message.sender)} {message.recipient ? `→ ${personName(message.recipient)}` : message.room ? `→ #${message.room.name}` : ""} · {formatDate(message.createdAt)}
            </p>
            <div className="mt-3">
              <ActionButton tone="danger" onClick={() => window.confirm(t("admin.confirmDelete")) && void onDelete(message)}>
                {t("admin.delete")}
              </ActionButton>
            </div>
          </div>
        ))}
        {messages.length === 0 ? <EmptyState text={t("admin.empty")} /> : null}
      </div>
    </Panel>
  );
}
