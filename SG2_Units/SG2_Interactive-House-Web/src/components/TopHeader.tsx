"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Brain, Microphone, House } from "@phosphor-icons/react";
import { signOut } from "firebase/auth";
import { auth } from "@/utils/firebaseConfig";

export default function TopHeader() {
    const pathname = usePathname();
    const router = useRouter();

    const nav = [
        { name: "Hub", icon: House, href: "/hub" },
        { name: "AI", icon: Brain, href: "/ai" },
        { name: "Music", icon: Microphone, href: "/music" },
    ];

    const handleLogout = async () => {
        await signOut(auth);

        document.cookie = "auth_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        window.location.href = "/auth/login";
    };

return (
    <header className="w-full border-b border-white/10 bg-[#000000]/50 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-4">

            <div className="text-white font-bold text-lg tracking-wide">
                Interactive House
            </div>

            <div className="flex items-center gap-8">
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
                                        ? "text-[var(--color-accent)]"
                                        : "text-white/70 hover:text-[var(--color-accent)]"
                                    }`}
                            >
                                <Icon size={20} />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                <div className="flex items-center gap-3"> 
                    {/* Top-right action area for actions, logout and emergency, to seperate nav from actions */} 
                    

                    <button
                        onClick={handleLogout}
                        className="text-sm text-red-400 hover:text-red-300"
                    >
                        Logout
                    </button>
                </div>
            </div>
        </div>
    </header>
);
}