"use client";

import { resetPassword } from "@/lib/api";
import PasswordInput from "@/components/PasswordInput";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const token = searchParams.get("token") ?? "";
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords don't match."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setError("");
    setLoading(true);
    try {
      await resetPassword(email, token, password);
      router.push("/login?reset=1");
    } catch {
      setError("This reset link is invalid or has expired. Please request a new one.");
    } finally {
      setLoading(false);
    }
  };

  if (!email || !token) {
    return (
      <div className="text-center">
        <p className="text-white/40 mb-4">Invalid reset link.</p>
        <Link href="/forgot-password" className="text-sm text-white/60 hover:text-white transition-colors">Request a new one</Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-10">
        <h1 className="text-2xl font-light text-white/90 mb-2">Choose a new password</h1>
        <p className="text-sm text-white/40">For <span className="text-white/60">{email}</span></p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs tracking-widest uppercase text-white/35 mb-2">New password</label>
          <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <div>
          <label className="block text-xs tracking-widest uppercase text-white/35 mb-2">Confirm password</label>
          <PasswordInput value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </div>

        {error && <p className="text-sm text-red-400/80">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-white text-black text-sm font-medium py-3 rounded hover:bg-white/90 transition-colors disabled:opacity-50"
        >
          {loading ? "Saving…" : "Set new password"}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Suspense>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
