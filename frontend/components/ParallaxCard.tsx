"use client";

import { useRef, useEffect } from "react";

export default function ParallaxCard({ children }: { children: React.ReactNode }) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.parentElement!.getBoundingClientRect();
      const viewH = window.innerHeight;
      // progress: 0 when card bottom enters viewport, 1 when card top exits
      const progress = 1 - (rect.bottom / (viewH + rect.height));
      const raw = (progress - 0.5) * 160;
      const shift = Math.max(-55, Math.min(55, raw));
      el.style.transform = `translateY(${shift}px)`;
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <div ref={contentRef} className="relative max-w-4xl mx-auto px-6 py-14" style={{ willChange: "transform" }}>
      {children}
    </div>
  );
}
