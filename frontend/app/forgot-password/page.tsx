"use client";

import { forgotPassword } from "@/lib/api";
import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {sent ? (
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
              <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <h1 className="text-xl font-light text-white/90 mb-2">Check your email</h1>
            <p className="text-sm text-white/40 mb-8">We sent a reset link to <span className="text-white/60">{email}</span></p>
            <Link href="/login" className="text-sm text-white/35 hover:text-white/60 transition-colors">
              Back to login
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-10">
              <h1 className="text-2xl font-light text-white/90 mb-2">Forgot password?</h1>
              <p className="text-sm text-white/40">Enter your email and we&apos;ll send you a reset link.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs tracking-widest uppercase text-white/35 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded px-4 py-3 text-sm text-white/80 placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors"
                  placeholder="you@example.com"
                />
              </div>

              {error && <p className="text-sm text-red-400/80">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-black text-sm font-medium py-3 rounded hover:bg-white/90 transition-colors disabled:opacity-50"
              >
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>

            <p className="mt-8 text-sm text-white/35 text-center">
              <Link href="/login" className="text-white/60 hover:text-white transition-colors">
                Back to login
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
