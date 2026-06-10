"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Panel, SectionHeader } from "@/components/ui/suzi-primitives";
import { getStoredAuthSession } from "@/lib/auth-client";
import { createRoom } from "@/lib/rooms-client";

const PRIVACY_OPTIONS = ["Public", "Friends", "Private"] as const;

export function CreateRoomPageClient() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Social");
  const [privacy, setPrivacy] = useState<(typeof PRIVACY_OPTIONS)[number]>("Public");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

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
      const room = await createRoom(session.accessToken, {
        name: name.trim(),
        description: description.trim(),
        category: category.trim(),
        privacy,
      });
      router.push(`/app/rooms/view?r=${encodeURIComponent(room.slug)}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not create room.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-6">
      <Panel className="p-6 sm:p-7">
        <SectionHeader
          eyebrow="Create Room"
          title="Build a room"
          copy="Choose a clear room identity and privacy level."
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
              placeholder="Movie Nights"
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
                placeholder="Social"
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
              placeholder="Describe room purpose and vibe"
            />
          </div>
          {error ? <p className="text-sm text-amber-100">{error}</p> : null}
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={saving} className="suzi-primary-btn px-5 py-3 text-sm">
              {saving ? "Saving..." : "Create room"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/app/rooms")}
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
