export type GameType = "CHESS" | "CHECKERS" | "CONNECT4" | "POKER_HOLDEM";

export type GameSeatDto = {
  seatIndex: number;
  userId: string | null;
  stackChips: number;
};

export type GameLobbyDto = {
  id: string;
  slug: string;
  gameType: GameType;
  title: string;
  isPrivate: boolean;
  maxSeats: number;
  status: "OPEN" | "IN_PROGRESS" | "CLOSED";
  ownerId: string;
  seats: GameSeatDto[];
};

export type GameSessionDto = {
  id: string;
  lobbyId: string;
  gameType: GameType;
  status: "WAITING" | "ACTIVE" | "FINISHED" | "CANCELED";
  turnUserId: string | null;
  winnerUserId: string | null;
  state: Record<string, unknown>;
};
