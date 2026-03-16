"use client";

import TopHeader from "@/components/TopHeader";
import { PageShell } from "@/components/pageShell";

import { useState, useEffect } from "react";

import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

import { db, auth } from "@/utils/firebaseConfig";
import Link from "next/link";


import {
    Lightbulb,
    Door,
    Wind,
    Fan,
    PersonSimpleRun,
    Cloud,
    Warning,
    Microphone,
    ArrowsClockwise,
} from "@phosphor-icons/react";
import { Speech } from "lucide-react";


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
    return (
        <div className="rounded-3xl bg-[#0A122B] border border-white/5 p-5 flex items-center justify-between">

            <div className="flex items-center gap-4">

                <div className="h-12 w-12 rounded-2xl bg-[#0B1636] flex items-center justify-center">
                    {icon}
                </div>

                <div>
                    <p className="text-lg font-semibold">{title}</p>
                    <p className="text-white/40 text-sm">Pin {pin}</p>
                </div>

            </div>

            <button
                onClick={onToggle}
                className="px-4 py-1 rounded-full bg-white/10 text-sm"
            >
                {state}
            </button>

        </div>
    );
}


function SensorCard({
    title,
    value,
    icon,
    alert,
}: {
    title: string;
    value: number;
    icon: React.ReactNode;
    alert?: boolean;
}) {
    return (
        <div
            className={`rounded-3xl border p-6 ${alert
                ? "bg-red-900/30 border-red-500/30"
                : "bg-[#0A122B] border-white/5"
                }`}
        >
            <div className="flex items-center gap-3">

                <div className="h-10 w-10 rounded-xl bg-[#0B1636] flex items-center justify-center">
                    {icon}
                </div>

                <p className="text-lg font-semibold">{title}</p>

            </div>

            <p className="text-white/50 mt-2">Raw: {value}</p>

            {alert && (
                <div className="mt-3 text-xs bg-red-500/30 px-3 py-1 rounded-full inline-block">
                    DETECTED
                </div>
            )}
        </div>
    );
}



function SyncCard({
    source,
    time,
}: {
    source: string;
    time: string;
}) {
    return (
        <div className="rounded-3xl bg-[#0A122B] border border-white/5 p-6">

            <div className="flex items-center gap-3">
                <ArrowsClockwise size={22} className="text-emerald-400" />
                <p className="text-lg font-semibold">Arduino Sync</p>
            </div>

            <div className="mt-4 text-sm text-white/50">
                LAST SOURCE
            </div>

            <div className="font-medium">
                {source}
            </div>

            <div className="mt-4 text-sm text-white/50">
                LAST UPDATED
            </div>

            <div className="font-medium">
                {time}
            </div>

        </div>
    );
}


