"use client";

import type { ReactNode } from "react";
import type { AuthSession } from "@/lib/auth-client";

export function AppShell({
  children,
}: {
  children: ReactNode;
  pathname: string;
  session: AuthSession;
  onLogout: () => void;
}) {
  return (
    <main className="suzi-hybrid-bg relative min-h-screen overflow-hidden text-white">
      <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(255,255,255,0.6)_0.7px,transparent_0.7px)] [background-size:28px_28px]" />
      <div className="absolute left-0 top-0 h-[30rem] w-[30rem] rounded-full bg-fuchsia-500/10 blur-[140px]" />
      <div className="absolute bottom-0 right-0 h-[24rem] w-[24rem] rounded-full bg-cyan-400/10 blur-[120px]" />

      <div className="relative mx-auto w-full max-w-[1460px] px-3 pb-10 pt-6 sm:px-4 lg:px-5">
        {children}
      </div>
    </main>
  );
}
