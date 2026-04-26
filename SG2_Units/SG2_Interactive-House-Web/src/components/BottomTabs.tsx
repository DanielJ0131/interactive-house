"use client";

import Link from "next/link";
import { House, Brain, MusicNotes } from "@phosphor-icons/react";

export default function BottomTabs() {
    return (
        <div className="fixed bottom-0 left-0 w-full bg-[var(--color-surface)] border-t border-white/10 flex justify-around py-3">

            <Link href="/hub" className="flex flex-col items-center text-white/70 hover:text-[var(--color-accent)]">
                <House size={22} />
                Hub
            </Link>

            <Link href="/ai" className="flex flex-col items-center text-white/70 hover:text-[var(--color-accent)]">
                <Brain size={22} />
                AI
            </Link>

            <Link href="/music" className="flex flex-col items-center text-white/70 hover:text-[var(--color-accent)]">
                <MusicNotes size={22} />
                Music
            </Link>

        </div>
    );
}