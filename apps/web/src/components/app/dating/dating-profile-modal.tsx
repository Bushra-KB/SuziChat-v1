"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { uploadProfileAvatar } from "@/lib/users-client";

export type DatingProfileDraft = {
  age: string;
  gender: string;
  headline: string;
  datingBio: string;
  interests: string;
  photoUrl: string;
  minAgePref: string;
  maxAgePref: string;
  seekGender: string;
  isDiscoverable: boolean;
};

export function DatingProfileModal({
  draft,
  busy,
  accessToken,
  onChange,
  onClose,
  onSave,
}: {
  draft: DatingProfileDraft;
  busy: boolean;
  accessToken: string;
  onChange: (next: DatingProfileDraft) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const preview = draft.photoUrl.trim();

  async function onPhotoFile(file: File | null) {
    if (!file) {
      return;
    }
    setUploadBusy(true);
    try {
      const updated = await uploadProfileAvatar(accessToken, file);
      const url = updated.avatarUrl?.trim();
      if (url) {
        onChange({ ...draft, photoUrl: url });
      }
    } catch {
      // ignore — user can paste URL
    } finally {
      setUploadBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 p-4 sm:items-center">
      <form
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[1.2rem] border border-white/12 bg-[rgba(14,16,34,0.98)] p-5 shadow-2xl"
        onSubmit={(event) => {
          event.preventDefault();
          onSave();
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-lg font-semibold text-white">Dating profile</p>
          <button type="button" className="text-slate-400 hover:text-white" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="mt-4 flex items-center gap-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-fuchsia-300/35 bg-slate-800">
            {preview ? (
              preview.startsWith("/") ? (
                <Image src={preview} alt="" fill sizes="80px" className="object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="" className="h-full w-full object-cover" />
              )
            ) : (
              <span className="flex h-full w-full items-center justify-center text-2xl text-white/40">?</span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={uploadBusy}
              onClick={() => fileRef.current?.click()}
              className="suzi-secondary-btn px-3 py-2 text-xs"
            >
              {uploadBusy ? "Uploading…" : "Upload photo"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                void onPhotoFile(f ?? null);
              }}
            />
          </div>
        </div>

        <div className="mt-4 grid gap-3 text-sm">
          <label className="text-slate-300/85">
            Age
            <input
              className="suzi-input mt-1 w-full"
              type="number"
              inputMode="numeric"
              min={18}
              max={120}
              value={draft.age}
              onChange={(e) => onChange({ ...draft, age: e.target.value })}
            />
          </label>
          <label className="text-slate-300/85">
            Gender
            <select className="suzi-input mt-1 w-full" value={draft.gender} onChange={(e) => onChange({ ...draft, gender: e.target.value })}>
              <option value="">Prefer not to say</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="nonbinary">Non-binary</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="text-slate-300/85">
            Headline
            <input className="suzi-input mt-1 w-full" value={draft.headline} onChange={(e) => onChange({ ...draft, headline: e.target.value })} />
          </label>
          <label className="text-slate-300/85">
            About you
            <textarea className="suzi-input mt-1 min-h-[88px] w-full resize-y" value={draft.datingBio} onChange={(e) => onChange({ ...draft, datingBio: e.target.value })} />
          </label>
          <label className="text-slate-300/85">
            Interests (comma-separated)
            <input className="suzi-input mt-1 w-full" value={draft.interests} onChange={(e) => onChange({ ...draft, interests: e.target.value })} />
          </label>
          <label className="text-slate-300/85">
            Photo URL (optional override)
            <input className="suzi-input mt-1 w-full" value={draft.photoUrl} onChange={(e) => onChange({ ...draft, photoUrl: e.target.value })} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-slate-300/85">
              Min age pref
              <input
                className="suzi-input mt-1 w-full"
                type="number"
                inputMode="numeric"
                min={18}
                max={120}
                value={draft.minAgePref}
                onChange={(e) => onChange({ ...draft, minAgePref: e.target.value })}
              />
            </label>
            <label className="text-slate-300/85">
              Max age pref
              <input
                className="suzi-input mt-1 w-full"
                type="number"
                inputMode="numeric"
                min={18}
                max={120}
                value={draft.maxAgePref}
                onChange={(e) => onChange({ ...draft, maxAgePref: e.target.value })}
              />
            </label>
          </div>
          <label className="text-slate-300/85">
            Show me
            <select className="suzi-input mt-1 w-full" value={draft.seekGender} onChange={(e) => onChange({ ...draft, seekGender: e.target.value })}>
              <option value="any">Everyone</option>
              <option value="male">Men</option>
              <option value="female">Women</option>
              <option value="nonbinary">Non-binary</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-slate-300/85">
            <input
              type="checkbox"
              checked={draft.isDiscoverable}
              onChange={(e) => onChange({ ...draft, isDiscoverable: e.target.checked })}
            />
            Show my profile in discover
          </label>
          <button type="submit" disabled={busy || uploadBusy} className="suzi-primary-btn mt-2 px-4 py-3 text-sm">
            {busy ? "Saving..." : "Save profile"}
          </button>
        </div>
      </form>
    </div>
  );
}
