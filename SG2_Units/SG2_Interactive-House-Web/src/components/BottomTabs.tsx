"use client";

import Link from "next/link";
import { House, Brain, MusicNotes } from "@phosphor-icons/react";

export default function BottomTabs() {
    return (
        <div className="fixed bottom-0 left-0 w-full bg-[#070F2B] border-t border-white/10 flex justify-around py-3">

            <Link href="/hub" className="flex flex-col items-center text-sm">
                <House size={22} />
                Hub
            </Link>

            <Link href="/ai" className="flex flex-col items-center text-sm">
                <Brain size={22} />
                AI
            </Link>

            <Link href="/music" className="flex flex-col items-center text-sm">
                <MusicNotes size={22} />
                Music
            </Link>

        </div>
    );
}