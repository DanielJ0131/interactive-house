"use client";

import Link from "next/link";

import Icon from '@mdi/react';
import { mdiHomeOutline } from '@mdi/js';


export default function Home() {
  return (
    <div className="min-h-screen bg-transparent text-white">
      {/* Background Blurs */}
      <div className="pointer-events-none fixed inset-0 opacity-60">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[#0EA5E9]/10 blur-3xl" />
        <div className="absolute top-40 -left-40 h-[520px] w-[520px] rounded-full bg-[#7C3AED]/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-6 pb-10 pt-12">

        {/* --- LOGO SECTION --- */}
        <div className="mx-auto mt-16 flex h-24 w-24 items-center justify-center rounded-3xl bg-white/5 shadow-xl border border-white/10 overflow-hidden backdrop-blur-sm">
          {/* 2. The Icon Logo */}
          <Icon path={mdiHomeOutline} size={3} />
        </div>

        {/* --- TEXT CONTENT --- */}
        <h1 className="mt-8 text-center text-4xl font-extrabold tracking-tight uppercase">
          INTERACTIVE SMART HOUSE
        </h1>

        <p className="mt-3 text-center text-lg text-white/45">
          By Group 4 Software Engineering <br /> HKR.
        </p>

        {/* --- BUTTONS --- */}
        <div className="mt-auto space-y-4">
          <Link
            href="/auth/login"
            className="block w-full rounded-2xl bg-[#12B3FF] py-4 text-center text-lg font-semibold shadow-lg shadow-[#12B3FF]/20 transition-transform active:scale-95"
          >
            Get Started
          </Link>

          <Link
            href="/guest_hub"
            className="block w-full text-center text-white/45 hover:text-white transition-colors"
          >
            Explore as Guest →
          </Link>

          <div className="pt-10 text-center text-xs tracking-[0.5em] text-white/20">
            INTERACTIVE HOUSE
          </div>
        </div>
      </div>
    </div>
  );
}