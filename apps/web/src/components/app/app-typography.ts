/**
 * Compact app typography — same scale as the home dashboard.
 * Hierarchy: panel title → L1 → L2 → L3 / section / action.
 */

export const panelTitle = "suzi-home-panel-title font-bold tracking-tight text-white";
export const homePanelHeader = "suzi-home-panel-header";
export const homePanelIcon = "suzi-home-panel-icon";
export const homeInset = "suzi-home-inset";
export const homeRow = "suzi-home-row";
export const panelLink =
  "suzi-home-panel-link shrink-0 whitespace-nowrap font-medium text-fuchsia-200/90 transition hover:text-fuchsia-100";
export const panelMeta = "suzi-home-panel-meta";

export const listL1 = "suzi-home-list-l1";
export const listL2 = "suzi-home-list-l2";
export const listL3 = "suzi-home-list-l3";

export const listTitle = `${listL1} font-semibold leading-tight text-white`;
export const listSubtitle = `${listL2} suzi-home-list-subtitle truncate leading-none`;
export const listMeta = `${listL3}`;
export const listSection = "suzi-home-list-section font-semibold";
export const listEmpty = "suzi-home-list-empty";
export const listAction = "suzi-home-list-action font-semibold leading-none";

export const listTitleLink = `${listTitle} transition hover:text-cyan-100`;
export const listTitleLinkCyan = `${listTitle} transition hover:text-cyan-50`;

export const listActionBtn = `${listAction} rounded-full border px-2 py-0.5`;
export const listActionChip = `${listAction} inline-flex items-center justify-center rounded-[0.7rem] border font-semibold transition disabled:opacity-60`;
export const listActionPrimary = `${listL2} inline-flex items-center justify-center rounded-[0.7rem] border font-semibold leading-none transition`;

export const homeTabChip = `${listL1} inline-flex h-[1.35rem] shrink-0 items-center gap-1 rounded-[0.45rem] border px-1.5 font-medium leading-none transition`;

export const homeTabActive = `${homeTabChip} suzi-home-tab-active`;
export const homeTabInactive = `${homeTabChip} suzi-home-tab-inactive`;

export function homeTabClasses(active: boolean) {
  return active ? homeTabActive : homeTabInactive;
}

export const homeBtnPrimary = `${listActionPrimary} suzi-home-btn-primary`;
export const homeBtnSecondary = `${listActionChip} suzi-home-btn-secondary`;

export const homeGameCard = "suzi-home-game-card";
export const homeStatPill = "suzi-home-stat-pill";
export const homeStatPillLive = "suzi-home-stat-pill suzi-home-stat-pill--live";
export const homeSnapTile = "suzi-home-snap-tile";

export const homeSearchInput = `${listL1} suzi-home-search-field leading-none`;

export const modalTitle = `${panelTitle} font-semibold`;
export const modalLabel = `${listSection} mb-1 block tracking-[0.14em]`;
export const modalInput = `${listL1} suzi-input leading-none`;
export const modalFieldBtn = `${listActionBtn} border-cyan-300/28 bg-cyan-400/16 text-cyan-50`;
export const modalPrimaryBtn = `${listActionPrimary} suzi-primary-btn border-fuchsia-200/44 text-white`;

/** Shell header dropdowns */
export const shellDropdownHeading = `${panelTitle} px-2 py-1`;
export const shellDropdownItem = `${listL1} flex items-center gap-1.5 rounded-[0.7rem] px-2 py-1.5 transition hover:bg-white/8 hover:text-white`;
export const shellDropdownItemActive = `${shellDropdownItem} bg-white/12 text-white`;
export const shellDropdownRow = `${listL1} flex items-center gap-2 rounded-[0.7rem] px-2 py-1.5 transition hover:bg-white/8`;
export const shellDropdownRowTitle = `${listL1} truncate font-semibold leading-tight text-white`;
export const shellDropdownRowSubtitle = `${listL2} suzi-home-list-subtitle truncate leading-none`;
export const shellDropdownRowTime = `${listL3} shrink-0`;
export const shellDropdownFooterLink = `${listL2} font-medium transition hover:text-white`;
export const shellDropdownFooterAction = `${listAction} uppercase tracking-[0.1em] text-fuchsia-200/90 transition hover:text-white`;
export const shellDropdownEmpty = `${listEmpty} px-2 py-2`;
export const shellDropdownIcon = "h-3 w-3 shrink-0 text-cyan-100/90";
export const shellDropdownLogout = `${shellDropdownItem} text-pink-100/92 hover:bg-pink-400/12 hover:text-white`;

/** Page chrome — titles outside compact panels */
export const pageTitle = `${panelTitle}`;
export const pageEyebrow = `${listSection} uppercase tracking-[0.28em]`;
export const pageLead = `${listL2} leading-relaxed`;
