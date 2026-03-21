"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { auth } from "@/utils/firebaseConfig";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { FirebaseError } from "firebase/app";

function mapFirebaseAuthError(code?: string) {
    switch (code) {
        case "auth/email-already-in-use":
            return "This email is already registered.";
        case "auth/invalid-email":
            return "Invalid email address.";
        case "auth/weak-password":
            return "Weak password. Use at least 6 characters.";
        case "auth/network-request-failed":
            return "Network error. Check your connection.";
        default:
            return null;
    }
}

export default function SignupPage() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (!email.trim()) return setError("Email is required.");
        if (password.length < 6) return setError("Password must be at least 6 characters.");
        if (password !== confirm) return setError("Passwords do not match.");

        setLoading(true);
        try {
            const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
            await updateProfile(cred.user, { displayName: email.split("@")[0] });

            document.cookie = "auth_session=true; path=/; max-age=604800; SameSite=Lax";
            router.push("/hub");
        } catch (err) {
            console.log(err);
            const friendly = mapFirebaseAuthError((err as FirebaseError)?.code);
            setError(friendly || (err as FirebaseError)?.code || (err as FirebaseError)?.message || "Signup failed");
        }
        finally {
            setLoading(false);
        }
    }

    return (
        <main className="min-h-screen flex items-center justify-center px-6">
            <div className="w-full max-w-md">
                <Link href="/auth/login" className="text-[#0EA5E9] hover:underline">
                    ← Back
                </Link>

                <div className="mt-6 rounded-3xl bg-[#0EA5E9]/20 border border-white/5 p-8 shadow-2xl">
                    <h1 className="text-3xl font-bold text-center">Create Account</h1>
                    <p className="mt-2 text-center text-white/60">
                        Register to manage your devices
                    </p>

                    <form onSubmit={onSubmit} className="mt-8 space-y-4">
                        <div>
                            <label className="text-sm text-white/70">Email</label>
                            <input
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                type="email"
                                placeholder="name@example.com"
                                className="mt-2 w-full rounded-2xl bg-slate-50 text-black border border-white/10 px-4 py-4 outline-none focus:border-[#0EA5E9] autofill:shadow-[inset_0_0_0px_1000px_#f8fafc]" />
                        </div>

                        <div>
                            <label className="text-sm text-white/70">Password</label>
                            <input
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                type="password"
                                placeholder="••••••••"
                                className="mt-2 w-full rounded-2xl bg-slate-50 text-black border border-white/10 px-4 py-4 outline-none focus:border-[#0EA5E9] autofill:shadow-[inset_0_0_0px_1000px_#f8fafc]" />
                        </div>

                        <div>
                            <label className="text-sm text-white/70">Confirm Password</label>
                            <input
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                type="password"
                                placeholder="••••••••"
                                className="mt-2 w-full rounded-2xl bg-slate-50 text-black border border-white/10 px-4 py-4 outline-none focus:border-[#0EA5E9] autofill:shadow-[inset_0_0_0px_1000px_#f8fafc]" />
                        </div>

                        {error ? (
                            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                                {error}
                            </div>
                        ) : null}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full text-center rounded-2xl bg-[#0EA5E9] py-4 font-semibold text-lg text-[#071022] disabled:opacity-60"
                        >
                            {loading ? "Creating..." : "Sign Up"}
                        </button>

                        <p className="text-center text-white/60">
                            Already have an account?{" "}
                            <Link href="/auth/login" className="text-[#0EA5E9] hover:underline">
                                Sign In
                            </Link>
                        </p>
                    </form>
                </div>
            </div>
        </main>
    );
}