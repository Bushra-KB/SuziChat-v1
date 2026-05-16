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
  if (value.startsWith("/")) {
    return value;
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
