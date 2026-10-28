"use client";

import { useAuth } from "@/contexts/AuthContext";
import PasswordInput from "@/components/PasswordInput";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const passwordReset = searchParams.get("reset") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      const returnTo = searchParams.get("returnTo");
      router.push(returnTo ?? "/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10">
          <h1 className="text-2xl font-light text-white/90 mb-2">Welcome back</h1>
          <p className="text-sm text-white/40">Sign in to your account</p>
        </div>

        {passwordReset && (
          <div className="mb-6 px-4 py-3 rounded bg-white/5 border border-white/10 text-sm text-white/60">
            Password updated. Sign in with your new password.
          </div>
        )}

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
          <div>
            <label className="block text-xs tracking-widest uppercase text-white/35 mb-2">Password</label>
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>

          {error && <p className="text-sm text-red-400/80">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black text-sm font-medium py-3 rounded hover:bg-white/90 transition-colors disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="mt-8 flex flex-col items-center gap-3">
          <Link href="/forgot-password" className="text-sm text-white/35 hover:text-white/60 transition-colors">
            Forgot password?
          </Link>
          <p className="text-sm text-white/35">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-white/60 hover:text-white transition-colors">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
