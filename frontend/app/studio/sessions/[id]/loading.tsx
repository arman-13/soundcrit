export default function SessionLoading() {
  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      {/* Background shimmer */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute inset-0 bg-[#0a0a0a]" />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: "linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.06) 50%, transparent 70%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 2s infinite linear",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/20" />
      </div>

      {/* Content skeleton */}
      <div className="relative min-h-[calc(100vh-4rem)] flex flex-col pt-12 pb-28 max-w-6xl mx-auto px-6 w-full" style={{ zIndex: 1 }}>
        {/* Host label */}
        <div className="h-3 w-32 rounded-full bg-white/10 mb-3 animate-pulse" />

        {/* Title */}
        <div className="h-9 w-64 rounded-lg bg-white/10 mb-8 animate-pulse" />

        {/* Body lines */}
        <div className="space-y-3 mt-4">
          <div className="h-3 w-48 rounded-full bg-white/7 animate-pulse" />
          <div className="h-3 w-36 rounded-full bg-white/7 animate-pulse" />
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          from { background-position: 200% center; }
          to   { background-position: -200% center; }
        }
      `}</style>
    </div>
  );
}
