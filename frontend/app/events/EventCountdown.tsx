"use client";

import { useEffect, useState } from "react";

export default function EventCountdown({ scheduledAt }: { scheduledAt: string }) {
  const [text, setText] = useState("");

  useEffect(() => {
    const tick = () => {
      const diff = new Date(scheduledAt).getTime() - Date.now();
      if (diff <= 0) { setText("Starting soon"); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (d > 0) setText(`in ${d}d ${h}h`);
      else if (h > 0) setText(`in ${h}h ${m}m`);
      else setText(`in ${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [scheduledAt]);

  return <span>{text}</span>;
}
