"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { StoryBlock } from "@/types";
import { useAudioPlayer } from "@/lib/AudioPlayerContext";

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

// ── Static story mode block ───────────────────────────────────────────────────

function StaticBlock({ block }: { block: StoryBlock }) {
  if (block.type === "divider") return <hr className="border-white/10 my-8" />;
  if (block.type === "text")
    return <p className="text-white/50 leading-relaxed my-4 text-base">{block.content}</p>;
  if (block.type === "quote")
    return (
      <blockquote className="border-l-2 border-white/20 pl-6 my-8">
        <p className="text-white/60 text-lg leading-relaxed italic">"{block.content}"</p>
      </blockquote>
    );
  if (block.type === "image")
    return (
      <div className="my-8">
        {block.url && (
          <div className="relative w-full rounded-xl overflow-hidden bg-white/5" style={{ aspectRatio: "16/9" }}>
            <Image src={block.url} alt={block.caption ?? ""} fill className="object-cover" />
          </div>
        )}
        {block.caption && <p className="text-xs text-white/30 mt-2 text-center">{block.caption}</p>}
      </div>
    );
  if (block.type === "image_pair")
    return (
      <div className="grid grid-cols-2 gap-3 my-8">
        {(block.images ?? []).map((img, i) => (
          <div key={i}>
            <div className="relative aspect-square rounded-xl overflow-hidden bg-white/5">
              {img.url && <Image src={img.url} alt={img.caption ?? ""} fill className="object-cover" />}
            </div>
            {img.caption && <p className="text-xs text-white/30 mt-1.5 text-center">{img.caption}</p>}
          </div>
        ))}
      </div>
    );
  if (block.type === "video")
    return (
      <div className="my-8">
        {block.url && <video src={block.url} controls muted playsInline className="w-full rounded-xl" />}
        {block.caption && <p className="text-xs text-white/30 mt-2 text-center">{block.caption}</p>}
      </div>
    );
  return null;
}

// ── Word-by-word text for visual mode ─────────────────────────────────────────

