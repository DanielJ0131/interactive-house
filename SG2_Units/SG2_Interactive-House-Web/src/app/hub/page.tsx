"use client";

import React from 'react';
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/utils/firebaseConfig";

import TopHeader from "@/components/TopHeader";
import { PageShell } from "@/components/pageShell";
import Icon from '@mdi/react';
import { mdiLightbulb, mdiDoor, mdiWeatherWindy, mdiFan, mdiRun, mdiCloud, mdiAlert, mdiRefresh, mdiMicrophone, mdiChevronRight } from '@mdi/js';

function VoiceTile() {
    return (
        <Link href="/voice" className="block group mb-8">
            <div className="rounded-3xl bg-white/5 backdrop-blur-md border border-white/10 p-5 flex items-center justify-between hover:bg-white/10 transition-all border-l-4 border-l-[#0EA5E9] shadow-xl">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-[#0EA5E9]/20 flex items-center justify-center text-[#0EA5E9] group-hover:scale-110 transition-transform">
                        <Icon path={mdiMicrophone} size={1.75} />
                    </div>
                    <div>
                        <p className="text-lg font-semibold text-white">Voice Control</p>
                        <p className="text-white/40 text-[10px] tracking-[0.2em] uppercase font-bold">Open Assistant</p>
                    </div>
                </div>
                <Icon path={mdiChevronRight} size={1.25} className="text-white/20 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </div>
        </Link>
    );
}

function EmergencyTile() {
    const router = useRouter();

    return (
        <button
            onClick={() => router.push("/emergency?from=hub")}
            className="w-full block group mb-8"
        >
            <div className="rounded-3xl bg-red-600/20 backdrop-blur-md border border-red-500/30 p-5 flex items-center justify-between hover:bg-red-600/30 transition-all border-l-4 border-l-red-500 shadow-xl">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-red-500/20 flex items-center justify-center text-red-400 group-hover:scale-110 transition-transform">
                        <Icon path={mdiAlert} size={1.75} />
                    </div>
                    <div>
                        <p className="text-lg font-semibold text-white">Emergency Call</p>
                        <p className="text-white/40 text-[10px] tracking-[0.2em] uppercase font-bold">Call 112</p>
                    </div>
                </div>
                <Icon path={mdiChevronRight} size={1.25} className="text-white/20 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </div>
        </button>
    );
}

function DeviceCard({
    icon,
    title,
    pin,
    state,
    onToggle,
    loading = false,
}: {
    icon: string;
    title: string;
    pin: string;
    state: string;
    onToggle?: () => void;
    loading?: boolean;
}) {
    const isActive = state === "ON" || state === "OPEN" || state === "FORWARD" || state === "REVERSE";
    return (
        <div className="rounded-3xl bg-white/5 backdrop-blur-md border border-white/10 p-5 flex items-center justify-between transition-all">
            <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center text-white">
                    <Icon path={icon} size={1.5} className={title.includes("Fan") && isActive ? "animate-spin" : ""} style={title.includes("Fan") && isActive ? {animationDuration: '0.5s'} : {}} />
                </div>
                <div>
                    <p className="text-lg font-semibold text-white">{title}</p>
                    <p className="text-white/40 text-sm font-mono">PIN {pin}</p>
                </div>
            </div>
            <button
                onClick={onToggle}
                disabled={loading}
                className={`px-6 py-2 rounded-full text-xs font-black tracking-widest transition-all ${isActive
                        ? "bg-[#0EA5E9] text-black shadow-lg shadow-[#0EA5E9]/30 scale-105"
                        : "bg-white/10 text-white/40 hover:bg-white/20"
                    } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
                {loading ? "..." : state}
            </button>
        </div>
    );
}

function SliderCard({
    title,
    pin,
    icon,
    value,
    onChange,
}: {
    title: string;
    pin: string;
    icon: React.ReactNode;
    value: number;
    onChange: (val: number) => void;
}) {
    return (
        <div className="rounded-3xl bg-white/5 backdrop-blur-md border border-white/10 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center text-[#FACC15]">
                        {icon}
                    </div>
                    <div>
                        <p className="text-lg font-semibold text-white">{title}</p>
                        <p className="text-white/40 text-sm font-mono">PIN {pin}</p>
                    </div>
                </div>
                <span className="text-[#0EA5E9] font-mono font-bold bg-[#0EA5E9]/10 px-3 py-1 rounded-lg text-xs">
                    {Math.round((value / 255) * 100)}%
                </span>
            </div>
            <input
                type="range"
                min="0"
                max="255"
                value={value}
                onChange={(e) => onChange(parseInt(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#0EA5E9]"
            />
        </div>
    );
}

function SensorCard({ title, value, icon, unit = "" }: { title: string; value: number; icon: React.ReactNode; unit?: string }) {
    return (
        <div className="rounded-3xl bg-white/5 backdrop-blur-md border border-white/10 p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center text-white/70">
                    {icon}
                </div>
                <p className="text-sm font-bold text-white/60 tracking-widest uppercase">{title}</p>
            </div>
            <p className="text-2xl font-mono text-white">{value}<span className="text-xs text-white/30 ml-1">{unit}</span></p>
        </div>
    );
}

/* --- MAIN PAGE --- */

export default function HubPage() {
    const router = useRouter();
    const deviceRef = doc(db, "devices", "arduino");

    const [username, setUsername] = useState("Home");

    // States
    const [whiteLight, setWhiteLight] = useState(false);
    const [door, setDoor] = useState(false);
    const [windowState, setWindowState] = useState(false);
    const [fanState, setFanState] = useState<'off' | 'forward' | 'reverse'>('off');
    const [fanLoading, setFanLoading] = useState(false);
    const [yellowLed, setYellowLed] = useState(0);
    const [buzzer, setBuzzer] = useState(false);

    const [motion, setMotion] = useState(0);
    const [steam, setSteam] = useState(0);
    const [gas, setGas] = useState(0);

    const [syncSource, setSyncSource] = useState("arduino");
    const [syncTime, setSyncTime] = useState("");

    // Auth & Data Listeners
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (user) => {
            if (!user) router.replace("/auth/login");
            else setUsername(user.email?.split("@")[0] || "Home");
        });
        return () => unsub();
    }, [router]);

    useEffect(() => {
        const unsub = onSnapshot(deviceRef, (snap) => {
            const data = snap.data();
            if (!data) return;

            setWhiteLight(data.white_light?.state === "on");
            setDoor(data.door?.state === "open");
            setWindowState(data.window?.state === "open");
            const fanINAOn = data.fan_INA?.state === "on";
            const fanINBOn = data.fan_INB?.state === "on";
            if (fanINAOn && !fanINBOn) setFanState('forward');
            else if (!fanINAOn && fanINBOn) setFanState('reverse');
            else setFanState('off');
            setYellowLed(data.yellow_led?.value ?? 0);
            setBuzzer(data.buzzer?.state === "on");

            setMotion(data.telemetry?.motion ?? 0);
            setSteam(data.telemetry?.steam ?? 0);
            setGas(data.telemetry?.gas ?? 0);

            setSyncSource(data.sync?.lastSource ?? "arduino");
            if (data.sync?.lastUpdatedAt?.seconds) {
                const date = new Date(data.sync.lastUpdatedAt.seconds * 1000);
                setSyncTime(date.toLocaleString());
            }
        });
        return () => unsub();
    }, []);

    // Handlers
    const toggleLight = async () => await updateDoc(deviceRef, { "white_light.state": whiteLight ? "off" : "on" });
    const toggleDoor = async () => await updateDoc(deviceRef, { "door.state": door ? "closed" : "open" });
    const toggleWindow = async () => await updateDoc(deviceRef, { "window.state": windowState ? "closed" : "open" });
    const toggleFan = () => {
        if (fanLoading) return;
        setFanLoading(true);
        let newState: 'off' | 'forward' | 'reverse';
        if (fanState === 'off') newState = 'forward';
        else if (fanState === 'forward') newState = 'reverse';
        else newState = 'off';
        setFanState(newState);
        if (newState === 'forward') {
            updateDoc(deviceRef, { "fan_INA.state": "on", "fan_INB.state": "off" }).then(() => setFanLoading(false));
        } else if (newState === 'reverse') {
            updateDoc(deviceRef, { "fan_INA.state": "off" }).then(() => {
                setTimeout(async () => {
                    await updateDoc(deviceRef, { "fan_INB.state": "on" });
                    setFanLoading(false);
                }, 2000);
            });
        } else {
            updateDoc(deviceRef, { "fan_INA.state": "off", "fan_INB.state": "off" }).then(() => setFanLoading(false));
        }
    };
    const toggleReverse = () => {
        if (fanLoading) return;
        setFanLoading(true);
        
        if (fanState === 'forward') {
            // Currently forward, switch to reverse
            setFanState('reverse');
            updateDoc(deviceRef, { "fan_INA.state": "off" }).then(() => {
                setTimeout(async () => {
                    await updateDoc(deviceRef, { "fan_INB.state": "on" });
                    setFanLoading(false);
                }, 2000);
            });
        } else if (fanState === 'reverse') {
            // Currently reverse, switch to forward
            setFanState('forward');
            updateDoc(deviceRef, { "fan_INB.state": "off" }).then(() => {
                setTimeout(async () => {
                    await updateDoc(deviceRef, { "fan_INA.state": "on" });
                    setFanLoading(false);
                }, 2000);
            });
        }
    };
    const toggleBuzzer = async () => await updateDoc(deviceRef, { "buzzer.state": buzzer ? "off" : "on" });

    const handleYellowLedChange = async (val: number) => {
        setYellowLed(val);
        await updateDoc(deviceRef, { "yellow_led.value": val });
    };

    return (
        <main className="min-h-screen bg-transparent">
<TopHeader />

<PageShell title={`${username}'s Hub`} subtitle="Control Center">

                <VoiceTile />
                <EmergencyTile />

                <h2 className="text-[10px] tracking-[0.4em] text-[#0EA5E9] font-black mt-4 mb-6 uppercase opacity-80">
                    Actuators
                </h2>

                <div className="grid grid-cols-1 gap-4">
                    <DeviceCard title="White Light" pin="13" icon={mdiLightbulb} state={whiteLight ? "ON" : "OFF"} onToggle={toggleLight} />
                    <div className="rounded-3xl bg-white/5 backdrop-blur-md border border-white/10 p-5 flex items-center justify-between transition-all">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center text-white">
                                <Icon path={mdiFan} size={1.5} className={fanState !== 'off' ? "animate-spin" : ""} style={fanState !== 'off' ? {animationDuration: '0.5s'} : {}} />
                            </div>
                            <div>
                                <p className="text-lg font-semibold text-white">Fan</p>
                                <p className="text-white/40 text-sm font-mono">PIN 7/6</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={toggleFan}
                                disabled={fanLoading}
                                className={`px-4 py-2 rounded-full text-xs font-black tracking-widest transition-all ${fanState !== 'off'
                                        ? "bg-[#0EA5E9] text-black shadow-lg shadow-[#0EA5E9]/30 scale-105"
                                        : "bg-white/10 text-white/40 hover:bg-white/20"
                                    } ${fanLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                            >
                                {fanLoading ? "..." : fanState.toUpperCase()}
                            </button>
                            <button
                                onClick={toggleReverse}
                                disabled={fanLoading}
                                className={`px-4 py-2 rounded-full text-xs font-black tracking-widest transition-all bg-purple-500 text-white hover:bg-purple-600 ${fanLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                            >
                                {fanLoading ? "..." : "REVERSE"}
                            </button>
                        </div>
                    </div>
                    <DeviceCard title="Door" pin="9" icon={mdiDoor} state={door ? "OPEN" : "CLOSED"} onToggle={toggleDoor} />
                    <DeviceCard title="Window" pin="10" icon={mdiWeatherWindy} state={windowState ? "OPEN" : "CLOSED"} onToggle={toggleWindow} />

                    <SliderCard title="Yellow LED" pin="5" icon={<Icon path={mdiLightbulb} size={1.5} />} value={yellowLed} onChange={handleYellowLedChange} />

                    <DeviceCard title="Buzzer" pin="3" icon={mdiCloud} state={buzzer ? "ON" : "OFF"} onToggle={toggleBuzzer} />
                </div>

                <h2 className="text-[10px] tracking-[0.4em] text-purple-400 font-black mt-12 mb-6 uppercase opacity-80">
                    Sensors
                </h2>

                <div className="grid grid-cols-2 gap-4">
                    <SensorCard title="Motion" value={motion} icon={<Icon path={mdiRun} size={1.375} />} />
                    <SensorCard title="Steam" value={steam} icon={<Icon path={mdiCloud} size={1.375} />} />
                    <SensorCard title="Gas" value={gas} icon={<Icon path={mdiAlert} size={1.375} />} />
                </div>

                <div className="mt-12 rounded-3xl bg-white/5 border border-white/10 p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Icon path={mdiRefresh} size={1.375} className="text-emerald-400" />
                        <p className="text-sm font-bold text-white tracking-widest uppercase">System Sync</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                            <p className="text-white/30 uppercase tracking-tighter">Controller</p>
                            <p className="text-white font-mono">{syncSource}</p>
                        </div>
                        <div>
                            <p className="text-white/30 uppercase tracking-tighter">Last Seen</p>
                            <p className="text-white font-mono">{syncTime || "Never"}</p>
                        </div>
                    </div>
                </div>
            </PageShell>
        </main>
    );
}