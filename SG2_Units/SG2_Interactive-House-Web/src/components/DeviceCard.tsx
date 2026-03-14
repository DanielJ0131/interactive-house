"use client";

import { Device } from "@/lib/types";

export function DeviceCard({
    device,
    children,
}: {
    device: Device;
    children: React.ReactNode;
}) {
    return (
        <div className="rounded-2xl border border-white/10 bg-[#0A122B] p-5 shadow-lg">

            {/* Header */}
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="text-lg font-semibold text-white">
                        {device.name}
                    </div>

                    <div className="text-xs text-white/50">
                        Type: {device.type} | Status:{" "}
                        {device.online ? (
                            <span className="text-emerald-400">Online</span>
                        ) : (
                            <span className="text-red-400">Offline</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="mt-4">{children}</div>
        </div>
    );
}