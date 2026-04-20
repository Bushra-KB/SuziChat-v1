"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Panel, SectionHeader } from "@/components/ui/suzi-primitives";
import { getStoredAuthSession } from "@/lib/auth-client";
import { getRoom, updateRoom, type ApiRoom } from "@/lib/rooms-client";

const PRIVACY_OPTIONS = ["Public", "Friends", "Private"] as const;

export function EditRoomPageClient({ roomSlug }: { roomSlug: string }) {
  const router = useRouter();
  const [room, setRoom] = useState<ApiRoom | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Social");
  const [privacy, setPrivacy] = useState<(typeof PRIVACY_OPTIONS)[number]>("Public");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void getRoom(roomSlug)
      .then((res) => {
        if (cancelled) {
          return;
        }
        setRoom(res);
        setName(res.name);
        setDescription(res.description ?? "");
        setCategory(res.category);
        setPrivacy((res.privacy as (typeof PRIVACY_OPTIONS)[number]) ?? "Public");
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load room.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [roomSlug]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const session = getStoredAuthSession();
    if (!session) {
      setError("Not signed in.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const updated = await updateRoom(session.accessToken, roomSlug, {
        name: name.trim(),
        description: description.trim(),
        category: category.trim(),
        privacy,
      });
      setRoom(updated);
      router.push(`/app/rooms/${encodeURIComponent(updated.slug)}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not save room.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-6">
      <Panel className="p-6 sm:p-7">
        <SectionHeader
          eyebrow="Edit Room"
          title={loading ? "Loading..." : `Refine ${room?.name ?? roomSlug}`}
          copy="Update room name, description, category, and privacy."
        />
        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100/68">
              Room name
            </label>
            <input
              className="suzi-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Room name"
              required
            />
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100/68">
                Category
              </label>
              <input
                className="suzi-input"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100/68">
                Privacy
              </label>
              <select
                className="suzi-input"
                value={privacy}
                onChange={(event) => setPrivacy(event.target.value as (typeof PRIVACY_OPTIONS)[number])}
              >
                {PRIVACY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100/68">
              Description
            </label>
            <textarea
              className="suzi-input min-h-36 resize-none"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          {error ? <p className="text-sm text-amber-100">{error}</p> : null}
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={saving || loading} className="suzi-primary-btn px-5 py-3 text-sm">
              {saving ? "Saving..." : "Save changes"}
            </button>
            <button
              type="button"
              onClick={() => router.push(`/app/rooms/${encodeURIComponent(roomSlug)}`)}
              className="suzi-secondary-btn px-5 py-3 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      </Panel>
    </section>
  );
}