export default function HubPage() {
    const deviceRef = doc(db, "devices", "arduino");

    const [username, setUsername] = useState("Home");

    const [whiteLight, setWhiteLight] = useState(false);
    const [OrangeLight, setOrangeLight] = useState(false);
    const [door, setDoor] = useState(false);
    const [windowState, setWindowState] = useState(false);
    const [fanINA, setFanINA] = useState(false);
    const [fanINB, setFanINB] = useState(false);


    const [motion, setMotion] = useState(0);
    const [steam, setSteam] = useState(0);
    const [gas, setGas] = useState(0);

    const [syncSource, setSyncSource] = useState("arduino");
    const [syncTime, setSyncTime] = useState("");



    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (user) => {
            if (user?.email) {
                const name = user.email.split("@")[0];
                setUsername(name);
            }
        });

        return () => unsub();
    }, []);


    useEffect(() => {
        const unsub = onSnapshot(deviceRef, (snap) => {
            const data = snap.data();
            if (!data) return;

            setWhiteLight(data.white_light?.state === "on");
            setDoor(data.door?.state === "open");
            setWindowState(data.window?.state === "open");
            setFanINA(data.fan_INA?.state === "on");
            setFanINB(data.fan_INB?.state === "on");

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

    const toggleLight = async () => {
        const newState = !whiteLight;
        setWhiteLight(newState);

        await updateDoc(deviceRef, {
            "white_light.state": newState ? "on" : "off",
        });
    };

    const toggleOrangeLight = async () => {
        const newState = !OrangeLight;
        setOrangeLight(newState);
        await updateDoc(deviceRef, {
            "orange_light.state": newState ? "on" : "off",
        });
    };

    const toggleDoor = async () => {
        const newState = !door;
        setDoor(newState);

        await updateDoc(deviceRef, {
            "door.state": newState ? "open" : "closed",
        });
    };

    const toggleWindow = async () => {
        const newState = !windowState;
        setWindowState(newState);

        await updateDoc(deviceRef, {
            "window.state": newState ? "open" : "closed",
        });
    };

    const toggleFanINA = async () => {
        const newState = !fanINA;
        setFanINA(newState);

        await updateDoc(deviceRef, {
            "fan_INA.state": newState ? "on" : "off",
        });
    };

    const toggleFanINB = async () => {
        const newState = !fanINB;
        setFanINB(newState);
        await updateDoc(deviceRef, {
            "fan_INB.state": newState ? "on" : "off",
        });
    };


    return (
        <>
            <TopHeader />

            <PageShell
                title={`${username}'s Home`}
                subtitle="Live Hardware Control"
            >

                {/* ACTUATORS */}

                <h2 className="text-sm tracking-[0.35em] text-[#0EA5E9] font-semibold mb-4">
                    ACTUATORS
                </h2>

                <div className="space-y-4">

                    <DeviceCard
                        title="White Light"
                        pin="13"
                        icon={<Lightbulb size={22} />}
                        state={whiteLight ? "ON" : "OFF"}
                        onToggle={toggleLight}
                    />
                    <DeviceCard
                        title="Orange Light"
                        pin="8"
                        icon={<Lightbulb size={22} />}
                        state={OrangeLight ? "ON" : "OFF"}
                        onToggle={toggleOrangeLight}
                    />

                    <DeviceCard
                        title="Fan INA"
                        pin="7"
                        icon={<Fan size={22} />}
                        state={fanINA ? "ON" : "OFF"}
                        onToggle={toggleFanINA}
                    />
                    <DeviceCard
                        title="Fan INB"
                        pin="6"
                        icon={<Fan size={22} />}
                        state={fanINB ? "ON" : "OFF"}
                        onToggle={toggleFanINB}
                    />

                    <DeviceCard
                        title="Door"
                        pin="9"
                        icon={<Door size={22} />}
                        state={door ? "OPEN" : "CLOSED"}
                        onToggle={toggleDoor}
                    />

                    <DeviceCard
                        title="Window"
                        pin="10"
                        icon={<Wind size={22} />}
                        state={windowState ? "OPEN" : "CLOSED"}
                        onToggle={toggleWindow}
                    />

                </div>

                {/* SENSORS */}

                <h2 className="text-sm tracking-[0.35em] text-purple-300 font-semibold mt-10 mb-4">
                    SENSORS
                </h2>

                <div className="grid grid-cols-2 gap-4">

                    <SensorCard
                        title="Motion"
                        value={motion}
                        icon={<PersonSimpleRun size={18} />}
                    />

                    <SensorCard
                        title="Steam"
                        value={steam}
                        icon={<Cloud size={18} />}
                    />

                    <SensorCard
                        title="Gas"
                        value={gas}
                        icon={<Warning size={18} />}
                        alert={gas > 0}
                    />

                </div>

                {/* SYNC STATUS */}

                <h2 className="text-sm tracking-[0.35em] text-emerald-300 font-semibold mt-10 mb-4">
                    SYNC STATUS
                </h2>

                <SyncCard
                    source={syncSource}
                    time={syncTime}
                />

            </PageShell>

            {/* Floating Mic Button */}

            <Link
                href="/voice"
                className="fixed bottom-24 right-8 h-16 w-16 rounded-full bg-[#0EA5E9] flex items-center justify-center shadow-xl"
            >
                <Speech size={26} />
            </Link>


        </>
    );
}