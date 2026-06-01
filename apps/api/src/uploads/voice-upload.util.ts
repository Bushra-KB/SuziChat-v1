import { extname } from 'node:path';

const VOICE_MIME_EXT: Record<string, string> = {
  'audio/webm': '.weba',
  'audio/ogg': '.ogg',
  'audio/mp4': '.m4a',
  'audio/mpeg': '.mp3',
  'audio/wav': '.wav',
  'audio/x-wav': '.wav',
};

const ALLOWED_VOICE_EXT = new Set<string>([
  '.weba',
  '.webm',
  '.ogg',
  '.m4a',
  '.mp3',
  '.wav',
]);

export function isAllowedVoiceFile(
  mimetype: string,
  originalname: string,
): boolean {
  if (mimetype && VOICE_MIME_EXT[mimetype]) {
    return true;
  }
  // Browsers sometimes report `audio/webm;codecs=opus`.
  if (mimetype?.startsWith('audio/')) {
    return true;
  }
  return ALLOWED_VOICE_EXT.has(extname(originalname || '').toLowerCase());
}

export function pickStoredVoiceExtension(
  mimetype: string,
  originalname: string,
): string | null {
  const baseMime = mimetype?.split(';')[0]?.trim() ?? '';
  if (VOICE_MIME_EXT[baseMime]) {
    return VOICE_MIME_EXT[baseMime];
  }
  const ext = extname(originalname || '').toLowerCase();
  if (ext === '.webm') {
    return '.weba';
  }
  if (ALLOWED_VOICE_EXT.has(ext)) {
    return ext;
  }
  // Default container for unknown audio MIME types (e.g. opus-in-webm).
  return baseMime.startsWith('audio/') ? '.weba' : null;
}
