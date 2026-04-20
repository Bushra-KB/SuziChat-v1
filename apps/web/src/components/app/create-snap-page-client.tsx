"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Panel, SectionHeader, cx } from "@/components/ui/suzi-primitives";
import { getStoredAuthSession } from "@/lib/auth-client";
import { createPost } from "@/lib/posts-client";
import { snaps as mockSnaps } from "@/lib/v1-mock-data";

function PreviewMedia({ src, alt }: { src: string; alt: string }) {
  if (!src.startsWith("/")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} className="absolute inset-0 h-full w-full object-cover" />
    );
  }
  return <Image src={src} alt={alt} fill sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" />;
}

export function CreateSnapPageClient() {
  const router = useRouter();
  const fallback = mockSnaps[0];
  const [mediaUrl, setMediaUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [visibility, setVisibility] = useState<"Public" | "Friends">("Public");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const previewSrc = mediaUrl.trim() || fallback.image;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const s = getStoredAuthSession();
    if (!s || !mediaUrl.trim()) {
      setError("Sign in and enter an image URL.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const post = await createPost(s.accessToken, {
        kind: "SNAP",
        mediaUrl: mediaUrl.trim(),
        caption: caption.trim() || undefined,
        visibility,
      });
      router.push(`/app/snaps/${post.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not publish.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex justify-center">
      <Panel className="w-full max-w-3xl p-6 sm:p-7">
        <SectionHeader
          eyebrow="Create Snap"
          title="Post a photo with light editing and visibility control"
          copy="Paste an image URL, add a caption, choose visibility, and publish to the live feed."
        />

        <form onSubmit={handleSubmit} className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-5">
            <div className="rounded-[1.5rem] border border-dashed border-white/12 bg-white/4 p-5">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Image URL
              </label>
              <input
                className="suzi-input mb-4 w-full"
                placeholder="https://example.com/photo.jpg"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                autoComplete="off"
              />
              <div className="relative h-72 overflow-hidden rounded-[1.2rem] border border-white/8">
                <PreviewMedia src={previewSrc} alt="Snap preview" />
                <div className={`pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(10,12,24,0.04),rgba(10,12,24,0.16))] ${fallback.tone}`} />
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button type="button" className="suzi-secondary-btn px-4 py-2.5 text-sm" onClick={() => setMediaUrl("")}>
                  Clear URL
                </button>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Caption
              </label>
              <textarea
                className="suzi-input min-h-28 resize-none"
                placeholder="Best night. The crowd was live."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Visibility
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={cx(
                    "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] transition",
                    visibility === "Public"
                      ? "border-pink-300/45 bg-pink-400/18 text-pink-100 shadow-[0_0_14px_rgba(255,32,121,0.2)]"
                      : "border-white/14 bg-white/7 text-[var(--text-muted)] hover:border-white/22",
                  )}
                  onClick={() => setVisibility("Public")}
                >
                  Public
                </button>
                <button
                  type="button"
                  className={cx(
                    "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] transition",
                    visibility === "Friends"
                      ? "border-cyan-300/45 bg-cyan-400/14 text-cyan-100 shadow-[0_0_14px_rgba(0,229,255,0.18)]"
                      : "border-white/14 bg-white/7 text-[var(--text-muted)] hover:border-white/22",
                  )}
                  onClick={() => setVisibility("Friends")}
                >
                  Friends only
                </button>
              </div>
            </div>
            {error ? <p className="text-sm text-rose-300">{error}</p> : null}
            <button type="submit" disabled={busy} className="suzi-primary-btn w-full px-4 py-3 text-sm disabled:opacity-60">
              {busy ? "Posting…" : "Post Snap"}
            </button>
          </div>
        </form>
      </Panel>
    </section>
  );
}
