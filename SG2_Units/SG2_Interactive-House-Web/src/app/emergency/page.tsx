"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function EmergencyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");

  const [confirmed, setConfirmed] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [status, setStatus] = useState("Calling emergency services...");
  const audioContextRef = useRef<AudioContext | null>(null);
  const ringingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!confirmed) return;

    const timer = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    const statusTimer = setTimeout(() => {
      setStatus("Connected to emergency operator");
    }, 3000);

    startRinging();

    return () => {
      clearInterval(timer);
      clearTimeout(statusTimer);
      stopRinging();
    };
  }, [confirmed]);

  const goBackToPreviousPage = () => {
    stopRinging();

    if (from === "guest_hub") {
      router.push("/guest_hub");
      return;
    }

    router.push("/hub");
  };

  const startRinging = async () => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (
          window as Window & {
            webkitAudioContext?: typeof AudioContext;
          }
        ).webkitAudioContext;

      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      const playRingTone = () => {
        if (!audioContextRef.current) return;

        const currentCtx = audioContextRef.current;
        const now = currentCtx.currentTime;

        const oscillator1 = currentCtx.createOscillator();
        const oscillator2 = currentCtx.createOscillator();
        const gainNode = currentCtx.createGain();

        oscillator1.type = "sine";
        oscillator2.type = "sine";

        oscillator1.frequency.setValueAtTime(800, now);
        oscillator2.frequency.setValueAtTime(1000, now);

        gainNode.gain.setValueAtTime(0.0001, now);
        gainNode.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.08, now + 0.25);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

        oscillator1.connect(gainNode);
        oscillator2.connect(gainNode);
        gainNode.connect(currentCtx.destination);

        oscillator1.start(now);
        oscillator2.start(now);
        oscillator1.stop(now + 0.42);
        oscillator2.stop(now + 0.42);
      };

      playRingTone();

      ringingIntervalRef.current = setInterval(() => {
        playRingTone();
      }, 1200);
    } catch (error) {
      console.error("Ringtone could not start:", error);
    }
  };

  const stopRinging = () => {
    if (ringingIntervalRef.current) {
      clearInterval(ringingIntervalRef.current);
      ringingIntervalRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  const handleConfirmCall = () => {
    setConfirmed(true);
    setSeconds(0);
    setStatus("Calling emergency services...");
  };

  const handleCancel = () => {
    goBackToPreviousPage();
  };

  const handleEndCall = () => {
    goBackToPreviousPage();
  };

  const formatTime = (value: number) => {
    const mins = Math.floor(value / 60);
    const secs = value % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  if (!confirmed) {
    return (
      <main className="min-h-screen bg-red-700 text-white flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-md rounded-2xl bg-red-800 shadow-2xl p-8 text-center">
          <p className="text-sm uppercase tracking-[0.2em] mb-3">Emergency Confirmation</p>

          <h1 className="text-3xl font-bold mb-4">Emergency Call</h1>

          <p className="text-lg mb-8">
            Are you sure you want to place an emergency call to 112?
          </p>

          <div className="flex flex-col gap-4">
            <button
              onClick={handleConfirmCall}
              className="w-full rounded-full bg-black py-4 text-lg font-semibold hover:opacity-90 transition"
            >
              Confirm Emergency Call
            </button>

            <button
              onClick={handleCancel}
              className="w-full rounded-full border border-white/30 py-4 text-lg font-semibold hover:bg-white/10 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-red-700 text-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl bg-red-800 shadow-2xl p-8 text-center">
        <p className="text-sm uppercase tracking-[0.2em] mb-3">Emergency Call</p>

        <h1 className="text-3xl font-bold mb-4">112</h1>

        <p className="text-lg mb-3">{status}</p>

        <p className="text-4xl font-semibold mb-8">{formatTime(seconds)}</p>

        <button
          onClick={handleEndCall}
          className="w-full rounded-full bg-black py-4 text-lg font-semibold hover:opacity-90 transition"
        >
          End Call
        </button>
      </div>
    </main>
  );
}