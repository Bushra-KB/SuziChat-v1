"use client";

import type { ReactNode } from "react";
import { cx } from "@/components/ui/suzi-primitives";

/** Centers profile content and provides one vertical scroll area. */
export function ProfilePageShell({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: "default" | "account";
}) {
  return (
    <section
      className={cx(
        "suzi-app-frame-fill suzi-profile-page",
        variant === "account" && "suzi-account-page",
      )}
    >
      <div
        className={cx(
          "suzi-profile-page-inner suzi-app-frame-scroll suzi-thin-scroll pr-1",
          variant === "account"
            ? "suzi-account-page-scroll pb-3 pt-1"
            : "space-y-[var(--row-gap)] pb-4",
        )}
      >
        {children}
      </div>
    </section>
  );
}
