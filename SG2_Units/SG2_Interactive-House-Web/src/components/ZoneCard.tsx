import Link from "next/link";
import { Zone } from "@/lib/types";

export function ZoneCard({ zone }: { zone: Zone }) {
  return (
    <Link
      href={`/zones/${zone.id}`}
      className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/10"
    >
      {/* Gradient glow */}
      <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-gradient-to-br from-indigo-500/30 via-pink-500/20 to-emerald-500/20 blur-2xl opacity-0 transition group-hover:opacity-100" />

      <div className="relative">
        <div className="text-lg font-bold tracking-tight text-white">
          {zone.name}
        </div>
        <div className="mt-1 text-sm text-white/70">Open devices</div>

        <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
          View zone →
        </div>
      </div>
    </Link>
  );
}
