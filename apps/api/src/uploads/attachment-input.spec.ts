import { BadRequestException } from '@nestjs/common';
import { AttachmentKind, MessageKind } from '@prisma/client';
import {
  deriveMessageKind,
  sanitizeChatAttachments,
  type ChatAttachmentInput,
} from './attachment-input';

const baseAttachment: ChatAttachmentInput = {
  kind: AttachmentKind.FILE,
  url: '/api/uploads/chat/abc.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 1024,
  fileName: 'abc.pdf',
};

describe('sanitizeChatAttachments', () => {
  it('returns empty array for undefined input', () => {
    expect(sanitizeChatAttachments(undefined)).toEqual([]);
  });

  it('accepts internal upload urls', () => {
    const out = sanitizeChatAttachments([baseAttachment]);
    expect(out).toHaveLength(1);
    expect(out[0].url).toBe('/api/uploads/chat/abc.pdf');
  });

  it('rejects external urls', () => {
    expect(() =>
      sanitizeChatAttachments([
        { ...baseAttachment, url: 'https://evil.example.com/x.pdf' },
      ]),
    ).toThrow(BadRequestException);
  });

  it('rejects data urls', () => {
    expect(() =>
      sanitizeChatAttachments([
        { ...baseAttachment, url: 'data:application/pdf;base64,AAAA' },
      ]),
    ).toThrow(BadRequestException);
  });

  it('rejects oversized attachments', () => {
    expect(() =>
      sanitizeChatAttachments([
        { ...baseAttachment, sizeBytes: 26 * 1024 * 1024 },
      ]),
    ).toThrow(BadRequestException);
  });

  it('rejects more than six attachments', () => {
    const many = Array.from({ length: 7 }, () => ({ ...baseAttachment }));
    expect(() => sanitizeChatAttachments(many)).toThrow(BadRequestException);
  });
});

describe('deriveMessageKind', () => {
  it('returns TEXT with no attachments', () => {
    expect(deriveMessageKind('hi', [])).toBe(MessageKind.TEXT);
  });

  it('returns VOICE when a voice attachment is present', () => {
    expect(
      deriveMessageKind('', [{ ...baseAttachment, kind: AttachmentKind.VOICE }]),
    ).toBe(MessageKind.VOICE);
  });

  it('returns IMAGE when all attachments are images', () => {
    expect(
      deriveMessageKind('', [{ ...baseAttachment, kind: AttachmentKind.IMAGE }]),
    ).toBe(MessageKind.IMAGE);
  });

  it('returns FILE for mixed/file attachments', () => {
    expect(deriveMessageKind('', [baseAttachment])).toBe(MessageKind.FILE);
  });
});
