import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express, Request } from 'express';
import { diskStorage } from 'multer';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { ensureUploadSubdir } from '../upload-storage/upload-paths';
import {
  CHAT_FILE_UPLOAD_FIELD,
  CHAT_FILE_UPLOAD_MAX_BYTES,
} from './chat-upload.constants';
import {
  attachmentKindForMime,
  isAllowedChatFile,
  pickStoredChatExtension,
} from './chat-upload.util';
import {
  VOICE_MAX_DURATION_MS,
  VOICE_UPLOAD_FIELD,
  VOICE_UPLOAD_MAX_BYTES,
} from './voice-upload.constants';
import {
  isAllowedVoiceFile,
  pickStoredVoiceExtension,
} from './voice-upload.util';

@Controller('v1/uploads')
@UseGuards(AccessTokenGuard)
export class UploadsController {
  @Post('chat-file')
  @UseInterceptors(
    FileInterceptor(CHAT_FILE_UPLOAD_FIELD, {
      limits: { fileSize: CHAT_FILE_UPLOAD_MAX_BYTES },
      storage: diskStorage({
        destination: (_req: Request, _file: Express.Multer.File, cb) => {
          cb(null, ensureUploadSubdir('chat'));
        },
        filename: (_req: Request, file: Express.Multer.File, cb) => {
          const ext = pickStoredChatExtension(file.mimetype, file.originalname);
          if (!ext) {
            cb(new Error('Unsupported file type'), '');
            return;
          }
          cb(null, `${randomUUID()}${ext}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (isAllowedChatFile(file.mimetype, file.originalname)) {
          cb(null, true);
          return;
        }
        cb(
          new BadRequestException(
            'Unsupported or unsafe file type. Images, PDFs, Office docs, audio, video and zip are allowed.',
          ),
          false,
        );
      },
    }),
  )
  uploadChatFile(@UploadedFile() file: Express.Multer.File) {
    if (!file?.filename) {
      throw new BadRequestException('A file is required.');
    }
    return {
      kind: attachmentKindForMime(file.mimetype, file.originalname),
      url: `/api/uploads/chat/${file.filename}`,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      fileName: file.originalname,
    };
  }

  @Post('voice')
  @UseInterceptors(
    FileInterceptor(VOICE_UPLOAD_FIELD, {
      limits: { fileSize: VOICE_UPLOAD_MAX_BYTES },
      storage: diskStorage({
        destination: (_req: Request, _file: Express.Multer.File, cb) => {
          cb(null, ensureUploadSubdir('voice'));
        },
        filename: (_req: Request, file: Express.Multer.File, cb) => {
          const ext = pickStoredVoiceExtension(
            file.mimetype,
            file.originalname,
          );
          if (!ext) {
            cb(new Error('Unsupported audio type'), '');
            return;
          }
          cb(null, `${randomUUID()}${ext}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (isAllowedVoiceFile(file.mimetype, file.originalname)) {
          cb(null, true);
          return;
        }
        cb(
          new BadRequestException('Unsupported audio format.'),
          false,
        );
      },
    }),
  )
  uploadVoice(
    @UploadedFile() file: Express.Multer.File,
    @Body('durationMs') durationMsRaw?: string,
  ) {
    if (!file?.filename) {
      throw new BadRequestException('A voice recording is required.');
    }
    const parsed = durationMsRaw ? Number.parseInt(durationMsRaw, 10) : 0;
    const durationMs =
      Number.isFinite(parsed) && parsed > 0
        ? Math.min(parsed, VOICE_MAX_DURATION_MS)
        : null;
    return {
      url: `/api/uploads/voice/${file.filename}`,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      durationMs,
    };
  }
}
