"use client";

import TopHeader from "@/components/TopHeader";
import type { ReactNode } from "react";
import { PageShell } from "@/components/pageShell";
import {
  Bell,
  DoorOpen,
  Lightbulb,
  Square,
  ToggleLeft,
  Waves,
} from "@phosphor-icons/react";

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
    </div>
  );
}

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
          {value}%
        </div>
      </div>

      <div className="mt-6 h-3 w-full rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-lime-400"
          style={{ width: `${value}%` }}
        />
      </div>

      <div className="mt-2 flex justify-between text-xs text-white/40">
        <span>0%</span>
        <span>100%</span>
      </div>
    </div>
  );
}

export default function GuestHubPage() {
  const motionDetected = false;
  const yellowLed = 0;
  const fan = 0;

  return (
    <>
      <TopHeader />

      <PageShell title="Device Hub" subtitle="Smart Control Interface">
        <div className="space-y-5">
          <h2 className="text-sm tracking-[0.35em] text-[#0EA5E9] font-semibold">
            ACTUATORS
          </h2>

          <InfoRow
            label="Servo 1 (Door)"
            sub="D9"
            icon={<DoorOpen className="text-[#0EA5E9]" size={22} />}
          />

          <InfoRow
            label="Servo 2 (Window)"
            sub="D10"
            icon={<Square className="text-[#0EA5E9]" size={22} />}
          />

          <InfoRow
            label="Relay Module"
            sub="D12"
            icon={<ToggleLeft className="text-[#0EA5E9]" size={22} />}
          />

          <InfoRow
            label="White LED"
            sub="D13"
            icon={<Lightbulb className="text-[#0EA5E9]" size={22} />}
          />

          <SliderInfoCard
            title="Yellow LED Module"
            pin="D5"
            icon={<Lightbulb className="text-[#FACC15]" size={22} />}
            value={yellowLed}
          />

          <SliderInfoCard
            title="Fan Module"
            pin="D7/D6"
            icon={<Waves className="text-[#0EA5E9]" size={22} />}
            value={fan}
          />

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