"use client";

import { useRef, useState } from "react";
import { StoryBlock } from "@/types";

type BlockType = StoryBlock["type"];

function genId(): string {
  return Math.random().toString(36).slice(2, 9);
}

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function parseTime(s: string): number | null {
  const parts = s.split(":");
  if (parts.length !== 2) return null;
  const m = parseInt(parts[0]);
  const sec = parseInt(parts[1]);
  if (isNaN(m) || isNaN(sec)) return null;
  return m * 60 + sec;
}

function typeIcon(type: BlockType): string {
  const map: Record<BlockType, string> = {
    text: "T", image: "img", image_pair: "img²", video: "vid", quote: "❝", divider: "—",
  };
  return map[type];
}

function blockPreview(block: StoryBlock): string {
  switch (block.type) {
    case "text":
    case "quote":
      return (block.content ?? "").slice(0, 55) || "(empty)";
    case "image":
    case "video":
      return block.url ? block.url.slice(block.url.lastIndexOf("/") + 1).slice(0, 45) : "(no URL)";
    case "image_pair":
      return `${(block.images ?? []).length} images`;
    case "divider":
      return "── divider ──";
  }
}

// ── Block inline editor ───────────────────────────────────────────────────────

function BlockEditor({
  block,
  audioTime,
  onChange,
  onStamp,
}: {
  block: StoryBlock;
  audioTime: number;
  onChange: (partial: Partial<StoryBlock>) => void;
  onStamp: () => void;
}) {
  const [tsInput, setTsInput] = useState(
    block.timestamp != null ? fmtTime(block.timestamp) : ""
  );

  const handleTsBlur = () => {
    if (!tsInput.trim()) { onChange({ timestamp: null }); return; }
    const parsed = parseTime(tsInput);
    if (parsed !== null) onChange({ timestamp: parsed });
  };

  const handleStamp = () => {
    const t = Math.floor(audioTime);
    setTsInput(fmtTime(t));
    onChange({ timestamp: t });
    onStamp();
  };

  const fieldCls =
    "w-full bg-black/20 border border-white/10 rounded px-3 py-1.5 text-xs text-white/65 focus:outline-none focus:border-white/25 transition-colors";

  return (
    <div className="ml-5 mt-1 mb-2 p-3 border border-white/8 rounded-lg space-y-2.5 bg-white/[0.02]">
      {/* Timestamp row */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Timestamp MM:SS (blank = always visible)"
          value={tsInput}
          onChange={(e) => setTsInput(e.target.value)}
          onBlur={handleTsBlur}
          className="flex-1 bg-black/20 border border-white/10 rounded px-3 py-1.5 text-xs text-white/65 focus:outline-none focus:border-white/25 transition-colors"
        />
        <button
          type="button"
          onClick={handleStamp}
          title="Stamp current player time"
          className="shrink-0 text-xs text-white/30 border border-white/10 px-2.5 py-1.5 rounded hover:text-white/65 hover:border-white/25 transition-colors"
        >
          Stamp
        </button>
      </div>

      {/* Content fields */}
      {(block.type === "text" || block.type === "quote") && (
        <textarea
          placeholder={block.type === "quote" ? "Quote text…" : "Text content…"}
          value={block.content ?? ""}
          onChange={(e) => onChange({ content: e.target.value })}
          rows={3}
          className={`${fieldCls} resize-none`}
        />
      )}

      {(block.type === "image" || block.type === "video") && (
        <>
          <input
            type="text"
            placeholder="URL…"
            value={block.url ?? ""}
            onChange={(e) => onChange({ url: e.target.value })}
            className={fieldCls}
          />
          <input
            type="text"
            placeholder="Caption (optional)…"
            value={block.caption ?? ""}
            onChange={(e) => onChange({ caption: e.target.value })}
            className={fieldCls}
          />
        </>
      )}

      {block.type === "image_pair" && (
        <div className="space-y-2">
          {(block.images ?? [{ url: "", caption: "" }, { url: "", caption: "" }]).map((img, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                placeholder={`Image ${i + 1} URL…`}
                value={img.url}
                onChange={(e) => {
                  const imgs = [...(block.images ?? [{ url: "", caption: "" }, { url: "", caption: "" }])];
                  imgs[i] = { ...imgs[i], url: e.target.value };
                  onChange({ images: imgs });
                }}
                className="flex-1 bg-black/20 border border-white/10 rounded px-3 py-1.5 text-xs text-white/65 focus:outline-none focus:border-white/25 transition-colors"
              />
              <input
                type="text"
                placeholder="Caption…"
                value={img.caption ?? ""}
                onChange={(e) => {
                  const imgs = [...(block.images ?? [{ url: "", caption: "" }, { url: "", caption: "" }])];
                  imgs[i] = { ...imgs[i], caption: e.target.value };
                  onChange({ images: imgs });
                }}
                className="w-28 bg-black/20 border border-white/10 rounded px-3 py-1.5 text-xs text-white/65 focus:outline-none focus:border-white/25 transition-colors"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Story Block Editor ────────────────────────────────────────────────────────

export default function StoryBlockEditor({
  value,
  onChange,
  audioUrl,
}: {
  value: string | null | undefined;
  onChange: (json: string) => void;
  audioUrl: string;
}) {
  const parseBlocks = (): StoryBlock[] => {
    if (!value) return [];
    try { return JSON.parse(value); } catch { return []; }
  };

  const [blocks, setBlocks] = useState<StoryBlock[]>(parseBlocks);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [audioTime, setAudioTime] = useState(0);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const commit = (updated: StoryBlock[]) => {
    setBlocks(updated);
    onChange(JSON.stringify(updated));
  };

  const addBlock = (type: BlockType) => {
    const block: StoryBlock = { id: genId(), type, timestamp: null };
    if (type === "image_pair") block.images = [{ url: "", caption: "" }, { url: "", caption: "" }];
    const updated = [...blocks, block];
    commit(updated);
    setEditingId(block.id);
    setShowPicker(false);
  };

  const updateBlock = (id: string, partial: Partial<StoryBlock>) => {
    commit(blocks.map((b) => (b.id === id ? { ...b, ...partial } : b)));
  };

  const deleteBlock = (id: string) => {
    commit(blocks.filter((b) => b.id !== id));
    if (editingId === id) setEditingId(null);
  };

  // Drag to reorder
  const handleDragStart = (i: number) => setDragIndex(i);
  const handleDrop = (i: number) => {
    if (dragIndex === null || dragIndex === i) return;
    const arr = [...blocks];
    const [moved] = arr.splice(dragIndex, 1);
    arr.splice(i, 0, moved);
    commit(arr);
    setDragIndex(null);
  };

  const toggleAudio = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  };

  const BLOCK_TYPES: BlockType[] = ["text", "image", "image_pair", "video", "quote", "divider"];

  return (
    <div>
      <label className="block text-xs tracking-widest uppercase text-white/30 mb-4">
        Story Blocks
      </label>

      <div className="flex gap-4 items-start">
        {/* Block list */}
        <div className="flex-1 space-y-1">
          {blocks.length === 0 && (
            <p className="text-xs text-white/20 py-2">No blocks yet. Add one below.</p>
          )}

          {blocks.map((block, i) => (
            <div key={block.id}>
              {/* Row */}
              <div
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(i)}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border transition-colors cursor-grab active:cursor-grabbing ${
                  editingId === block.id
                    ? "border-white/20 bg-white/5"
                    : "border-white/8 hover:border-white/15"
                } ${dragIndex === i ? "opacity-50" : ""}`}
              >
                <span className="text-white/15 text-xs select-none w-3 shrink-0">⠿</span>
                <span className="text-xs text-white/30 w-8 shrink-0 text-center font-mono">
                  {typeIcon(block.type)}
                </span>
                <span className="text-xs text-white/45 flex-1 truncate">{blockPreview(block)}</span>
                <span className="text-xs text-white/20 tabular-nums shrink-0 w-10 text-right">
                  {block.timestamp != null ? fmtTime(block.timestamp) : "—"}
                </span>
                <button
                  type="button"
                  onClick={() => setEditingId(editingId === block.id ? null : block.id)}
                  className="text-xs text-white/25 hover:text-white/65 transition-colors shrink-0 px-1.5 py-0.5 rounded hover:bg-white/5"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => deleteBlock(block.id)}
                  className="text-xs text-red-400/40 hover:text-red-400/70 transition-colors shrink-0"
                >
                  ✕
                </button>
              </div>

              {/* Inline editor */}
              {editingId === block.id && (
                <BlockEditor
                  block={block}
                  audioTime={audioTime}
                  onChange={(partial) => updateBlock(block.id, partial)}
                  onStamp={() => {}}
                />
              )}
            </div>
          ))}

          {/* Add block */}
          <div className="relative pt-1">
            <button
              type="button"
              onClick={() => setShowPicker(!showPicker)}
              className="text-xs text-white/30 border border-dashed border-white/15 rounded px-4 py-2 hover:text-white/60 hover:border-white/30 transition-colors"
            >
              + Add Block
            </button>
            {showPicker && (
              <div className="absolute left-0 top-full mt-1 bg-zinc-900 border border-white/10 rounded-lg p-1.5 z-10 flex flex-col w-40 shadow-xl">
                {BLOCK_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => addBlock(t)}
                    className="text-xs text-left text-white/50 hover:text-white/80 hover:bg-white/5 px-3 py-1.5 rounded transition-colors capitalize"
                  >
                    {typeIcon(t)}&nbsp;&nbsp;{t.replace("_", " ")}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Mini player sidebar */}
        {audioUrl && (
          <div className="w-28 shrink-0 border border-white/8 rounded-lg p-3 flex flex-col items-center gap-2.5">
            <p className="text-xs text-white/20 text-center">Player</p>
            <audio
              ref={audioRef}
              src={audioUrl}
              preload="metadata"
              onTimeUpdate={(e) => setAudioTime(e.currentTarget.currentTime)}
              onPlay={() => setAudioPlaying(true)}
              onPause={() => setAudioPlaying(false)}
            />
            <button
              type="button"
              onClick={toggleAudio}
              className="text-white/45 hover:text-white/80 transition-colors"
            >
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                {audioPlaying ? (
                  <>
                    <rect x="6" y="4" width="4" height="16" />
                    <rect x="14" y="4" width="4" height="16" />
                  </>
                ) : (
                  <path d="M8 5v14l11-7z" />
                )}
              </svg>
            </button>
            <p className="text-xs text-white/30 tabular-nums">{fmtTime(audioTime)}</p>
          </div>
        )}
      </div>
    </div>
  );
}
