"use client";

import Link from "next/link";
import { ReactNode } from "react";

function Badge({ status }: { status: "connected" | "reconnecting" | "offline" }) {
  const base =
    "text-xs px-2.5 py-1 rounded-full border backdrop-blur-md shadow-sm";
  if (status === "connected")
    return (
      <span className={`${base} border-emerald-400/30 bg-emerald-400/10 text-emerald-200`}>
        Connected
      </span>
    );
  if (status === "reconnecting")
    return (
      <span className={`${base} border-amber-400/30 bg-amber-400/10 text-amber-200`}>
        Reconnecting…
      </span>
    );
  return (
    <span className={`${base} border-rose-400/30 bg-rose-400/10 text-rose-200`}>
      Offline
    </span>
  );
}

export default function AppShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  // later: set from Supabase realtime + navigator.onLine
  const connectionStatus: "connected" | "reconnecting" | "offline" = "connected";

  return (
    <div className="min-h-screen">
      {/* Glass header */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-white/5 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/login" className="font-semibold tracking-tight hover:opacity-80">
  Smart Home
</Link>
            <span className="text-white/30">/</span>
            <h1 className="text-sm text-white/70">{title}</h1>
          </div>

          <div className="flex items-center gap-3">
            <Badge status={connectionStatus} />

            <details className="relative">
              <summary className="cursor-pointer select-none rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/80 hover:bg-white/10">
                Menu
              </summary>
              <div className="absolute right-0 mt-2 w-44 rounded-xl border border-white/10 bg-[#0b1220]/70 p-2 backdrop-blur-xl shadow-xl">
                <Link
                  className="block rounded-lg px-2 py-1.5 text-sm text-white/80 hover:bg-white/10"
                  href="/settings"
                >
                  Settings
                </Link>
                <button
                  className="block w-full rounded-lg px-2 py-1.5 text-left text-sm text-white/80 hover:bg-white/10"
                  onClick={() => alert("Sign out: connect Supabase later")}
                >
                  Sign out
                </button>
              </div>
            </details>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
