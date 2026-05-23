import { extname } from 'path';

const MIME_TO_EXT: Record<string, string> = {
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
  'video/x-msvideo': '.avi',
  'video/3gpp': '.3gp',
  'video/3gpp2': '.3g2',
  'video/x-m4v': '.m4v',
  'video/mp4v-es': '.mp4',
  'video/x-flv': '.flv',
  'video/mpeg': '.mpeg',
  'video/ogg': '.ogv',
  'video/x-matroska': '.mkv',
};

const ALLOWED_EXT = new Set([
  '.mp4',
  '.webm',
  '.mov',
  '.m4v',
  '.avi',
  '.mkv',
  '.3gp',
  '.3g2',
  '.ogv',
  '.mpeg',
  '.mpg',
  '.flv',
]);

export function pickStoredReelExtension(
  mimetype: string,
  originalName: string,
): string {
  const mime = mimetype?.trim().toLowerCase() ?? '';
  if (MIME_TO_EXT[mime]) {
    return MIME_TO_EXT[mime];
  }
  const ext = extname(originalName || '').toLowerCase();
  if (ALLOWED_EXT.has(ext)) {
    return ext;
  }
  if (mime.startsWith('video/')) {
    return '.mp4';
  }
  return '';
}

export function isAllowedReelVideoFile(
  mimetype: string,
  originalName: string,
): boolean {
  return pickStoredReelExtension(mimetype, originalName) !== '';
}
