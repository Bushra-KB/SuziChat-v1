export function parseGameLobbySettings(
  settings?: { allowSpectatorChat?: boolean } | null,
): { allowSpectatorChat: boolean } {
  return {
    allowSpectatorChat: settings?.allowSpectatorChat !== false,
  };
}
