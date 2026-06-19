"use client";

import { useAuth } from "@/contexts/AuthContext";
import { getAlbumComments, postAlbumComment, deleteAlbumComment } from "@/lib/api";
import { Comment } from "@/types";
import { useEffect, useState } from "react";

export default function AlbumComments({ albumId }: { albumId: number }) {
  const { user, token } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getAlbumComments(albumId).then(setComments).catch(() => {});
  }, [albumId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !content.trim()) return;
    setSubmitting(true);
    try {
      const c = await postAlbumComment(albumId, content.trim(), token);
      setComments((prev) => [...prev, c]);
      setContent("");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: number) => {
    if (!token) return;
    await deleteAlbumComment(albumId, commentId, token);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  };

  return (
    <div className="mt-16">
      <h2 className="text-xs tracking-widest uppercase text-white/25 mb-8">Comments</h2>

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

      {user ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Leave a comment…"
            rows={3}
            className="w-full bg-white/5 border border-white/10 rounded px-4 py-3 text-sm text-white/75 placeholder:text-white/25 focus:outline-none focus:border-white/25 transition-colors resize-none"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting || !content.trim()}
              className="bg-white text-black text-sm font-medium px-5 py-2 rounded hover:bg-white/90 transition-colors disabled:opacity-40"
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
