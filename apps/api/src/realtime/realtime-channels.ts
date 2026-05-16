import { PostKind } from '@prisma/client';

export const ROOMS_CATALOG_CHANNEL = 'rooms:catalog';

export function postsFeedChannel(kind: PostKind) {
  return `posts:feed:${kind}`;
}
