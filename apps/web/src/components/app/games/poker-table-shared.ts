import type { ApiGameLobby } from "@/lib/games-client";

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export const POKER_SUITS: Record<string, string> = {
  c: "♣",
  d: "♦",
  h: "♥",
  s: "♠",
};

export function formatRank(rank: string) {
  if (rank === "T") return "10";
  return rank;
}

export function formatChips(value: number) {
  return value.toLocaleString("en-US");
}

/** Hero (you) always at bottom center; seats proceed clockwise. */
export function vintageSeatPosition(displayIndex: number, total: number) {
  if (total <= 0) {
    return { left: "50%", top: "50%", transform: "translate(-50%, -50%)" };
  }
  const angle = Math.PI / 2 + (displayIndex / total) * Math.PI * 2;
  const rx = total <= 3 ? 44 : total <= 5 ? 48 : 50;
  const ry = total <= 3 ? 40 : total <= 5 ? 44 : 46;
  const left = 50 + rx * Math.cos(angle);
  const top = 50 + ry * Math.sin(angle);
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);

  let transform = "translate(-50%, -50%)";
  if (sin > 0.35) {
    transform = "translate(-50%, -88%)";
  } else if (sin < -0.35) {
    transform = "translate(-50%, -12%)";
  } else if (cos > 0.35) {
    transform = "translate(-82%, -50%)";
  } else if (cos < -0.35) {
    transform = "translate(-18%, -50%)";
  }

  return {
    left: `${left}%`,
    top: `${top}%`,
    transform,
  };
}

export function displayIndexForSeat(
  seatIndex: number,
  mySeatIndex: number,
  total: number,
) {
  return (seatIndex - mySeatIndex + total) % total;
}

export type PokerTablePlayer = {
  userId: string;
  seatIndex: number;
  stack: number;
  committed: number;
  folded: boolean;
  allIn: boolean;
  cards: string[];
};

export function parsePokerPlayers(state: Record<string, unknown>): PokerTablePlayer[] {
  return (asArray(state.players) as Array<Record<string, unknown>>)
    .map((row) => ({
      userId: String(row.userId ?? ""),
      seatIndex: Number(row.seatIndex ?? 0),
      stack: Number(row.stack ?? 0),
      committed: Number(row.committed ?? 0),
      folded: Boolean(row.folded),
      allIn: Boolean(row.allIn),
      cards: asArray(row.cards).map(String),
    }))
    .sort((a, b) => a.seatIndex - b.seatIndex);
}

export function seatDisplayName(
  lobbySeats: ApiGameLobby["seats"],
  userId: string,
  seatIndex: number,
) {
  const seat = lobbySeats.find((row) => row.userId === userId);
  return (
    seat?.user?.displayName?.trim() ||
    seat?.user?.username ||
    `Seat ${seatIndex + 1}`
  );
}

export function lastActionForSeat(
  state: Record<string, unknown>,
  seatIndex: number,
): string | null {
  const handLog = asArray(state.handLog) as Array<Record<string, unknown>>;
  for (let i = handLog.length - 1; i >= 0; i -= 1) {
    const row = handLog[i];
    if (Number(row.seatIndex) !== seatIndex) continue;
    const kind = String(row.kind ?? "").toUpperCase();
    if (kind === "FOLD") return "Folded";
    if (kind === "CHECK") return "Checked";
    if (kind === "CALL") return "Called";
    if (kind === "RAISE") return "Raised";
    if (kind === "BET") return "Bet";
    if (kind === "ALL_IN") return "All-in";
    return kind;
  }
  return null;
}

export type PokerTableViewProps = {
  lobbySeats: ApiGameLobby["seats"];
  state: Record<string, unknown>;
  sessionId?: string;
  busy: boolean;
  meId: string;
  myTurn: boolean;
  soundOn?: boolean;
  gameRouteId?: string;
  readOnly?: boolean;
  onAction: (kind: string, amount?: number) => void;
  onNextHand?: () => void;
};
