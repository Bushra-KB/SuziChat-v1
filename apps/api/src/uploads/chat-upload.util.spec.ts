import { AttachmentKind } from '@prisma/client';
import {
  attachmentKindForMime,
  isAllowedChatFile,
  pickStoredChatExtension,
} from './chat-upload.util';

describe('chat-upload.util', () => {
  describe('isAllowedChatFile', () => {
    it('allows common images and documents', () => {
      expect(isAllowedChatFile('image/png', 'photo.png')).toBe(true);
      expect(isAllowedChatFile('application/pdf', 'doc.pdf')).toBe(true);
      expect(isAllowedChatFile('video/mp4', 'clip.mp4')).toBe(true);
    });

    it('blocks executable and script types regardless of mime', () => {
      expect(isAllowedChatFile('application/octet-stream', 'malware.exe')).toBe(
        false,
      );
      expect(isAllowedChatFile('text/plain', 'script.sh')).toBe(false);
      expect(isAllowedChatFile('image/svg+xml', 'icon.svg')).toBe(false);
    });

    it('falls back to extension when mime is unknown', () => {
      expect(isAllowedChatFile('', 'notes.txt')).toBe(true);
      expect(isAllowedChatFile('', 'archive.zip')).toBe(true);
      expect(isAllowedChatFile('', 'thing.weird')).toBe(false);
    });
  });

  describe('pickStoredChatExtension', () => {
    it('normalizes jpeg to .jpg and rejects blocked types', () => {
      expect(pickStoredChatExtension('image/jpeg', 'a.jpeg')).toBe('.jpg');
      expect(pickStoredChatExtension('', 'b.jpeg')).toBe('.jpg');
      expect(pickStoredChatExtension('application/pdf', 'c.pdf')).toBe('.pdf');
      expect(pickStoredChatExtension('', 'd.exe')).toBeNull();
    });
  });

  describe('attachmentKindForMime', () => {
    it('classifies images vs files', () => {
      expect(attachmentKindForMime('image/png', 'p.png')).toBe(
        AttachmentKind.IMAGE,
      );
      expect(attachmentKindForMime('application/pdf', 'd.pdf')).toBe(
        AttachmentKind.FILE,
      );
    });
  });
});
