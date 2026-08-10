"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function BackButtonInner() {
  const params = useSearchParams();
  if (params.get("from") !== "home") return null;

  return (
    <Link
      href="/"
      className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors mb-8"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5M12 5l-7 7 7 7" />
      </svg>
      Home
    </Link>
  );
}

export default function BackButton() {
  return (
    <Suspense fallback={null}>
      <BackButtonInner />
    </Suspense>
  );
}
