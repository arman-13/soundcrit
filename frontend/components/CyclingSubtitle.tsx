"use client";

import { useEffect, useState } from "react";

const LINES = [
  { text: "Listen live with others — every session is saved as a record", duration: 4000, exitDown: true, enterFrom: false },
  { text: "Where the story behind the sound lives", duration: 5000, exitDown: false, enterFrom: true },
];

export default function CyclingSubtitle() {
  const [index, setIndex] = useState(0);
  const [style, setStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    const cycle = (current: number) => {
      timeout = setTimeout(() => {
        // 1. Exit: slide down or fade in place
        const exitTransform = LINES[current].exitDown ? "translateY(10px)" : "translateY(0)";
        setStyle({ opacity: 0, transform: exitTransform, transition: "opacity 350ms ease, transform 350ms ease" });

        setTimeout(() => {
          const next = (current + 1) % LINES.length;
          const snapTransform = LINES[next].enterFrom ? "translateY(-14px)" : "translateY(0)";

          // 2. Snap to start position (no transition)
          setStyle({ opacity: 0, transform: snapTransform, transition: "none" });

          // 3. Next frame: swap text + animate in
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              setIndex(next);
              setStyle({ opacity: 1, transform: "translateY(0)", transition: "opacity 350ms ease, transform 350ms ease" });
              cycle(next);
            });
          });
        }, 350);
      }, LINES[current].duration);
    };

    cycle(0);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <p className="text-base text-white/40 leading-relaxed" style={{ maxWidth: 480, ...style }}>
      {LINES[index].text}
    </p>
  );
}
