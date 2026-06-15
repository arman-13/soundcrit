"use client";

export default function ScrollButton({ targetId }: { targetId: string }) {
  return (
    <button
      onClick={() => document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth" })}
      className="text-sm text-white/40 border border-white/10 px-6 py-2.5 rounded-full hover:text-white/70 hover:border-white/25 transition-colors"
    >
      Start Listening
    </button>
  );
}
