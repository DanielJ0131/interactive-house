"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-14">
      {/* Animated background blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-28 -left-28 h-[420px] w-[420px] rounded-full bg-indigo-500/30 blur-3xl"
          style={{ animation: "glow 6s ease-in-out infinite" }}
        />
        <div
          className="absolute top-24 -right-28 h-[460px] w-[460px] rounded-full bg-pink-500/25 blur-3xl"
          style={{ animation: "glow 7.5s ease-in-out infinite" }}
        />
        <div
          className="absolute -bottom-40 left-1/3 h-[520px] w-[520px] rounded-full bg-emerald-500/20 blur-3xl"
          style={{ animation: "glow 8.5s ease-in-out infinite" }}
        />

        {/* subtle grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:52px_52px] opacity-[0.10]" />
      </div>

      {/* Content */}
      <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-10">
        {/* Top badge */}
    

        {/* Logo + title */}
        <div className="text-center">
          <div
            className="mx-auto mb-5 flex h-[140px] w-[140px] items-center justify-center rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl"
            style={{ animation: "floaty 4.2s ease-in-out infinite" }}
          >
            <Image
              src="/logo.png"
              alt="Smart Home Logo"
              width={140}
              height={140}
              className="drop-shadow-[0_0_35px_rgba(99,102,241,0.55)]"
              priority
            />
          </div>

          <h1 className="text-5xl font-extrabold tracking-tight">
            Smart Home
          </h1>
          <p className="mt-3 text-sm text-white/70">
            Control zones • devices • realtime updates • voice commands
          </p>
        </div>

        {/* Glass login card */}
        <div className="w-full max-w-md">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
            {/* inner glow */}
            <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-white/10" />
            <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-pink-500/15 blur-3xl" />

            <div className="relative space-y-4">
              <div>
                <label className="text-sm font-medium text-white/80">
                  Email
                </label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-white/20 focus:bg-white/10"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-white/80">
                  Password
                </label>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-white/20 focus:bg-white/10"
                  placeholder="••••••••"
                />
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  className="group relative overflow-hidden rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black shadow hover:bg-white/90"
                  onClick={() => alert("Login: connect Supabase later")}
                >
                  <span className="relative z-10">Login</span>
                  <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-indigo-300/70 via-pink-300/70 to-emerald-300/70 transition group-hover:translate-x-0" />
                </button>

                <button
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/90 hover:bg-white/10"
                  onClick={() => alert("Sign up: connect Supabase later")}
                >
                  Sign up
                </button>
              </div>

              {/* Demo link */}
              <div className="pt-3 text-center">
                <Link
                  className="text-sm text-white/70 underline underline-offset-4 hover:text-white"
                  href="/home"
                >
                  Continue to Home
                </Link>
              </div>

              {/* tiny footer */}
              <div className="pt-2 text-center text-xs text-white/40">
                Built for comfortable and safe life at home. © 2026 Smart Home Inc.
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
