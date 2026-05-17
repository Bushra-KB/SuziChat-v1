import type { Prisma } from '@prisma/client';

export type ParsedGameLobbySettings = {
  allowSpectatorChat: boolean;
};

export function parseGameLobbySettings(
  settings: Prisma.JsonValue | null | undefined,
): ParsedGameLobbySettings {
  const raw =
    settings && typeof settings === 'object' && !Array.isArray(settings)
      ? (settings as Record<string, unknown>)
      : {};
  return {
    allowSpectatorChat: raw.allowSpectatorChat !== false,
  };
}

export function mergeGameLobbySettings(
  current: Prisma.JsonValue | null | undefined,
  patch: Partial<ParsedGameLobbySettings>,
): Prisma.InputJsonValue {
  const parsed = parseGameLobbySettings(current);
  return {
    ...parsed,
    ...patch,
  };
}
