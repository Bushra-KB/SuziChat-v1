"use client";

import { createPortal } from "react-dom";
import {
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { cx } from "@/components/ui/suzi-primitives";

type Align = "start" | "end";

const VIEWPORT_PAD = 8;

function getComposedPath(event: Event): EventTarget[] {
  if (typeof event.composedPath === "function") {
    return event.composedPath();
  }
  return event.target ? [event.target] : [];
}

/** Portaled shell header menus (shared anchor position). */
export function isEventInsideShellDropdown(event: Event): boolean {
  return getComposedPath(event).some(
    (node) => node instanceof Element && node.closest(".suzi-shell-dropdown") !== null,
  );
}

/** Anchor trigger or its portaled menu (via shared data-dropdown-owner). */
export function isEventInsideAnchor(
  event: Event,
  anchorRef: RefObject<HTMLElement | null>,
): boolean {
  const root = anchorRef.current;
  if (!root) {
    return false;
  }

  const ownerId = root.dataset.dropdownOwner;
  const path = getComposedPath(event);

  return path.some((node) => {
    if (!(node instanceof Node)) {
      return false;
    }
    if (node === root || root.contains(node)) {
      return true;
    }
    if (ownerId && node instanceof Element) {
      return node.closest(`[data-dropdown-owner="${ownerId}"]`) !== null;
    }
    return false;
  });
}

function horizontalLimits(boundsRect?: DOMRect | null) {
  const minX = boundsRect
    ? Math.max(VIEWPORT_PAD, boundsRect.left + VIEWPORT_PAD)
    : VIEWPORT_PAD;
  const maxX = boundsRect
    ? Math.min(window.innerWidth - VIEWPORT_PAD, boundsRect.right - VIEWPORT_PAD)
    : window.innerWidth - VIEWPORT_PAD;
  return { minX, maxX, span: Math.max(0, maxX - minX) };
}

function computeAnchoredPosition(
  anchorRect: DOMRect,
  menuWidth: number,
  menuHeight: number,
  align: Align,
  gap: number,
  boundsRect?: DOMRect | null,
): CSSProperties {
  const { minX, maxX, span } = horizontalLimits(boundsRect);
  const width = span > 0 ? Math.min(menuWidth, span) : menuWidth;

  let left = align === "start" ? anchorRect.left : anchorRect.right - width;
  left = Math.max(minX, Math.min(left, maxX - width));

  let top = anchorRect.bottom + gap;
  const viewportBottom = window.innerHeight - VIEWPORT_PAD;
  const boundsBottom = boundsRect
    ? Math.min(viewportBottom, boundsRect.bottom - VIEWPORT_PAD)
    : viewportBottom;

  if (top + menuHeight > boundsBottom) {
    top = anchorRect.top - gap - menuHeight;
  }
  top = Math.max(VIEWPORT_PAD, top);

  const style: CSSProperties = {
    position: "fixed",
    top,
    left,
    right: "auto",
    visibility: "visible",
    pointerEvents: "auto",
  };

  if (width < menuWidth) {
    style.width = width;
    style.maxWidth = width;
  }

  return style;
}

export function useAnchoredDropdownPosition(
  open: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  align: Align = "start",
  gap = 6,
  menuRef: RefObject<HTMLElement | null>,
  boundsRef?: RefObject<HTMLElement | null>,
  positionAnchorRef?: RefObject<HTMLElement | null>,
) {
  const [style, setStyle] = useState<CSSProperties>({
    visibility: "hidden",
    pointerEvents: "none",
  });

  const update = useCallback(() => {
    const anchor = (positionAnchorRef ?? anchorRef).current;
    if (!anchor) {
      return;
    }
    const rect = anchor.getBoundingClientRect();
    const menu = menuRef.current;
    const menuWidth = menu?.offsetWidth ?? 256;
    const menuHeight = menu?.offsetHeight ?? 120;
    const boundsRect = boundsRef?.current?.getBoundingClientRect() ?? null;

    setStyle(
      computeAnchoredPosition(rect, menuWidth, menuHeight, align, gap, boundsRect),
    );
  }, [anchorRef, positionAnchorRef, align, gap, menuRef, boundsRef]);

  useLayoutEffect(() => {
    if (!open) {
      setStyle({ visibility: "hidden", pointerEvents: "none" });
      return;
    }

    update();

    const menu = menuRef.current;
    const observer =
      menu && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => update())
        : null;
    if (menu && observer) {
      observer.observe(menu);
    }

    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, update, menuRef]);

  return style;
}

export function AnchoredDropdown({
  open,
  anchorRef,
  positionAnchorRef,
  align = "start",
  gap = 6,
  boundsRef,
  className,
  children,
}: {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  /** When set, menu is positioned under this element (e.g. shared shell toolbar slot). */
  positionAnchorRef?: RefObject<HTMLElement | null>;
  align?: Align;
  gap?: number;
  /** Keep menu inside this element (e.g. friends panel column). */
  boundsRef?: RefObject<HTMLElement | null>;
  className?: string;
  children: ReactNode;
}) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const style = useAnchoredDropdownPosition(
    open,
    anchorRef,
    align,
    gap,
    menuRef,
    boundsRef,
    positionAnchorRef,
  );
  const ownerId = useId();

  useLayoutEffect(() => {
    const el = anchorRef.current;
    if (!el) {
      return;
    }
    el.dataset.dropdownOwner = ownerId;
    return () => {
      delete el.dataset.dropdownOwner;
    };
  }, [anchorRef, ownerId]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      ref={menuRef}
      className={cx("suzi-dropdown-popover", className)}
      style={style}
      role="menu"
      data-dropdown-owner={ownerId}
    >
      {children}
    </div>,
    document.body,
  );
}
