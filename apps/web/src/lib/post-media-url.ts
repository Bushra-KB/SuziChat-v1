import { getApiBaseUrl } from "@/lib/api-base-url";

const MAX_POST_MEDIA_URL_LENGTH = 12_000;

export function isDataMediaUrl(url: string) {
  return url.trim().startsWith("data:");
}

export function isHttpMediaUrl(url: string) {
  return /^https?:\/\//i.test(url.trim());
}

export function isUploadedSnapPath(url: string) {
  return url.trim().startsWith("/api/uploads/snaps/");
}

export function isUploadedReelPath(url: string) {
  return url.trim().startsWith("/api/uploads/reels/");
}

/** Absolute URL for displaying post media in img/video tags. */
export function resolvePostMediaUrl(mediaUrl: string): string {
  const value = mediaUrl.trim();
  if (!value) {
    return "";
  }
  if (isHttpMediaUrl(value) || isDataMediaUrl(value) || value.startsWith("blob:")) {
    return value;
  }
  // Root-relative uploaded media such as "/api/uploads/reels/<file>". On the web
  // this resolves against the site origin, but inside the native Capacitor
  // webview the document origin is capacitor://localhost, so the file would 404
  // (reels show a blank frame stuck at 00:00). Build an absolute URL against the
  // configured API base instead. The stored path carries an "/api" prefix that
  // the API serves under "/uploads", and getApiBaseUrl() already targets "/api"
  // in production, so strip the leading "/api" before appending to the base.
  if (value.startsWith("/")) {
    const base = getApiBaseUrl().replace(/\/+$/, "");
    const path = value.replace(/^\/api(?=\/)/, "");
    return `${base}${path}`;
  }
  return value;
}

/** Client-side validation before createPost. */
export function validatePostMediaUrl(
  url: string,
  kind: "SNAP" | "REEL",
): { ok: true; value: string } | { ok: false; message: string } {
  const value = url.trim();
  if (!value) {
    return { ok: false, message: kind === "SNAP" ? "Add an image." : "Add a video URL or file." };
  }
  if (isDataMediaUrl(value)) {
    return {
      ok: false,
      message:
        kind === "SNAP"
          ? "Use Browse to upload the image, or paste an https:// link (embedded base64 is not supported)."
          : "Use Browse to upload the video, or paste an https:// link (not base64).",
    };
  }
  if (value.length > MAX_POST_MEDIA_URL_LENGTH) {
    return {
      ok: false,
      message: "Media URL is too long. Upload the file instead of embedding it in the form.",
    };
  }
  if (kind === "SNAP") {
    if (isUploadedSnapPath(value) || isHttpMediaUrl(value)) {
      return { ok: true, value };
    }
    return { ok: false, message: "Upload an image or paste a direct https:// image URL." };
  }
  if (isUploadedReelPath(value) || isHttpMediaUrl(value) || value.startsWith("blob:")) {
    return { ok: true, value };
  }
  return { ok: false, message: "Upload a video file or paste a direct https:// video link." };
}
