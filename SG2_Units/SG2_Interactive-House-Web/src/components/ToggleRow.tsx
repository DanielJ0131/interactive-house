"use client";

import { ReactNode } from "react";

export default function ToggleRow({
    label,
    sub,
    icon,
    value,
    onChange,
}: {
    label: string;
    sub?: string;
    icon: ReactNode;
    value: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl backdrop-blur-xl flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                    {icon}
                </div>
                <div>
                    <p className="text-lg font-semibold">{label}</p>
                    {sub ? <p className="text-white/35">{sub}</p> : null}
                </div>
            </div>

            <button
                onClick={() => onChange(!value)}
                className={`h-9 w-16 rounded-full border transition ${value ? "bg-[#12B3FF] border-[#12B3FF]" : "bg-white/10 border-white/10"
                    }`}
                aria-label={`toggle ${label}`}
            >
                <div
                    className={`h-8 w-8 rounded-full bg-white transition ${value ? "translate-x-7" : "translate-x-1"
                        }`}
                />
            </button>
        </div>
    );
}