function WordByWord({ content, isQuote }: { content: string; isQuote?: boolean }) {
  const words = content.split(/\s+/).filter(Boolean);
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(0);
    let n = 0;
    const timer = setInterval(() => {
      n += 1;
      setCount(n);
      if (n >= words.length) clearInterval(timer);
    }, 100);
    return () => clearInterval(timer);
  // words.length is derived from content, safe to use content as dep
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  return (
    <p
      style={{
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: "clamp(1.8rem, 4.5vw, 3.5rem)",
        lineHeight: 1.3,
        fontStyle: isQuote ? "italic" : "normal",
        fontWeight: 300,
        color: "#fff",
        textAlign: "center",
        textShadow: "0 2px 16px rgba(0,0,0,1), 0 0 40px rgba(0,0,0,0.9)",
        margin: 0,
      }}
    >
      {isQuote && <span style={{ opacity: count > 0 ? 1 : 0, transition: "opacity 0.3s" }}>" </span>}
      {words.map((w, i) => (
        <span
          key={i}
          style={{
            display: "inline",
            opacity: i < count ? 1 : 0,
            transition: "opacity 0.35s ease",
          }}
        >
          {w}{" "}
        </span>
      ))}
      {isQuote && (
        <span style={{ opacity: count >= words.length ? 1 : 0, transition: "opacity 0.3s" }}>"</span>
      )}
    </p>
  );
}

// ── Story Section ─────────────────────────────────────────────────────────────

export default function StorySection({ blocks, audioUrl }: { blocks: StoryBlock[]; audioUrl: string }) {
  const [visual, setVisual] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioPlaying, setAudioPlaying] = useState(false);

  // A/B crossfade for background images
  const [imgA, setImgA] = useState<string | null>(null);
  const [imgB, setImgB] = useState<string | null>(null);
  const [top, setTop] = useState<"A" | "B">("A");
  const lastImgRef = useRef<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const { setIsPlaying: pauseGlobal } = useAudioPlayer();

  // ── Derived from current playback time ───────────────────────────────────
  // A block is "on" if its timestamp is null (always) or has been passed
  const on = useCallback(
    (b: StoryBlock) => b.timestamp == null || currentTime >= (b.timestamp ?? 0),
    [currentTime]
  );

  // Last revealed image block → background
  const bgUrl = [...blocks].reverse().find((b) => on(b) && b.type === "image" && b.url)?.url ?? null;

  // Last revealed text/quote block → foreground text
  const textBlock = [...blocks].reverse().find((b) => on(b) && (b.type === "text" || b.type === "quote")) ?? null;

  // ── Push new background image when bgUrl changes ──────────────────────────
  useEffect(() => {
    if (!visual) return;
    if (bgUrl === lastImgRef.current) return;
    lastImgRef.current = bgUrl;
    if (!bgUrl) return;
    setTop((prev) => {
      if (prev === "A") { setImgB(bgUrl); return "B"; }
      else { setImgA(bgUrl); return "A"; }
    });
  }, [visual, bgUrl]);

  // ── Audio setup ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!visual) return;
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = 0;
    audio.play().catch(() => {});

    const onTime = () => setCurrentTime(audio.currentTime);
    const onMeta = () => setDuration(audio.duration);
    const onPlay = () => setAudioPlaying(true);
    const onPause = () => setAudioPlaying(false);

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, [visual]);

  const enterVisual = () => {
    pauseGlobal(false);
    lastImgRef.current = null;
    setImgA(null);
    setImgB(null);
    setTop("A");
    setCurrentTime(0);
    setVisual(true);
  };

  const exitVisual = useCallback(() => {
    audioRef.current?.pause();
    setVisual(false);
    setCurrentTime(0);
    setAudioPlaying(false);
  }, []);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") exitVisual(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [exitVisual]);

  const toggleAudio = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => {}); else a.pause();
  };

  if (blocks.length === 0) return null;

  return (
    <div>
      {/* ── Story mode (scroll) ── */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xs tracking-widest uppercase text-white/25">Story</h2>
        {audioUrl && (
          <button
            onClick={enterVisual}
            className="flex items-center gap-2 text-xs text-white/40 border border-white/10 px-3 py-1.5 rounded-full hover:text-white/70 hover:border-white/25 transition-colors"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            Play Story
          </button>
        )}
      </div>
      <div>
        {blocks.map((block) => (
          <div key={block.id} className="relative">
            <StaticBlock block={block} />
          </div>
        ))}
      </div>

      {/* ── Visual mode overlay ── */}
      {visual && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 50,
            background: "#000",
            display: "flex", flexDirection: "column",
          }}
        >
          {/* Hidden audio */}
          <audio ref={audioRef} src={audioUrl} preload="auto" style={{ display: "none" }} />

          {/* Layer 1: background images (A/B crossfade) */}
          <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
            {([{ url: imgA, active: top === "A" }, { url: imgB, active: top === "B" }] as const).map(
              ({ url, active }, i) =>
                url ? (
                  <div
                    key={i}
                    style={{
                      position: "absolute", inset: 0,
                      opacity: active ? 1 : 0,
                      transition: "opacity 1.4s ease",
                    }}
                  >
                    <Image src={url} alt="" fill style={{ objectFit: "cover" }} priority />
                  </div>
                ) : null
            )}
            {/* Dark scrim over image so text is readable */}
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} />
          </div>

          {/* Layer 2: text overlay — comes after images in DOM, naturally on top */}
          <div
            style={{
              position: "absolute", inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "0 2rem",
            }}
          >
            <div style={{ width: "100%", maxWidth: 680 }}>
              {textBlock && (
                <WordByWord
                  key={textBlock.id}
                  content={textBlock.content ?? ""}
                  isQuote={textBlock.type === "quote"}
                />
              )}
            </div>
          </div>

          {/* X button — top right */}
          <button
            onClick={exitVisual}
            aria-label="Exit"
            style={{
              position: "absolute", top: 20, right: 24,
              background: "none", border: "none", cursor: "pointer",
              color: "rgba(255,255,255,0.5)", fontSize: 36, lineHeight: 1,
              fontWeight: 100,
            }}
          >
            ×
          </button>

          {/* Controls — pinned to bottom */}
          <div style={{ marginTop: "auto", position: "relative" }}>
            {/* Progress bar */}
            <div style={{ height: 1, background: "rgba(255,255,255,0.1)" }}>
              <div
                style={{
                  height: "100%", background: "rgba(255,255,255,0.4)",
                  width: duration > 0 ? `${(currentTime / duration) * 100}%` : "0%",
                  transition: "width 0.25s linear",
                }}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 24px" }}>
              <button
                onClick={toggleAudio}
                style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)", lineHeight: 0 }}
              >
                <svg width={20} height={20} fill="currentColor" viewBox="0 0 24 24">
                  {audioPlaying
                    ? <><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></>
                    : <path d="M8 5v14l11-7z" />}
                </svg>
              </button>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", fontVariantNumeric: "tabular-nums" }}>
                {fmtTime(currentTime)} / {fmtTime(duration)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
