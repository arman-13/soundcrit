"use client";

import { useEffect, useRef, useState } from "react";

type Phase = "ended" | "preparing" | "ready";

export default function EventEndingScreen({ eventTitle, onDone }: { eventTitle: string; onDone: () => void }) {
  const [phase, setPhase] = useState<Phase>("ended");
  const [visible, setVisible] = useState(false);
  const [barWidth, setBarWidth] = useState(0);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const t0 = setTimeout(() => setVisible(true), 50);
    const t1 = setTimeout(() => { setPhase("preparing"); setBarWidth(100); }, 2000);
    const t2 = setTimeout(() => setPhase("ready"), 5500);
    const t3 = setTimeout(() => onDoneRef.current(), 7500);
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []); // run once on mount — onDoneRef stays current without restarting timers

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0a0a]"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 0.8s ease" }}
    >
      {phase === "ended" && (
        <div className="flex flex-col items-center gap-4 text-center px-6"
          style={{ animation: "fadeUp 0.7s ease forwards" }}>
          <p className="text-xs tracking-[0.2em] uppercase text-white/30">Event ended</p>
          <h1 className="text-3xl font-light text-white">{eventTitle}</h1>
        </div>
      )}

      {phase === "preparing" && (
        <div className="flex flex-col items-center gap-6 text-center px-6"
          style={{ animation: "fadeUp 0.5s ease forwards" }}>
          <p className="text-xs tracking-[0.2em] uppercase text-white/30">Preparing archive</p>
          <div className="w-48 h-px bg-white/10 relative overflow-hidden rounded-full">
            <div
              className="absolute left-0 top-0 h-full bg-white/50 rounded-full"
              style={{ width: `${barWidth}%`, transition: "width 3.5s cubic-bezier(0.4, 0, 0.2, 1)" }}
            />
          </div>
          <p className="text-xs text-white/20">Saving comments and ratings…</p>
        </div>
      )}

      {phase === "ready" && (
        <div className="flex flex-col items-center gap-4 text-center px-6"
          style={{ animation: "fadeUp 0.5s ease forwards" }}>
          <svg className="w-8 h-8 text-white/60" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          <p className="text-sm text-white/50">Archive is ready</p>
        </div>
      )}

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
