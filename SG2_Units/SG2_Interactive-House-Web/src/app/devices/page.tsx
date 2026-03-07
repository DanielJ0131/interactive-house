"use client";

import { useEffect } from "react";

export default function DevicesPage() {
    useEffect(() => {
        const sp = new URLSearchParams(window.location.search);
        const isGuest = sp.get("guest") === "1";
        if (isGuest) localStorage.setItem("guest", "1");
    }, []);

    return (
        <main className="min-h-screen bg-[#0A122B] p-6">
            <h1 className="text-3xl font-bold text-white">Devices</h1>
            <p className="text-white/60 mt-2">Smart devices should be shown here.</p>
        </main>
    );
}