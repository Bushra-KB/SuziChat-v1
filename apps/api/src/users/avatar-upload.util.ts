const MIME_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/heic': '.heic',
  'image/heif': '.heif',
};

export function isAllowedAvatarImageFile(
  mimetype: string,
  originalname: string,
): boolean {
  if (mimetype && MIME_EXT[mimetype]) {
    return true;
  }
  const lower = originalname.toLowerCase();
  return (
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg') ||
    lower.endsWith('.png') ||
    lower.endsWith('.webp') ||
    lower.endsWith('.gif') ||
    lower.endsWith('.heic') ||
    lower.endsWith('.heif')
  );
}

export function pickStoredAvatarExtension(
  mimetype: string,
  originalname: string,
): string | null {
  if (mimetype && MIME_EXT[mimetype]) {
    return MIME_EXT[mimetype];
  }
  const lower = originalname.toLowerCase();
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
    return '.jpg';
  }
  if (lower.endsWith('.png')) {
    return '.png';
  }
  if (lower.endsWith('.webp')) {
    return '.webp';
  }
  if (lower.endsWith('.gif')) {
    return '.gif';
  }
  if (lower.endsWith('.heic')) {
    return '.heic';
  }
  if (lower.endsWith('.heif')) {
    return '.heif';
  }
  return null;
}
