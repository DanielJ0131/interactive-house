"use client";

import AppShell from "@/components/AppShell";
import DeviceCard from "@/components/DeviceCard";
import { DoorOpen, Square, Flame, ToggleLeft, Lightbulb, Monitor, Sun, Droplets, Waves, Bell, Hand } from "lucide-react";

const devices = [
    { name: "Servo 1 (Door)", pin: "D9", icon: <DoorOpen className="text-[var(--color-accent)]" /> },
    { name: "Servo 2 (Window)", pin: "D10", icon: <Square className="text-[var(--color-accent)]" /> },
    { name: "MQ-2 Gas Sensor", pin: "D11/A0", icon: <Flame className="text-[var(--color-accent)]" /> },
    { name: "Relay Module", pin: "D12", icon: <ToggleLeft className="text-[var(--color-accent)]" /> },
    { name: "White LED", pin: "D13", icon: <Lightbulb className="text-[var(--color-accent)]" /> },
    { name: "LCD1602 Display", pin: "I2C (SDA/SCL)", icon: <Monitor className="text-[var(--color-accent)]" /> },
    { name: "Photocell Sensor", pin: "A1", icon: <Sun className="text-[var(--color-accent)]" /> },
    { name: "Soil Humidity Sensor", pin: "A2", icon: <Droplets className="text-[var(--color-accent)]" /> },
    { name: "PIR Motion Sensor", pin: "D2", icon: <Waves className="text-[var(--color-accent)]" /> },
    { name: "Passive Buzzer", pin: "D3", icon: <Bell className="text-[var(--color-accent)]" /> },
    { name: "Button Sensor 1", pin: "D4", icon: <Hand className="text-[var(--color-accent)]" /> },
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