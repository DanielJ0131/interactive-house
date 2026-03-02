import AppShell from "@/components/AppShell";
import { ZoneCard } from "@/components/ZoneCard";
import { zones } from "@/lib/mockData"; // this will later come from Supabase

export default function HomePage() {
    return (
    <AppShell title="Home">
        <div className="mb-4">
        <h2 className="text-xl font-semibold">Zones</h2>
        <p className="text-sm text-slate-600">Choose a zone to control devices.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {zones.map((z) => (
            <ZoneCard key={z.id} zone={z} />
        ))}
        </div>
       
        <div className="pt-6 text-center text-xs text-white/40">
                Built for comfortable and safe life at home. © 2026 Smart Home Inc.
              </div>
    </AppShell>
    );
}
