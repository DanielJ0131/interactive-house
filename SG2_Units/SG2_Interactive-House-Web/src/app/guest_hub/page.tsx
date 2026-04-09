"use client";

import type { ReactNode } from "react";
import { PageShell } from "@/components/pageShell";
import Link from "next/link";
import {
  Bell,
  Cloud,
  DoorOpen,
  Lightbulb,
  Square,
  ToggleLeft,
  Waves,
  PersonSimpleRun,
  Warning,
  Link as LinkIcon,
  CaretLeft,
} from "@phosphor-icons/react";

/* --- GLASS-STYLE INFO ROW --- */
function InfoRow({
  label,
  sub,
  icon,
}: {
  label: string;
  sub?: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-3xl bg-white/5 backdrop-blur-md border border-white/10 p-5 flex items-center justify-between transition-all">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center text-white">
          {icon}
        </div>

        <div>
          <p className="text-lg font-semibold text-white">{label}</p>
          {sub ? <p className="text-white/40 text-sm">Pin {sub}</p> : null}
        </div>
      </div>
      {/* Guest view usually has a "Read Only" or status badge instead of a toggle */}
      <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-white/40 uppercase tracking-widest">
        Guest View
      </div>
    </div>
  );
}

/* --- GLASS-STYLE SLIDER CARD --- */
function SliderInfoCard({
  title,
  pin,
  icon,
  value,
}: {
  title: string;
  pin: string;
  icon: ReactNode;
  value: number;
}) {
  return (
    <div className="rounded-3xl bg-white/5 backdrop-blur-md border border-white/10 p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-[#0EA5E9]/20 flex items-center justify-center text-[#0EA5E9]">
            {icon}
          </div>

          <div>
            <p className="text-lg font-semibold text-white">{title}</p>
            <p className="text-white/40 text-sm">Pin {pin}</p>
          </div>
        </div>

        <div className="rounded-xl bg-white/10 border border-white/10 px-3 py-1 text-sm font-mono text-[#0EA5E9]">
          {value}%
        </div>
      </div>

      <div className="mt-6 h-2 w-full rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-[#0EA5E9] shadow-[0_0_15px_rgba(14,165,233,0.5)]"
          style={{ width: `${value}%` }}
        />
      </div>

      <div className="mt-3 flex justify-between text-[10px] uppercase tracking-tighter text-white/30 font-bold">
        <span>Min Power</span>
        <span>Max Power</span>
      </div>
    </div>
  );
}

/* --- MAIN GUEST HUB --- */
export default function GuestHubPage() {
  // Static values for guest demonstration
  const motionDetected = false;
  const yellowLed = 45; // Demo value
  const fanValue = 0;

  return (
    <main className="min-h-screen bg-transparent">
      <div className="p-5">
        {/* This now uses the Next.js Link component correctly */}
        <Link href="/" className="group flex items-center gap-2 w-fit px-4 py-2 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md text-white/80 font-bold text-sm hover:bg-white/10 transition-all shadow-xl">
          <CaretLeft size={18} weight="bold" className="group-hover:-translate-x-1 transition-transform" />
          BACK TO HOME
        </Link>
      </div>
      <PageShell title="Guest Hub" subtitle="Read-Only Interface">
        <div className="space-y-5">

          <h2 className="text-[10px] tracking-[0.4em] text-[#0EA5E9] font-bold mt-4 mb-6 uppercase">
            Actuators
          </h2>

          <InfoRow
            label="Servo 1 (Door)"
            sub="D9"
            icon={<DoorOpen size={24} weight="fill" />}
          />

          <InfoRow
            label="Servo 2 (Window)"
            sub="D10"
            icon={<Square size={24} weight="fill" />}
          />

          <InfoRow
            label="Relay Module"
            sub="D12"
            icon={<ToggleLeft size={24} weight="fill" />}
          />

          <InfoRow
            label="White LED"
            sub="D13"
            icon={<Lightbulb size={24} weight="fill" />}
          />

          <SliderInfoCard
            title="Yellow LED Module"
            pin="D5"
            icon={<Lightbulb size={24} weight="fill" />}
            value={yellowLed}
          />

          <SliderInfoCard
            title="Fan Module"
            pin="D7/D6"
            icon={<Waves size={24} weight="fill" />}
            value={fanValue}
          />

          <InfoRow
            label="Buzzer (Alarm)"
            sub="D3"
            icon={<Bell size={24} weight="fill" />}
          />

          <h2 className="text-[10px] tracking-[0.4em] text-purple-400 font-bold mt-12 mb-6 uppercase">
            Sensors
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Motion Sensor Card */}
            <div className="rounded-3xl bg-white/5 backdrop-blur-md border border-white/10 p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                  <PersonSimpleRun size={24} weight="fill" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-white">Motion Sensor</p>
                  <p className="text-white/40 text-sm">Pin D2</p>
                </div>
              </div>
              <div className={`mt-4 inline-block px-3 py-1 rounded-lg text-xs font-bold ${motionDetected ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                {motionDetected ? "• MOTION DETECTED" : "• SYSTEM CLEAR"}
              </div>
            </div>

            {/* Gas/Steam Card (Using your style) */}
            <div className="rounded-3xl bg-white/5 backdrop-blur-md border border-white/10 p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-400">
                  <Warning size={24} weight="fill" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-white">Gas Detector</p>
                  <p className="text-white/40 text-sm">Analog A0</p>
                </div>
              </div>
              <p className="mt-4 text-white/50 text-xs leading-relaxed">
                Automated safety monitor. Will trigger alarm if values exceed threshold.
              </p>
            </div>
          </div>
        </div>
      </PageShell>
    </main>
  );
}