"use client";

import { useAuth } from "@/contexts/AuthContext";
import { getComments, postComment, deleteComment } from "@/lib/api";
import { Comment } from "@/types";
import { useEffect, useRef, useState } from "react";

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function Comments({ trackId, currentTime }: { trackId: number; currentTime?: number }) {
  const { user, token } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState("");
  const [stampedTime, setStampedTime] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    getComments(trackId).then(setComments).catch(() => {});
  }, [trackId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !content.trim()) return;
    setSubmitting(true);
    try {
      const c = await postComment(trackId, content.trim(), stampedTime, token);
      setComments((prev) => [...prev, c].sort((a, b) => {
        if (a.songTimestamp == null && b.songTimestamp == null) return 0;
        if (a.songTimestamp == null) return 1;
        if (b.songTimestamp == null) return -1;
        return a.songTimestamp - b.songTimestamp;
      }));
      setContent("");
      setStampedTime(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: number) => {
    if (!token) return;
    await deleteComment(trackId, commentId, token);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  };

  return (
    <div className="mt-16">
      <h2 className="text-xs tracking-widest uppercase text-white/25 mb-8">Comments</h2>

      {/* Comment list */}
      <div className="space-y-6 mb-10">
        {comments.length === 0 && (
          <p className="text-sm text-white/25">No comments yet. Be the first.</p>
        )}
        {comments.map((c) => (
          <div key={c.id} className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs text-white/50 shrink-0 mt-0.5">
              {c.displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-sm font-medium text-white/75">{c.displayName}</span>
                {c.songTimestamp != null && (
                  <span className="text-xs text-white/35 tabular-nums bg-white/5 px-1.5 py-0.5 rounded">
                    {fmtTime(c.songTimestamp)}
                  </span>
                )}
                <span className="text-xs text-white/20 ml-auto">
                  {new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
              <p className="text-sm text-white/55 leading-relaxed">{c.content}</p>
              {user?.id === c.userId && (
                <button
                  onClick={() => handleDelete(c.id)}
                  className="text-xs text-white/20 hover:text-red-400/70 transition-colors mt-1"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Post form */}
      {user ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Leave a comment…"
            rows={3}
            className="w-full bg-white/5 border border-white/10 rounded px-4 py-3 text-sm text-white/75 placeholder:text-white/25 focus:outline-none focus:border-white/25 transition-colors resize-none"
          />
          <div className="flex items-center gap-3">
            {currentTime != null && (
              <button
                type="button"
                onClick={() => setStampedTime(stampedTime != null ? null : Math.floor(currentTime))}
                className={`text-xs px-3 py-1.5 rounded border transition-colors ${
                  stampedTime != null
                    ? "border-white/40 text-white/70 bg-white/5"
                    : "border-white/15 text-white/35 hover:border-white/30 hover:text-white/55"
                }`}
              >
                {stampedTime != null ? `@ ${fmtTime(stampedTime)} ✕` : "Stamp current time"}
              </button>
            )}
            <button
              type="submit"
              disabled={submitting || !content.trim()}
              className="ml-auto bg-white text-black text-sm font-medium px-5 py-2 rounded hover:bg-white/90 transition-colors disabled:opacity-40"
            >
              {submitting ? "Posting…" : "Post"}
            </button>
          </div>
        </form>
      ) : (
        <p className="text-sm text-white/30">
          <a href="/login" className="underline underline-offset-2 hover:text-white/60 transition-colors">Sign in</a> to leave a comment.
        </p>
      )}
    </div>
  );
}
