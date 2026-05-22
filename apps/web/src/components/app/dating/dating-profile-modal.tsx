"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { uploadDatingPhoto } from "@/lib/dating-client";

export type DatingProfileDraft = {
  datingName: string;
  age: string;
  gender: string;
  headline: string;
  datingBio: string;
  interests: string;
  photoUrl: string;
  photoUrls: string[];
  minAgePref: string;
  maxAgePref: string;
  seekGender: string;
  isDiscoverable: boolean;
};

export function DatingProfileModal({
  draft,
  busy,
  accessToken,
  fallbackName,
  onChange,
  onClose,
  onSave,
}: {
  draft: DatingProfileDraft;
  busy: boolean;
  accessToken: string;
  fallbackName: string;
  onChange: (next: DatingProfileDraft) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState("");

  async function onPhotoFiles(files: FileList | null) {
    const selected = Array.from(files ?? []).slice(0, Math.max(0, 8 - draft.photoUrls.length));
    if (selected.length === 0) {
      return;
    }
    setUploadBusy(true);
    setUploadError("");
    try {
      const uploaded: string[] = [];
      for (let i = 0; i < selected.length; i += 1) {
        const file = selected[i];
        setUploadProgress(Math.round((i / selected.length) * 100));
        const { url } = await uploadDatingPhoto(accessToken, file, (percent) => {
          setUploadProgress(Math.round(((i + percent / 100) / selected.length) * 100));
        });
        uploaded.push(url);
      }
      const nextPhotoUrls = [...draft.photoUrls, ...uploaded].slice(0, 8);
      onChange({ ...draft, photoUrls: nextPhotoUrls, photoUrl: nextPhotoUrls[0] ?? "" });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploadBusy(false);
      setUploadProgress(null);
    }
  }

  function removePhoto(url: string) {
    const nextPhotoUrls = draft.photoUrls.filter((item) => item !== url);
    onChange({ ...draft, photoUrls: nextPhotoUrls, photoUrl: nextPhotoUrls[0] ?? "" });
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center overflow-hidden bg-black/55 p-3 sm:items-center sm:p-5">
      <form
        className="suzi-thin-scroll max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto overscroll-contain rounded-[1.2rem] border border-white/12 bg-[rgba(14,16,34,0.98)] p-5 pb-6 shadow-2xl sm:max-h-[min(90vh,48rem)]"
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

        <div className="mt-4 grid gap-3 text-sm">
          <label className="text-slate-300/85">
            Dating display name
            <input
              className="suzi-input mt-1 w-full"
              value={draft.datingName}
              placeholder={fallbackName}
              onChange={(e) => onChange({ ...draft, datingName: e.target.value })}
            />
            <span className="mt-1 block text-[0.68rem] text-slate-500/90">
              Leave empty to use {fallbackName}.
            </span>
          </label>
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
          <div className="rounded-[1rem] border border-fuchsia-300/18 bg-white/[0.03] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium text-slate-200">Dating photos</p>
                <p className="mt-1 text-[0.68rem] text-slate-500/90">Upload 1 or more photos. The first photo is shown first on your card.</p>
              </div>
              <button
                type="button"
                disabled={uploadBusy || draft.photoUrls.length >= 8}
                onClick={() => fileRef.current?.click()}
                className="suzi-secondary-btn px-3 py-2 text-xs disabled:opacity-50"
              >
                {uploadBusy ? "Uploading..." : "Browse photos"}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = e.target.files;
                  e.target.value = "";
                  void onPhotoFiles(files);
                }}
              />
            </div>
            {uploadProgress !== null ? (
              <div className="mt-3">
                <div className="flex items-center justify-between text-[0.68rem] text-fuchsia-100/80">
                  <span>Uploading photos</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#ff2da7,#ce2fff)] transition-[width]"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            ) : null}
            {uploadError ? <p className="mt-2 text-xs text-rose-300/90">{uploadError}</p> : null}
            {draft.photoUrls.length > 0 ? (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {draft.photoUrls.map((url, index) => (
                  <div key={url} className="group relative aspect-[4/5] overflow-hidden rounded-[0.8rem] border border-fuchsia-300/20 bg-slate-900">
                    {url.startsWith("/") ? (
                      <Image src={url} alt="" fill sizes="120px" className="object-cover" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={url} alt="" className="h-full w-full object-cover" />
                    )}
                    <span className="absolute left-1.5 top-1.5 rounded-full bg-black/55 px-2 py-0.5 text-[0.6rem] font-semibold text-white">
                      {index === 0 ? "Main" : index + 1}
                    </span>
                    <button
                      type="button"
                      className="absolute right-1.5 top-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[0.6rem] font-semibold text-white opacity-90 transition hover:bg-rose-500"
                      onClick={() => removePhoto(url)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 rounded-[0.75rem] border border-dashed border-fuchsia-300/22 px-3 py-4 text-center text-xs text-slate-400">
                No dating photos uploaded yet.
              </p>
            )}
          </div>
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
