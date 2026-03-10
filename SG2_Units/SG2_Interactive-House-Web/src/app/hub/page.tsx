"use client";

import TopHeader from "@/components/TopHeader";
import { useState, type ReactNode } from "react";
import { PageShell } from "@/components/pageShell";
import {
    Bell,
    DoorOpen,
    Lightbulb,
    Square,
    ToggleLeft,
    Waves,
} from "@phosphor-icons/react";

function ToggleRow({
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
        <div className="rounded-3xl bg-[#0A122B] border border-white/5 p-5 shadow-xl flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-[#0B1636] flex items-center justify-center">
                    {icon}
                </div>

                <div>
                    <p className="text-lg font-semibold">{label}</p>
                    {sub ? <p className="text-white/45">{sub}</p> : null}
                </div>
            </div>

            <button
                type="button"
                onClick={() => onChange(!value)}
                className={`h-9 w-16 rounded-full border transition ${value
                        ? "bg-[#0EA5E9] border-[#0EA5E9]"
                        : "bg-white/10 border-white/10"
                    }`}
                aria-label={`toggle ${label}`}
            >
                <div
                    className={`h-8 w-8 rounded-full bg-white transition translate-y-[2px] ${value ? "translate-x-7" : "translate-x-1"
                        }`}
                />
            </button>
        </div>
    );
}

function SliderCard({
    title,
    pin,
    icon,
    value,
    setValue,
    badge,
}: {
    title: string;
    pin: string;
    icon: ReactNode;
    value: number;
    setValue: (v: number) => void;
    badge?: string;
}) {
    return (
        <div className="rounded-3xl bg-[#0A122B] border border-white/5 p-6 shadow-xl">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-[#0B1636] flex items-center justify-center">
                        {icon}
                    </div>

                    <div>
                        <p className="text-lg font-semibold">{title}</p>
                        <p className="text-white/45">{pin}</p>
                    </div>
                </div>

                <div className="rounded-xl bg-[#0B1636] border border-white/10 px-3 py-1 text-sm text-[#0EA5E9]">
                    {badge ?? `${value}%`}
                </div>
            </div>

            <input
                className="mt-6 w-full"
                type="range"
                min={0}
                max={100}
                value={value}
                onChange={(e) => setValue(Number(e.target.value))}
            />

            <div className="mt-2 flex justify-between text-xs text-white/40">
                <span>0%</span>
                <span>100%</span>
            </div>
        </div>
    );
}

export default function HubPage() {
    const [door, setDoor] = useState(false);
    const [windowOpen, setWindowOpen] = useState(false);
    const [relay, setRelay] = useState(false);
    const [whiteLed, setWhiteLed] = useState(false);

    const [yellowLed, setYellowLed] = useState(61);
    const [fan, setFan] = useState(0);

    const gasLevel = 412;
    const gasStatus =
        gasLevel > 550 ? "DANGER" : gasLevel > 350 ? "WARNING" : "SAFE";

    const motionDetected = false;

    return (
        <>
            <TopHeader />

            <PageShell title="Device Hub" subtitle="Smart Control Interface">
                <div className="space-y-5">
                    <h2 className="text-sm tracking-[0.35em] text-[#0EA5E9] font-semibold">
                        ACTUATORS
                    </h2>

                    <ToggleRow
                        label="Servo 1 (Door)"
                        sub="D9"
                        icon={<DoorOpen className="text-[#0EA5E9]" size={22} />}
                        value={door}
                        onChange={setDoor}
                    />

                    <ToggleRow
                        label="Servo 2 (Window)"
                        sub="D10"
                        icon={<Square className="text-[#0EA5E9]" size={22} />}
                        value={windowOpen}
                        onChange={setWindowOpen}
                    />

                    <ToggleRow
                        label="Relay Module"
                        sub="D12"
                        icon={<ToggleLeft className="text-[#0EA5E9]" size={22} />}
                        value={relay}
                        onChange={setRelay}
                    />

                    <ToggleRow
                        label="White LED"
                        sub="D13"
                        icon={<Lightbulb className="text-[#0EA5E9]" size={22} />}
                        value={whiteLed}
                        onChange={setWhiteLed}
                    />

                    <SliderCard
                        title="Yellow LED Module"
                        pin="D5"
                        icon={<Lightbulb className="text-[#FACC15]" size={22} />}
                        value={yellowLed}
                        setValue={setYellowLed}
                    />

                    {/* Fan Control */}
                    <div className="rounded-3xl bg-[#0A122B] border border-white/5 p-6 shadow-xl">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-[#0B1636] flex items-center justify-center">
                                    <Waves className="text-[#0EA5E9]" size={22} />
                                </div>

                                <div>
                                    <p className="text-lg font-semibold">Fan Module</p>
                                    <p className="text-white/45">D7/D6</p>
                                </div>
                            </div>

                            <div className="rounded-xl bg-[#0B1636] border border-white/10 px-3 py-1 text-sm text-[#0EA5E9]">
                                {fan}%
                            </div>
                        </div>

                        <p className="mt-5 text-sm tracking-[0.35em] text-white/35 font-semibold">
                            FAN DYNAMICS
                        </p>

                        <div className="mt-3 grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setFan(0)}
                                className={`rounded-2xl py-4 font-semibold border ${fan === 0
                                        ? "bg-[#0EA5E9] text-[#071022] border-[#0EA5E9]"
                                        : "bg-white/5 border-white/10 text-white/70"
                                    }`}
                            >
                                Off
                            </button>

                            <button
                                type="button"
                                onClick={() => setFan(100)}
                                className={`rounded-2xl py-4 font-semibold border ${fan > 0
                                        ? "bg-[#0EA5E9] text-[#071022] border-[#0EA5E9]"
                                        : "bg-white/5 border-white/10 text-white/70"
                                    }`}
                            >
                                On
                            </button>
                        </div>
                    </div>

                    {/* Sensors */}
                    <h2 className="text-sm tracking-[0.35em] text-purple-300 font-semibold">
                        SENSORS
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="rounded-3xl bg-[#0A122B] border border-white/5 p-6 shadow-xl">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-[#22113A] flex items-center justify-center">
                                    <Waves className="text-purple-300" size={22} />
                                </div>

                                <div>
                                    <p className="text-lg font-semibold">PIR Motion Sensor</p>
                                    <p className="text-white/45">D2</p>
                                </div>
                            </div>

                            <p className="mt-4 text-white/60">
                                Status:{" "}
                                <span className="font-semibold">
                                    {motionDetected ? "Motion Detected" : "No Motion"}
                                </span>
                            </p>
                        </div>

                        <div className="rounded-3xl bg-[#0A122B] border border-white/5 p-6 shadow-xl">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-[#22113A] flex items-center justify-center">
                                    <Bell className="text-purple-300" size={22} />
                                </div>

                                <div>
                                    <p className="text-lg font-semibold">Passive Buzzer</p>
                                    <p className="text-white/45">D3</p>
                                </div>
                            </div>

                            <p className="mt-4 text-white/60">
                                Used for alarms (gas/motion). Controlled automatically or
                                manually.
                            </p>
                        </div>
                    </div>
                </div>
            </PageShell>
        </>
    );
}