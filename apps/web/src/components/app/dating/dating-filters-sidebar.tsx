"use client";

import { useState } from "react";

export type DatingFilters = {
  minAge: number;
  maxAge: number;
  gender: string;
  country: string;
  search: string;
};

export function DatingFiltersSidebar({
  filters,
  hasProfile,
  busy,
  onChange,
  onApply,
}: {
  filters: DatingFilters;
  hasProfile: boolean;
  busy: boolean;
  onChange: (next: DatingFilters) => void;
  onApply: () => void;
}) {
  const [isGenderOpen, setIsGenderOpen] = useState(false);
  const genderOptions = [
    { value: "any", label: "Any" },
    { value: "male", label: "Men" },
    { value: "female", label: "Women" },
    { value: "nonbinary", label: "Non-binary" },
    { value: "other", label: "Other" },
  ];
  const selectedGender = genderOptions.find((option) => option.value === filters.gender)?.label ?? "Any";

  return (
    <aside className="flex w-full shrink-0 flex-col gap-4 rounded-[1.05rem] border border-fuchsia-300/18 bg-[rgba(16,19,38,0.55)] p-4 lg:w-72">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-fuchsia-100/70">Filters</p>
      <label className="block text-xs text-slate-300/85">
        Min age
        <input
          type="number"
          className="suzi-input mt-1 w-full"
          value={filters.minAge}
          min={18}
          max={120}
          onChange={(e) => onChange({ ...filters, minAge: Number(e.target.value) || 18 })}
        />
      </label>
      <label className="block text-xs text-slate-300/85">
        Max age
        <input
          type="number"
          className="suzi-input mt-1 w-full"
          value={filters.maxAge}
          min={18}
          max={120}
          onChange={(e) => onChange({ ...filters, maxAge: Number(e.target.value) || 99 })}
        />
      </label>
      <label className="block text-xs text-slate-300/85">
        Gender
        <div className="relative mt-1">
          <button
            type="button"
            className="suzi-input suzi-dating-select w-full text-left"
            aria-haspopup="menu"
            aria-expanded={isGenderOpen}
            onClick={() => setIsGenderOpen((value) => !value)}
          >
            {selectedGender}
          </button>
          {isGenderOpen ? (
            <div className="suzi-dating-dropdown-menu absolute left-0 right-0 top-[calc(100%+0.35rem)] z-30 overflow-hidden rounded-[0.85rem] border border-fuchsia-300/24 bg-[rgba(22,12,60,0.98)] p-1.5 shadow-[0_16px_44px_rgba(12,8,36,0.5)] backdrop-blur">
              {genderOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className="suzi-dating-dropdown-option w-full rounded-[0.6rem] px-3 py-2 text-left text-xs font-semibold text-fuchsia-50 transition hover:bg-fuchsia-400/18 hover:text-white"
                  onClick={() => {
                    onChange({ ...filters, gender: option.value });
                    setIsGenderOpen(false);
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </label>
      <label className="block text-xs text-slate-300/85">
        Country (exact)
        <input
          className="suzi-input mt-1 w-full"
          placeholder="e.g. Ethiopia"
          value={filters.country}
          onChange={(e) => onChange({ ...filters, country: e.target.value })}
        />
      </label>
      <label className="block text-xs text-slate-300/85">
        Search name / @username
        <input
          className="suzi-input mt-1 w-full"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
        />
      </label>
      <button
        type="button"
        disabled={!hasProfile || busy}
        onClick={onApply}
        className="suzi-primary-btn px-3 py-2.5 text-sm disabled:opacity-50"
      >
        Apply filters
      </button>
      {!hasProfile ? (
        <p className="text-xs leading-relaxed text-slate-400/90">
          Complete your dating profile to browse discover and receive matches.
        </p>
      ) : null}
    </aside>
  );
}
