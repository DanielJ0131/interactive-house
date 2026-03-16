"use client";

import { ReactNode } from "react";
import BottomTabs from "./BottomTabs";

export default function AppShell({
  title,
  subtitle,
  showTabs = true,
  children,
}: {
  title?: string;
  subtitle?: string;
  showTabs?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#040714] text-white">
      {/* background glow */}
      <div className="pointer-events-none fixed inset-0 opacity-60">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[#0EA5E9]/10 blur-3xl" />
        <div className="absolute top-40 -left-40 h-[520px] w-[520px] rounded-full bg-[#7C3AED]/10 blur-3xl" />
      </div>

      {/* phone-ish container */}
      <div className="relative mx-auto min-h-screen w-full max-w-[430px] px-5 pb-24 pt-6">
        {(title || subtitle) && (
          <header className="pt-6 pb-4">
            {title && <h1 className="text-5xl font-extrabold tracking-tight">{title}</h1>}
            {subtitle && <p className="mt-1 text-lg text-white/45">{subtitle}</p>}
          </header>
        )}

        {children}

        {showTabs && (
          <div className="fixed bottom-0 left-1/2 w-full max-w-[430px] -translate-x-1/2 px-5 pb-5">
            <BottomTabs />
          </div>
        )}
      </div>
    </div>
  );
}
