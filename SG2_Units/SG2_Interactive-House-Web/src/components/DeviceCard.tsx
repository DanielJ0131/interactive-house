import { Device } from "../lib/types";

export function DeviceCard({
    device,
    children,
}: {
    device: Device;
    children: React.ReactNode;
}) {
    return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">

      {/* Header */}
        <div className="flex items-start justify-between gap-3">
        <div>
            <div className="text-base font-semibold">{device.name}</div>

            <div className="text-xs text-gray-500">
            Type: {device.type} | Status:{" "}
            {device.online ? (
                <span className="text-green-600">Online</span>
            ) : (
                <span className="text-red-600">Offline</span>
            )}
            </div>
        </div>
        </div>

      {/* Controls (buttons/slider etc) */}
        <div className="mt-4">
        {children}
        </div>

    </div>
);
}
