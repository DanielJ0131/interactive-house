"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brain, Microphone, House, Database } from "@phosphor-icons/react";

export default function TopHeader() {
    const pathname = usePathname();

    const nav = [
        { name: "Hub", icon: House, href: "/hub" },
        { name: "AI", icon: Brain, href: "/ai" },
        { name: "Speech", icon: Microphone, href: "/voice" },
        { name: "Database", icon: Database, href: "/database" },
    ];

    return (
        <header className="w-full border-b border-white/10 bg-[#070F2B]">
            <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-4">

                <div className="text-white font-bold text-lg tracking-wide">
                    Interactive House
                </div>

                <nav className="flex items-center gap-6">
                    {nav.map((item) => {
                        const Icon = item.icon;
                        const active = pathname === item.href;

                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex items-center gap-2 text-sm transition
                ${active
                                        ? "text-[#0EA5E9]"
                                        : "text-white/70 hover:text-[#0EA5E9]"
                                    }`}
                            >
                                <Icon size={20} />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </header>
    );
}