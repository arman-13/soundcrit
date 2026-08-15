"use client";

import { verifyEmail } from "@/lib/api";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const token = searchParams.get("token") ?? "";

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    Promise.resolve()
      .then(() => {
        if (!email || !token) throw new Error("Missing email or token");
        return verifyEmail(email, token);
      })
      .then(() => { if (!cancelled) setStatus("success"); })
      .catch(() => { if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; };
  }, [email, token]);

  if (status === "loading") {
    return (
      <div className="text-center">
        <div className="w-8 h-8 border border-white/20 border-t-white/60 rounded-full animate-spin mx-auto mb-6" />
        <p className="text-sm text-white/40">Verifying your email…</p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="text-center">
        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
          <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h1 className="text-xl font-light text-white/90 mb-2">Email verified</h1>
        <p className="text-sm text-white/40 mb-8">Your account is now verified.</p>
        <Link href="/" className="text-sm text-white/60 hover:text-white transition-colors">Go to home</Link>
      </div>
    );
  }

  return (
    <div className="text-center">
      <h1 className="text-xl font-light text-white/90 mb-2">Verification failed</h1>
      <p className="text-sm text-white/40 mb-8">This link is invalid or has already been used.</p>
      <Link href="/" className="text-sm text-white/60 hover:text-white transition-colors">Go to home</Link>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6">
      <Suspense>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
