"use client";

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
        <select
          className="suzi-input mt-1 w-full"
          value={filters.gender}
          onChange={(e) => onChange({ ...filters, gender: e.target.value })}
        >
          <option value="any">Any</option>
          <option value="male">Men</option>
          <option value="female">Women</option>
          <option value="nonbinary">Non-binary</option>
          <option value="other">Other</option>
        </select>
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
      ) : (
        <p className="text-[0.65rem] leading-relaxed text-slate-500/90">
          Defaults use your profile preferences when you have not changed filters here.
        </p>
      )}
    </aside>
  );
}
