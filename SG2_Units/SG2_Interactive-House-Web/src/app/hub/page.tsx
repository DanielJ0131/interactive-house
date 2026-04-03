"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/utils/firebaseConfig";

import TopHeader from "@/components/TopHeader";
import { PageShell } from "@/components/pageShell";
import {
    Lightbulb,
    Door,
    Wind,
    Fan,
    PersonSimpleRun,
    Cloud,
    Warning,
    ArrowsClockwise,
    MicrophoneStage,
    CaretRight
} from "@phosphor-icons/react";

function VoiceTile() {
    return (
        <Link href="/voice" className="block group mb-8">
            <div className="rounded-3xl bg-white/5 backdrop-blur-md border border-white/10 p-5 flex items-center justify-between hover:bg-white/10 transition-all border-l-4 border-l-[#0EA5E9] shadow-xl">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-[#0EA5E9]/20 flex items-center justify-center text-[#0EA5E9] group-hover:scale-110 transition-transform">
                        <MicrophoneStage size={28} weight="fill" />
                    </div>
                    <div>
                        <p className="text-lg font-semibold text-white">Voice Control</p>
                        <p className="text-white/40 text-[10px] tracking-[0.2em] uppercase font-bold">Open Assistant</p>
                    </div>
                </div>
                <CaretRight size={20} className="text-white/20 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </div>
        </Link>
    );
}



function DeviceCard({
    icon,
    title,
    pin,
    state,
    onToggle,
}: {
    icon: React.ReactNode;
    title: string;
    pin: string;
    state: string;
    onToggle?: () => void;
}) {
    const isActive = state === "ON" || state === "OPEN";
    return (
        <div className="rounded-3xl bg-white/5 backdrop-blur-md border border-white/10 p-5 flex items-center justify-between transition-all">
            <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center text-white">
                    {icon}
                </div>
                <div>
                    <p className="text-lg font-semibold text-white">{title}</p>
                    <p className="text-white/40 text-sm font-mono">PIN {pin}</p>
                </div>
            </div>
            <button
                onClick={onToggle}
                className={`px-6 py-2 rounded-full text-xs font-black tracking-widest transition-all ${isActive
                        ? "bg-[#0EA5E9] text-black shadow-lg shadow-[#0EA5E9]/30 scale-105"
                        : "bg-white/10 text-white/40 hover:bg-white/20"
                    }`}
            >
                {state}
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
    const [fanINA, setFanINA] = useState(false);
    const [fanINB, setFanINB] = useState(false);
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
            setFanINA(data.fan_INA?.state === "on");
            setFanINB(data.fan_INB?.state === "on");
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
    const toggleFanINA = async () => await updateDoc(deviceRef, { "fan_INA.state": fanINA ? "off" : "on" });
    const toggleFanINB = async () => await updateDoc(deviceRef, { "fan_INB.state": fanINB ? "off" : "on" });
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

                <h2 className="text-[10px] tracking-[0.4em] text-[#0EA5E9] font-black mt-4 mb-6 uppercase opacity-80">
                    Actuators
                </h2>

                <div className="grid grid-cols-1 gap-4">
                    <DeviceCard title="White Light" pin="13" icon={<Lightbulb size={24} weight="fill" />} state={whiteLight ? "ON" : "OFF"} onToggle={toggleLight} />
                    <DeviceCard title="Fan INA" pin="7" icon={<Fan size={24} weight="fill" />} state={fanINA ? "ON" : "OFF"} onToggle={toggleFanINA} />
                    <DeviceCard title="Fan INB" pin="6" icon={<Fan size={24} weight="fill" />} state={fanINB ? "ON" : "OFF"} onToggle={toggleFanINB} />
                    <DeviceCard title="Door" pin="9" icon={<Door size={24} weight="fill" />} state={door ? "OPEN" : "CLOSED"} onToggle={toggleDoor} />
                    <DeviceCard title="Window" pin="10" icon={<Wind size={24} weight="fill" />} state={windowState ? "OPEN" : "CLOSED"} onToggle={toggleWindow} />

                    <SliderCard title="Yellow LED" pin="5" icon={<Lightbulb size={24} weight="fill" />} value={yellowLed} onChange={handleYellowLedChange} />

                    <DeviceCard title="Buzzer" pin="3" icon={<Cloud size={24} weight="fill" />} state={buzzer ? "ON" : "OFF"} onToggle={toggleBuzzer} />
                </div>

                <h2 className="text-[10px] tracking-[0.4em] text-purple-400 font-black mt-12 mb-6 uppercase opacity-80">
                    Sensors
                </h2>

                <div className="grid grid-cols-2 gap-4">
                    <SensorCard title="Motion" value={motion} icon={<PersonSimpleRun size={22} />} />
                    <SensorCard title="Steam" value={steam} icon={<Cloud size={22} />} />
                    <SensorCard title="Gas" value={gas} icon={<Warning size={22} />} />
                </div>

                <div className="mt-12 rounded-3xl bg-white/5 border border-white/10 p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <ArrowsClockwise size={22} className="text-emerald-400" />
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