"use client";

import TopHeader from "@/components/TopHeader";
import { PageShell } from "@/components/pageShell";
import { useState, useEffect, ReactNode } from "react";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "@/utils/firebaseConfig";

import {
    Bell,
    DoorOpen,
    Lightbulb,
    Square,
    ToggleLeft,
    Waves,
} from "@phosphor-icons/react";

const deviceRef = doc(db, "devices", "arduino");

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
            >
                <div
                    className={`h-8 w-8 rounded-full bg-white transition translate-y-[2px] ${value ? "translate-x-7" : "translate-x-1"
                        }`}
                />
            </button>
        </div>
    );
}

export default function HubPage() {
    const [door, setDoor] = useState(false);
    const [windowOpen, setWindowOpen] = useState(false);
    const [whiteLed, setWhiteLed] = useState(false);
    const [fan, setFan] = useState(0);

    const [gasLevel, setGasLevel] = useState(0);
    const [motionDetected, setMotionDetected] = useState(false);

    useEffect(() => {
        const unsub = onSnapshot(deviceRef, (snap) => {
            const data = snap.data();
            if (!data) return;

            setDoor(data.door?.state === "open");
            setWindowOpen(data.window?.state === "open");
            setWhiteLed(data.white_light?.state === "on");

            setFan(data.fan_INA?.state === "on" ? 100 : 0);

            setGasLevel(data.telemetry?.gas || 0);
            setMotionDetected(data.telemetry?.motion === 1);
        });

        return () => unsub();
    }, []);

    const toggleDoor = async (v: boolean) => {
        setDoor(v);

        await updateDoc(deviceRef, {
            "door.state": v ? "open" : "closed",
        });
    };

    const toggleWindow = async (v: boolean) => {
        setWindowOpen(v);

        await updateDoc(deviceRef, {
            "window.state": v ? "open" : "closed",
        });
    };

    const toggleLight = async (v: boolean) => {
        setWhiteLed(v);

        await updateDoc(deviceRef, {
            "white_light.state": v ? "on" : "off",
        });
    };

    const toggleFan = async (on: boolean) => {
        setFan(on ? 100 : 0);

        await updateDoc(deviceRef, {
            "fan_INA.state": on ? "on" : "off",
        });
    };

    return (
        <>
            <TopHeader />

            <PageShell title="Device Hub" subtitle="Smart Control Interface">
                <div className="space-y-5">

                    <h2 className="text-sm tracking-[0.35em] text-[#0EA5E9] font-semibold">
                        ACTUATORS
                    </h2>

                    <ToggleRow
                        label="Door"
                        sub="Pin 9"
                        icon={<DoorOpen size={22} className="text-[#0EA5E9]" />}
                        value={door}
                        onChange={toggleDoor}
                    />

                    <ToggleRow
                        label="Window"
                        sub="Pin 10"
                        icon={<Square size={22} className="text-[#0EA5E9]" />}
                        value={windowOpen}
                        onChange={toggleWindow}
                    />

                    <ToggleRow
                        label="White Light"
                        sub="Pin 13"
                        icon={<Lightbulb size={22} className="text-[#0EA5E9]" />}
                        value={whiteLed}
                        onChange={toggleLight}
                    />

                    <div className="rounded-3xl bg-[#0A122B] border border-white/5 p-6 shadow-xl">
                        <div className="flex items-center justify-between">
                            <p className="text-lg font-semibold">Fan Module</p>
                            <span className="text-sm text-[#0EA5E9]">{fan}%</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-4">
                            <button
                                onClick={() => toggleFan(false)}
                                className="rounded-xl bg-white/10 py-3"
                            >
                                Off
                            </button>

                            <button
                                onClick={() => toggleFan(true)}
                                className="rounded-xl bg-[#0EA5E9] py-3 text-[#071022]"
                            >
                                On
                            </button>
                        </div>
                    </div>

                    <h2 className="text-sm tracking-[0.35em] text-purple-300 font-semibold">
                        SENSORS
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

                        <div className="rounded-3xl bg-[#0A122B] border border-white/5 p-6">
                            <p className="text-lg font-semibold">Motion</p>
                            <p className="text-white/60">
                                {motionDetected ? "Motion Detected" : "No Motion"}
                            </p>
                        </div>

                        <div className="rounded-3xl bg-[#0A122B] border border-white/5 p-6">
                            <p className="text-lg font-semibold">Gas</p>
                            <p className="text-white/60">Level: {gasLevel}</p>
                        </div>

                    </div>
                </div>
            </PageShell>
        </>
    );
}