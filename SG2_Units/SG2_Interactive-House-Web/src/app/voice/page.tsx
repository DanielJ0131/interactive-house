"use client";

import { PageShell } from "@/components/pageShell";
import TopHeader from "@/components/TopHeader";
import { Microphone, WarningCircle, CaretLeft } from "@phosphor-icons/react";
import Link from "next/link";

export default function VoicePage() {
    return (
        <main className="min-h-screen bg-transparent">
            <TopHeader />

            <PageShell title="Voice Assistant" subtitle="Voice Recognition">
                <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6 text-center">

                    {/* Visual Icon */}
                    <div className="h-32 w-32 rounded-full bg-white/5 border border-white/10 flex items-center justify-center relative">
                        <div className="absolute inset-0 rounded-full bg-[#0EA5E9]/5 animate-pulse" />
                        <Microphone size={54} weight="thin" className="text-[#0EA5E9]" />
                    </div>

                    {/* Content */}
                    <div className="space-y-2">
                        <h3 className="text-xl font-bold text-white">System in Progress</h3>
                        <p className="text-white/40 text-sm max-w-[250px] mx-auto leading-relaxed">
                            Voice command integration is currently under development.
                        </p>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-black uppercase tracking-[0.2em]">
                        <WarningCircle size={14} />
                        Coming Soon
                    </div>

                    {/* Navigation Back */}
                    <Link
                        href="/hub"
                        className="mt-8 flex items-center gap-2 text-white/30 hover:text-[#0EA5E9] transition-colors text-xs font-bold uppercase tracking-widest"
                    >
                        <CaretLeft size={16} />
                        Return to Hub
                    </Link>
                </div>
            </PageShell>
        </main>
    );
}