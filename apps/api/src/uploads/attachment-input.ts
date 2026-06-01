import { BadRequestException } from '@nestjs/common';
import { AttachmentKind, MessageKind } from '@prisma/client';

export interface ChatAttachmentInput {
  kind: AttachmentKind;
  url: string;
  mimeType: string;
  sizeBytes: number;
  fileName?: string | null;
  durationMs?: number | null;
  width?: number | null;
  height?: number | null;
}

const MAX_ATTACHMENTS = 6;
const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

// Attachments must reference files served by our own uploads pipeline. This
// blocks data: URLs and arbitrary external links from being stored as messages.
function isInternalUploadUrl(url: string): boolean {
  return url.startsWith('/api/uploads/') || url.startsWith('/uploads/');
}

/**
 * Validates and normalizes attachment metadata coming from a client. Throws on
 * anything malformed so callers can rely on the returned rows being safe to
 * persist via a nested Prisma `create`.
 */
export function sanitizeChatAttachments(
  attachments: ChatAttachmentInput[] | undefined,
): ChatAttachmentInput[] {
  if (!attachments || attachments.length === 0) {
    return [];
  }
  if (attachments.length > MAX_ATTACHMENTS) {
    throw new BadRequestException(
      `A message can include at most ${MAX_ATTACHMENTS} attachments.`,
    );
  }

  return attachments.map((attachment) => {
    if (!attachment || typeof attachment.url !== 'string') {
      throw new BadRequestException('Attachment is missing a url.');
    }
    if (!isInternalUploadUrl(attachment.url)) {
      throw new BadRequestException('Attachment url is not allowed.');
    }
    if (!Object.values(AttachmentKind).includes(attachment.kind)) {
      throw new BadRequestException('Attachment kind is invalid.');
    }
    if (
      typeof attachment.sizeBytes !== 'number' ||
      !Number.isFinite(attachment.sizeBytes) ||
      attachment.sizeBytes < 0 ||
      attachment.sizeBytes > MAX_ATTACHMENT_BYTES
    ) {
      throw new BadRequestException('Attachment size is invalid.');
    }
    if (typeof attachment.mimeType !== 'string' || !attachment.mimeType) {
      throw new BadRequestException('Attachment mime type is required.');
    }

    return {
      kind: attachment.kind,
      url: attachment.url,
      mimeType: attachment.mimeType.slice(0, 255),
      sizeBytes: Math.floor(attachment.sizeBytes),
      fileName: attachment.fileName?.slice(0, 255) ?? null,
      durationMs:
        typeof attachment.durationMs === 'number' &&
        Number.isFinite(attachment.durationMs)
          ? Math.max(0, Math.floor(attachment.durationMs))
          : null,
      width:
        typeof attachment.width === 'number' && attachment.width > 0
          ? Math.floor(attachment.width)
          : null,
      height:
        typeof attachment.height === 'number' && attachment.height > 0
          ? Math.floor(attachment.height)
          : null,
    };
  });
}

/** Derives the message discriminator from its body + attachments. */
export function deriveMessageKind(
  body: string,
  attachments: ChatAttachmentInput[],
): MessageKind {
  if (attachments.length === 0) {
    return MessageKind.TEXT;
  }
  if (attachments.some((a) => a.kind === AttachmentKind.VOICE)) {
    return MessageKind.VOICE;
  }
  if (attachments.every((a) => a.kind === AttachmentKind.IMAGE)) {
    return MessageKind.IMAGE;
  }
  return MessageKind.FILE;
}

/** Shared Prisma select for attachment rows returned to clients. */
export const messageAttachmentSelect = {
  id: true,
  kind: true,
  url: true,
  mimeType: true,
  sizeBytes: true,
  fileName: true,
  durationMs: true,
  width: true,
  height: true,
} as const;
