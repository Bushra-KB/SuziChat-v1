import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const UPLOAD_SUBDIRS = [
  'avatars',
  'snaps',
  'reels',
  'dating',
  'chat',
  'voice',
] as const;

export type UploadSubdir = (typeof UPLOAD_SUBDIRS)[number];

export function uploadsRoot() {
  return process.env.UPLOADS_DIR?.trim() || join(process.cwd(), 'uploads');
}

export function uploadSubdirPath(subdir: UploadSubdir) {
  return join(uploadsRoot(), subdir);
}

export function ensureUploadSubdir(subdir: UploadSubdir) {
  const dir = uploadSubdirPath(subdir);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function ensureUploadDirs() {
  for (const subdir of UPLOAD_SUBDIRS) {
    ensureUploadSubdir(subdir);
  }
}
