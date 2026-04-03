"use client";
import { useEffect, useState, useRef } from "react";
import { PageShell } from "@/components/pageShell";
import { db } from "@/utils/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import Link from "next/link";
import {
    MusicNotes,
    CaretLeft,
    Play,
    Stop
} from "@phosphor-icons/react";

interface Song {
    id: string;
    name: string;
    artist: string;
    frequencies: number[];
}

const SPEEDS = {
    SLOW: 500,
    NORMAL: 300,
    FAST: 150,
};

export default function MusicPage() {
    const [songs, setSongs] = useState<Song[]>([]);
    const [activeSongId, setActiveSongId] = useState<string | null>(null);
    const [currentSpeed, setCurrentSpeed] = useState<number>(SPEEDS.NORMAL);
    const audioCtxRef = useRef<AudioContext | null>(null);

    const stopMusic = () => {
        if (audioCtxRef.current) {
            audioCtxRef.current.close();
            audioCtxRef.current = null;
        }
        setActiveSongId(null);
    };

    const playMusic = async (songId: string, frequencies: number[]) => {
        stopMusic();
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioCtxRef.current = audioCtx;
        setActiveSongId(songId);

        for (const freq of frequencies) {
            if (!audioCtxRef.current) break;
            if (freq > 0) {
                const oscillator = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();
                oscillator.type = "sine";
                oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
                gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.2);
                oscillator.connect(gainNode);
                gainNode.connect(audioCtx.destination);
                oscillator.start();
                oscillator.stop(audioCtx.currentTime + 0.2);
            }
            await new Promise(resolve => setTimeout(resolve, currentSpeed));
        }
        if (audioCtxRef.current === audioCtx) setActiveSongId(null);
    };

    useEffect(() => {
        const fetchMusic = async () => {
            const querySnapshot = await getDocs(collection(db, "music"));
            const musicData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Song[];
            setSongs(musicData);
        };
        fetchMusic();
        return () => stopMusic();
    }, []);

    return (
        <PageShell title="Music" subtitle="Music Control ">
            <div className="max-w-5xl mx-auto p-4 md:p-6">

                {/* TOP NAVIGATION & CONTROLS */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12">
                    <Link
                        href="/hub"
                        className="group flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md text-white/80 font-bold text-sm hover:bg-white/10 transition-all shadow-xl"
                    >
                        <CaretLeft size={18} weight="bold" className="group-hover:-translate-x-1 transition-transform" />
                        Back to hub
                    </Link>

                    {/* SPEED SELECTOR - HUB STYLE */}
                    <div className="flex bg-black/20 p-1.5 rounded-2xl border border-white/5 backdrop-blur-lg">
                        {Object.entries(SPEEDS).map(([label, value]) => (
                            <button
                                key={label}
                                onClick={() => setCurrentSpeed(value)}
                                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${currentSpeed === value
                                        ? 'bg-white text-black shadow-lg scale-105'
                                        : 'text-white/40 hover:text-white/70'
                                    }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                <h2 className="text-[10px] tracking-[0.4em] text-[#0EA5E9] font-black mb-6 uppercase opacity-80 flex items-center gap-2">
                    <MusicNotes size={16} weight="fill" />
                    Available Tracks
                </h2>

                {/* TRACK LIST - MATCHING HUB TILES */}
                <div className="grid grid-cols-1 gap-4">
                    {songs.map((song) => (
                        <div
                            key={song.id}
                            className={`group rounded-3xl backdrop-blur-md border transition-all duration-500 p-5 flex items-center justify-between shadow-xl ${activeSongId === song.id
                                    ? "bg-white/15 border-[#0EA5E9]/50 border-l-4 border-l-[#0EA5E9]"
                                    : "bg-white/5 border-white/10 hover:bg-white/10"
                                }`}
                        >
                            <div className="flex items-center gap-5">
                                {/* ICON CONTAINER */}
                                <div className={`h-14 w-14 rounded-2xl flex items-center justify-center transition-all duration-500 ${activeSongId === song.id
                                        ? "bg-[#0EA5E9]/20 text-[#0EA5E9] scale-110"
                                        : "bg-white/10 text-white/40 group-hover:text-white/70"
                                    }`}>
                                    <MusicNotes size={32} weight={activeSongId === song.id ? "fill" : "regular"} />
                                </div>

                                <div>
                                    <p className="text-xl font-bold text-white tracking-tight leading-none mb-1">
                                        {song.name}
                                    </p>
                                    <p className="text-white/40 text-[10px] tracking-[0.2em] uppercase font-black italic">
                                        {song.artist}
                                    </p>
                                </div>
                            </div>

                            {/* ACTION BUTTON */}
                            <button
                                onClick={() => activeSongId === song.id ? stopMusic() : playMusic(song.id, song.frequencies)}
                                className={`flex items-center gap-2 px-8 py-3 rounded-full text-xs font-black tracking-widest transition-all active:scale-95 ${activeSongId === song.id
                                        ? "bg-red-500 text-white shadow-lg shadow-red-500/20"
                                        : "bg-[#0EA5E9] text-black shadow-lg shadow-[#0EA5E9]/20 hover:scale-105"
                                    }`}
                            >
                                {activeSongId === song.id ? (
                                    <>
                                        <Stop size={18} weight="fill" />
                                        STOP
                                    </>
                                ) : (
                                    <>
                                        <Play size={18} weight="fill" />
                                        PLAY
                                    </>
                                )}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </PageShell>
    );
}