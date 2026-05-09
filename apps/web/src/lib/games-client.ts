import { apiJson } from "@/lib/api-auth-request";

export type ApiGameType = "CHESS" | "CHECKERS" | "CONNECT4" | "POKER_HOLDEM";
export type ApiSessionStatus = "WAITING" | "ACTIVE" | "FINISHED" | "CANCELED";

export type ApiGameCatalog = {
  id: string;
  gameType: ApiGameType;
  name: string;
  minPlayers: number;
  maxPlayers: number;
};

export type ApiGameLobby = {
  id: string;
  slug: string;
  gameType: ApiGameType;
  title: string;
  isPrivate: boolean;
  status: "OPEN" | "IN_PROGRESS" | "CLOSED";
  maxSeats: number;
  ownerId: string;
  owner: { id: string; username: string; displayName: string | null; avatarUrl?: string | null };
  seats: Array<{
    id: string;
    seatIndex: number;
    userId: string | null;
    status: string;
    stackChips: number;
    user?: { id: string; username: string; displayName: string | null; avatarUrl?: string | null } | null;
  }>;
  sessions: Array<{ id: string; status: ApiSessionStatus; gameType: ApiGameType; createdAt: string }>;
};

export type ApiGameSession = {
  id: string;
  lobbyId: string;
  gameType: ApiGameType;
  status: ApiSessionStatus;
  state: Record<string, unknown>;
  turnUserId: string | null;
  winnerUserId: string | null;
  startedAt: string | null;
  endedAt: string | null;
  lobby: ApiGameLobby;
  moves: Array<{
    id: string;
    userId: string;
    kind: string;
    ply: number;
    payload: Record<string, unknown>;
    createdAt: string;
  }>;
};

export type ApiGameChatMessage = {
  id: string;
  sessionId: string;
  userId: string | null;
  body: string;
  createdAt: string;
  user?: { id: string; username: string; displayName: string | null; avatarUrl?: string | null } | null;
};

export async function listGameCatalog() {
  return apiJson<ApiGameCatalog[]>("/v1/games/catalog", { method: "GET" });
}

export async function listGameLobbies(gameType?: ApiGameType) {
  const query = gameType ? `?gameType=${encodeURIComponent(gameType)}` : "";
  return apiJson<ApiGameLobby[]>(`/v1/games/lobbies${query}`, { method: "GET" });
}

export async function getGameLobby(accessToken: string, lobbyId: string) {
  return apiJson<ApiGameLobby>(`/v1/games/lobbies/${encodeURIComponent(lobbyId)}`, { method: "GET", accessToken });
}

export async function createGameLobby(
  accessToken: string,
  payload: {
    gameType: ApiGameType;
    title: string;
    isPrivate?: boolean;
    maxSeats?: number;
    settings?: Record<string, unknown>;
  },
) {
  return apiJson<ApiGameLobby>("/v1/games/lobbies", {
    method: "POST",
    accessToken,
    body: JSON.stringify(payload),
  });
}

export async function joinGameLobby(accessToken: string, lobbyId: string, seatIndex: number) {
  return apiJson<ApiGameLobby>(`/v1/games/lobbies/${encodeURIComponent(lobbyId)}/join`, {
    method: "POST",
    accessToken,
    body: JSON.stringify({ seatIndex }),
  });
}

export async function deleteGameLobby(accessToken: string, lobbyId: string) {
  return apiJson<{ ok: true; lobbyId: string }>(`/v1/games/lobbies/${encodeURIComponent(lobbyId)}`, {
    method: "DELETE",
    accessToken,
  });
}

export async function leaveGameLobby(accessToken: string, lobbyId: string) {
  return apiJson<ApiGameLobby>(`/v1/games/lobbies/${encodeURIComponent(lobbyId)}/leave`, {
    method: "POST",
    accessToken,
  });
}

export async function startGameSession(accessToken: string, lobbyId: string, options?: Record<string, unknown>) {
  return apiJson<ApiGameSession>(`/v1/games/lobbies/${encodeURIComponent(lobbyId)}/start`, {
    method: "POST",
    accessToken,
    body: JSON.stringify({ options: options ?? {} }),
  });
}

export async function inviteToGameLobby(accessToken: string, lobbyId: string, targetUserId: string) {
  return apiJson<{ ok: true }>(`/v1/games/lobbies/${encodeURIComponent(lobbyId)}/invite/${encodeURIComponent(targetUserId)}`, {
    method: "POST",
    accessToken,
  });
}

export async function getGameSession(accessToken: string, sessionId: string) {
  return apiJson<ApiGameSession>(`/v1/games/sessions/${encodeURIComponent(sessionId)}`, {
    method: "GET",
    accessToken,
  });
}

export async function postGameAction(
  accessToken: string,
  sessionId: string,
  payload: Record<string, unknown>,
  kind?: string,
) {
  return apiJson<ApiGameSession>(`/v1/games/sessions/${encodeURIComponent(sessionId)}/action`, {
    method: "POST",
    accessToken,
    body: JSON.stringify({ payload, kind }),
  });
}

export async function listGameSessionChat(accessToken: string, sessionId: string) {
  return apiJson<ApiGameChatMessage[]>(`/v1/games/sessions/${encodeURIComponent(sessionId)}/chat`, {
    method: "GET",
    accessToken,
  });
}

export async function sendGameSessionChat(accessToken: string, sessionId: string, body: string) {
  return apiJson<ApiGameChatMessage>(`/v1/games/sessions/${encodeURIComponent(sessionId)}/chat`, {
    method: "POST",
    accessToken,
    body: JSON.stringify({ body }),
  });
}
