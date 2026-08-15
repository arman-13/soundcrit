import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { deleteAlbumComment, getAlbumComments, postAlbumComment } from "@/lib/api";
import { Comment } from "@/types";
import { router } from "expo-router";

export default function AlbumComments({ albumId }: { albumId: number }) {
  const { user, token } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getAlbumComments(albumId).then(setComments).catch(() => {});
  }, [albumId]);

  const handleSubmit = async () => {
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
    <View className="mt-16">
      <Text className="text-xs tracking-widest uppercase text-white/25 mb-8">Comments</Text>

      <View className="gap-6 mb-10">
        {comments.length === 0 && <Text className="text-sm text-white/25">No comments yet. Be the first.</Text>}
        {comments.map((c) => (
          <View key={c.id} className="flex-row gap-4">
            <View className="w-8 h-8 rounded-full bg-white/10 items-center justify-center mt-0.5">
              <Text className="text-xs text-white/50">{c.displayName.charAt(0).toUpperCase()}</Text>
            </View>
            <View className="flex-1 min-w-0">
              <View className="flex-row items-baseline gap-2 mb-1">
                <Text className="text-sm font-medium text-white/75">{c.displayName}</Text>
                <Text className="text-xs text-white/20 ml-auto">
                  {new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </Text>
              </View>
              <Text className="text-sm text-white/55 leading-relaxed">{c.content}</Text>
              {user?.id === c.userId && (
                <Pressable onPress={() => handleDelete(c.id)} className="mt-1">
                  <Text className="text-xs text-white/20">Delete</Text>
                </Pressable>
              )}
            </View>
          </View>
        ))}
      </View>

      {user ? (
        <View className="gap-3">
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="Leave a comment…"
            placeholderTextColor="rgba(255,255,255,0.25)"
            multiline
            numberOfLines={3}
            className="bg-white/5 border border-white/10 rounded px-4 py-3 text-sm text-white/75 font-sans"
            style={{ textAlignVertical: "top", minHeight: 76 }}
          />
          <Pressable
            onPress={handleSubmit}
            disabled={submitting || !content.trim()}
            className="self-end bg-white rounded px-5 py-2"
            style={{ opacity: submitting || !content.trim() ? 0.4 : 1 }}
          >
            <Text className="text-black text-sm font-medium">{submitting ? "Posting…" : "Post"}</Text>
          </Pressable>
        </View>
      ) : (
        <Text className="text-sm text-white/30">
          <Text className="underline" onPress={() => router.push("/login")}>
            Sign in
          </Text>{" "}
          to leave a comment.
        </Text>
      )}
    </View>
  );
}
