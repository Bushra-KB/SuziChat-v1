import { extname } from 'node:path';
import { AttachmentKind } from '@prisma/client';

// Allowed MIME types mapped to a safe stored extension. Anything outside this
// allowlist is rejected, which keeps executables and scripts out of storage.
const IMAGE_MIME_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/heic': '.heic',
  'image/heif': '.heif',
};

const FILE_MIME_EXT: Record<string, string> = {
  'application/pdf': '.pdf',
  'text/plain': '.txt',
  'application/zip': '.zip',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.ms-powerpoint': '.ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation':
    '.pptx',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
  'audio/mpeg': '.mp3',
  'audio/ogg': '.ogg',
  'audio/wav': '.wav',
  'audio/webm': '.weba',
  'audio/mp4': '.m4a',
};

const ALLOWED_EXTENSIONS = new Set<string>([
  ...Object.values(IMAGE_MIME_EXT),
  ...Object.values(FILE_MIME_EXT),
  '.jpeg',
]);

// Extensions that must never be accepted regardless of declared MIME type.
const BLOCKED_EXTENSIONS = new Set<string>([
  '.exe',
  '.bat',
  '.cmd',
  '.sh',
  '.com',
  '.msi',
  '.scr',
  '.jar',
  '.app',
  '.dll',
  '.js',
  '.mjs',
  '.cjs',
  '.php',
  '.py',
  '.rb',
  '.ps1',
  '.vbs',
  '.html',
  '.htm',
  '.svg',
]);

function normalizedExt(originalname: string): string {
  return extname(originalname || '').toLowerCase();
}

export function isAllowedChatFile(
  mimetype: string,
  originalname: string,
): boolean {
  const ext = normalizedExt(originalname);
  if (BLOCKED_EXTENSIONS.has(ext)) {
    return false;
  }
  if (mimetype && (IMAGE_MIME_EXT[mimetype] || FILE_MIME_EXT[mimetype])) {
    return true;
  }
  return ALLOWED_EXTENSIONS.has(ext);
}

export function pickStoredChatExtension(
  mimetype: string,
  originalname: string,
): string | null {
  if (mimetype && IMAGE_MIME_EXT[mimetype]) {
    return IMAGE_MIME_EXT[mimetype];
  }
  if (mimetype && FILE_MIME_EXT[mimetype]) {
    return FILE_MIME_EXT[mimetype];
  }
  const ext = normalizedExt(originalname);
  if (BLOCKED_EXTENSIONS.has(ext)) {
    return null;
  }
  if (ext === '.jpeg') {
    return '.jpg';
  }
  return ALLOWED_EXTENSIONS.has(ext) ? ext : null;
}

export function attachmentKindForMime(
  mimetype: string,
  originalname: string,
): AttachmentKind {
  if (mimetype && IMAGE_MIME_EXT[mimetype]) {
    return AttachmentKind.IMAGE;
  }
  const ext = normalizedExt(originalname);
  if (
    ext === '.jpg' ||
    ext === '.jpeg' ||
    ext === '.png' ||
    ext === '.webp' ||
    ext === '.gif' ||
    ext === '.heic' ||
    ext === '.heif'
  ) {
    return AttachmentKind.IMAGE;
  }
  return AttachmentKind.FILE;
}
