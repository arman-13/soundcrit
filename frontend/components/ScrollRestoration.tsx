"use client";

import { useEffect, useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

export default function ScrollRestoration() {
  const pathname = usePathname();

  useEffect(() => {
    window.history.scrollRestoration = "manual";
  }, []);

  // Save position on every scroll
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        try { sessionStorage.setItem(`scroll:${pathname}`, String(window.scrollY)); } catch {}
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  // Intercept Next.js's scrollTo(0,0) reset and redirect it to our saved position.
  // useLayoutEffect fires before useEffect, so our intercept is in place when
  // Next.js calls scrollTo in its own useEffect.
  useLayoutEffect(() => {
    let saved: number | null = null;
    try {
      const s = sessionStorage.getItem(`scroll:${pathname}`);
      if (s) saved = Number(s);
    } catch {}

    if (!saved) return;

    const original = window.scrollTo.bind(window);
    let intercepted = false;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).scrollTo = (...args: any[]) => {
      if (!intercepted) {
        intercepted = true;
        (window as any).scrollTo = original;
        original({ top: saved!, behavior: "instant" });
      } else {
        original(...args);
      }
    };

    return () => {
      (window as any).scrollTo = original;
    };
  }, [pathname]);

  return null;
}
