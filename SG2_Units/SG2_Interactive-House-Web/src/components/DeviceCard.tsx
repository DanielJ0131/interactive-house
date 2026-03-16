"use client";

import { ReactNode } from "react";

export default function DeviceCard({
    name,
    pin,
    icon,
}: {
    name: string;
    pin: string;
    icon: ReactNode;
}) {
    return (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl backdrop-blur-xl">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 border border-white/10">
                {icon}
            </div>
            <div className="mt-4">
                <p className="text-lg font-semibold">{name}</p>
                <p className="text-white/35">Pin: {pin}</p>
            </div>
        </div>
    );
}