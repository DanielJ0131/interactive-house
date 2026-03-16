"use client";

import AppShell from "@/components/AppShell";
import DeviceCard from "@/components/DeviceCard";
import { DoorOpen, Square, Flame, ToggleLeft, Lightbulb, Monitor, Sun, Droplets, Waves, Bell, Hand } from "lucide-react";

const devices = [
    { name: "Servo 1 (Door)", pin: "D9", icon: <DoorOpen className="text-[#12B3FF]" /> },
    { name: "Servo 2 (Window)", pin: "D10", icon: <Square className="text-[#12B3FF]" /> },
    { name: "MQ-2 Gas Sensor", pin: "D11/A0", icon: <Flame className="text-[#12B3FF]" /> },
    { name: "Relay Module", pin: "D12", icon: <ToggleLeft className="text-[#12B3FF]" /> },
    { name: "White LED", pin: "D13", icon: <Lightbulb className="text-[#12B3FF]" /> },
    { name: "LCD1602 Display", pin: "I2C (SDA/SCL)", icon: <Monitor className="text-[#12B3FF]" /> },
    { name: "Photocell Sensor", pin: "A1", icon: <Sun className="text-[#12B3FF]" /> },
    { name: "Soil Humidity Sensor", pin: "A2", icon: <Droplets className="text-[#12B3FF]" /> },
    { name: "PIR Motion Sensor", pin: "D2", icon: <Waves className="text-[#12B3FF]" /> },
    { name: "Passive Buzzer", pin: "D3", icon: <Bell className="text-[#12B3FF]" /> },
    { name: "Button Sensor 1", pin: "D4", icon: <Hand className="text-[#12B3FF]" /> },
];

export default function DevicesPage() {
    return (
        <AppShell title="Devices" subtitle="Smart House Components">
            <div className="grid grid-cols-2 gap-4">
                {devices.map((d) => (
                    <DeviceCard key={d.name} name={d.name} pin={d.pin} icon={d.icon} />
                ))}
            </div>
        </AppShell>
    );
}
