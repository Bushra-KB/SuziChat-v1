import { uploadFormWithProgress, type UploadProgressHandler } from "@/lib/api-upload";

export type AttachmentKind = "FILE" | "IMAGE" | "VOICE";
export type ChatMessageKind = "TEXT" | "VOICE" | "FILE" | "IMAGE" | "CALL";

export type ChatAttachment = {
  id?: string;
  kind: AttachmentKind;
  url: string;
  mimeType: string;
  sizeBytes: number;
  fileName?: string | null;
  durationMs?: number | null;
  width?: number | null;
  height?: number | null;
};

export const CHAT_FILE_MAX_BYTES = 25 * 1024 * 1024;
export const VOICE_MAX_BYTES = 10 * 1024 * 1024;

const BLOCKED_EXTENSIONS = new Set([
  ".exe",
  ".bat",
  ".cmd",
  ".sh",
  ".com",
  ".msi",
  ".scr",
  ".jar",
  ".app",
  ".dll",
  ".js",
  ".mjs",
  ".cjs",
  ".php",
  ".py",
  ".rb",
  ".ps1",
  ".vbs",
  ".html",
  ".htm",
  ".svg",
]);

function fileExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot).toLowerCase() : "";
}

/** Client-side guard mirrored by the API allow/block lists. */
export function validateChatFile(
  file: File,
): { ok: true } | { ok: false; message: string } {
  if (file.size > CHAT_FILE_MAX_BYTES) {
    return {
      ok: false,
      message: `"${file.name}" is larger than ${formatBytes(CHAT_FILE_MAX_BYTES)}.`,
    };
  }
  if (BLOCKED_EXTENSIONS.has(fileExtension(file.name))) {
    return { ok: false, message: `"${file.name}" is not an allowed file type.` };
  }
  return { ok: true };
}

export async function uploadChatFile(
  accessToken: string,
  file: File,
  onProgress?: UploadProgressHandler,
): Promise<ChatAttachment> {
  const form = new FormData();
  form.append("file", file);
  const res = await uploadFormWithProgress<{
    kind: AttachmentKind;
    url: string;
    mimeType: string;
    sizeBytes: number;
    fileName: string | null;
  }>("/v1/uploads/chat-file", form, { accessToken, onProgress });
  return { ...res };
}

export async function uploadVoiceClip(
  accessToken: string,
  blob: Blob,
  durationMs: number,
  onProgress?: UploadProgressHandler,
): Promise<ChatAttachment> {
  const form = new FormData();
  const extension = blob.type.includes("ogg") ? "ogg" : "weba";
  form.append("file", blob, `voice-${Date.now()}.${extension}`);
  form.append("durationMs", String(Math.max(0, Math.round(durationMs))));
  const res = await uploadFormWithProgress<{
    url: string;
    mimeType: string;
    sizeBytes: number;
    durationMs: number | null;
  }>("/v1/uploads/voice", form, { accessToken, onProgress });
  return { kind: "VOICE", ...res };
}

/** Strips client-only metadata before sending over HTTP/socket. */
export function toAttachmentPayload(attachment: ChatAttachment) {
  return {
    kind: attachment.kind,
    url: attachment.url,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
    fileName: attachment.fileName ?? undefined,
    durationMs: attachment.durationMs ?? undefined,
    width: attachment.width ?? undefined,
    height: attachment.height ?? undefined,
  };
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024)),
  );
  const value = bytes / 1024 ** exponent;
  return `${value >= 10 || exponent === 0 ? Math.round(value) : value.toFixed(1)} ${units[exponent]}`;
}

export function formatClipDuration(durationMs: number | null | undefined): string {
  const totalSeconds = Math.max(0, Math.round((durationMs ?? 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/** Short label for thread/inbox previews when a message has no text body. */
export function attachmentPreviewLabel(
  kind: ChatMessageKind,
  attachments?: ChatAttachment[],
): string {
  if (kind === "VOICE") {
    return "Voice message";
  }
  if (kind === "IMAGE") {
    return "Photo";
  }
  if (kind === "CALL") {
    return "Call";
  }
  if (kind === "FILE") {
    const name = attachments?.[0]?.fileName;
    return name ? name : "Attachment";
  }
  return "";
}
