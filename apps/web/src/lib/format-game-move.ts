import { Chess } from "chess.js";
import type { ApiGameSession } from "@/lib/games-client";

export type SessionMoveRow = ApiGameSession["moves"][number];

/** Last chess UCI move squares for board highlight. */
export function getLastChessMoveSquares(moves: SessionMoveRow[]): { from: string; to: string } | null {
  for (let i = moves.length - 1; i >= 0; i -= 1) {
    const m = moves[i];
    if (m.kind !== "MOVE") continue;
    const raw = (m.payload ?? {}) as Record<string, unknown>;
    const uci = typeof raw.move === "string" ? raw.move.trim() : "";
    if (uci.length >= 4) {
      return { from: uci.slice(0, 2), to: uci.slice(2, 4) };
    }
  }
  return null;
}

/** One human-readable line per move for the session sidebar. */
export function formatMoveListForSession(session: ApiGameSession): string[] {
  if (session.gameType === "CHESS") {
    return formatChessMoveLines(session.moves);
  }
  return session.moves.map((m) => formatSessionMoveSummary(session.gameType, m));
}

/** Replay chess moves and produce SAN lines for the move list. */
export function formatChessMoveLines(moves: SessionMoveRow[]): string[] {
  const chess = new Chess();
  const lines: string[] = [];
  for (const m of moves) {
    const raw = (m.payload ?? {}) as Record<string, unknown>;
    const moveStr = typeof raw.move === "string" ? raw.move.trim() : "";
    if (m.kind === "MOVE" && moveStr.length >= 4) {
      const parsed = chess.move({
        from: moveStr.slice(0, 2),
        to: moveStr.slice(2, 4),
        promotion: moveStr.slice(4, 5) || undefined,
      });
      if (parsed) {
        lines.push(`${m.ply}. ${parsed.san}`);
      } else {
        lines.push(`${m.ply}. ${moveStr} (unparsed)`);
      }
      continue;
    }
    if (m.kind === "RESIGN") {
      lines.push(`${m.ply}. Resign`);
      continue;
    }
    lines.push(`${m.ply}. ${m.kind}`);
  }
  return lines;
}

export function formatSessionMoveSummary(gameType: ApiGameSession["gameType"], move: SessionMoveRow): string {
  const p = (move.payload ?? {}) as Record<string, unknown>;

  if (gameType === "CHESS") {
    const uci = typeof p.move === "string" ? p.move.trim() : "";
    if (move.kind === "MOVE" && uci.length >= 4) {
      const promo = uci.slice(4, 5);
      return promo ? `${uci.slice(0, 2)}→${uci.slice(2, 4)} (${promo.toUpperCase()})` : `${uci.slice(0, 2)}→${uci.slice(2, 4)}`;
    }
    if (move.kind === "RESIGN") return "Resign";
    return move.kind;
  }

  if (gameType === "CHECKERS") {
    const from = typeof p.from === "string" ? p.from : "";
    const to = typeof p.to === "string" ? p.to : "";
    if (from && to) return `${from} → ${to}`;
    return move.kind;
  }

  if (gameType === "CONNECT4") {
    const col = p.column;
    if (typeof col === "number") return `Column ${col + 1}`;
    return move.kind;
  }

  if (gameType === "POKER_HOLDEM") {
    const kind = typeof p.kind === "string" ? p.kind : "";
    const amount = p.amount;
    if (kind && typeof amount === "number" && amount > 0) return `${kind} ${amount}`;
    if (kind) return kind;
    return move.kind;
  }

  return JSON.stringify(move.payload);
}
