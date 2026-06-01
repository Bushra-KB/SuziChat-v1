import { PostKind } from '@prisma/client';

export const ROOMS_CATALOG_CHANNEL = 'rooms:catalog';
export const APP_REALTIME_CHANNEL = 'app:realtime';

export function postsFeedChannel(kind: PostKind) {
  return `posts:feed:${kind}`;
}
