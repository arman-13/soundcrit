import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { router, useLocalSearchParams } from "expo-router";
import Screen from "@/components/Screen";
import { useAuth } from "@/contexts/AuthContext";
import { createTrack, deleteTrack, getAllTracksAdmin, updateTrack, uploadAudio, uploadImage } from "@/lib/api";
import { Track } from "@/types";

type FormState = {
  title: string;
  artist: string;
  genre: string;
  mood: string;
  description: string;
  story: string;
  audioUrl: string;
  duration: string;
  coverImageUrl: string;
  isFeatured: boolean;
  isPublished: boolean;
};

function emptyForm(artist: string): FormState {
  return {
    title: "",
    artist,
    genre: "",
    mood: "",
    description: "",
    story: "",
    audioUrl: "",
    duration: "",
    coverImageUrl: "",
    isFeatured: false,
    isPublished: false,
  };
}

function Field({ label, value, onChangeText, placeholder }: { label: string; value: string; onChangeText: (v: string) => void; placeholder?: string }) {
  return (
    <View>
      <Text className="text-xs tracking-widest uppercase text-white/30 mb-2">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.25)"
        className="bg-white/5 border border-white/10 rounded px-4 py-2.5 text-sm text-white/75 font-sans"
      />
    </View>
  );
}

export default function TrackFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === "new";
  const { user, token } = useAuth();
  const [form, setForm] = useState<FormState>(emptyForm(user?.displayName ?? ""));
  const [loading, setLoading] = useState(!isNew);
  const [notFound, setNotFound] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isNew || !token) return;
    getAllTracksAdmin(token)
      .then((res) => {
        const t = res.data.find((x) => x.id === Number(id));
        if (!t) {
          setNotFound(true);
          return;
        }
        setForm({
          title: t.title,
          artist: t.artist,
          genre: t.genre ?? "",
          mood: t.mood ?? "",
          description: t.description ?? "",
          story: t.story ?? "",
          audioUrl: t.audioUrl,
          duration: t.duration,
          coverImageUrl: t.coverImageUrl,
          isFeatured: t.isFeatured,
          isPublished: t.isPublished,
        });
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id, isNew, token]);

  const set = (key: keyof FormState) => (value: string) => setForm((p) => ({ ...p, [key]: value }));

  const pickCover = async () => {
    if (!token) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setUploadingImage(true);
    setError("");
    try {
      const url = await uploadImage(asset.uri, asset.fileName ?? "cover.jpg", asset.mimeType ?? "image/jpeg", token);
      setForm((p) => ({ ...p, coverImageUrl: url }));
    } catch {
      setError("Image upload failed");
    } finally {
      setUploadingImage(false);
    }
  };

  const pickAudio = async () => {
    if (!token) return;
    const result = await DocumentPicker.getDocumentAsync({ type: "audio/*" });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setUploadingAudio(true);
    setError("");
    try {
      const { url, duration } = await uploadAudio(asset.uri, asset.name, asset.mimeType ?? "audio/mpeg", token);
      setForm((p) => ({ ...p, audioUrl: url, duration }));
    } catch {
      setError("Audio upload failed");
    } finally {
      setUploadingAudio(false);
    }
  };

  const handleSave = async () => {
    if (!token || !form.title.trim() || !form.artist.trim()) return;
    if (isNew && !form.audioUrl) {
      setError("Choose an audio file first");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (isNew) {
        await createTrack(
          { ...form, publishedAt: new Date().toISOString(), playCount: 0, albumTitle: "" },
          token
        );
      } else {
        await updateTrack(Number(id), form, token);
      }
      router.back();
    } catch {
      setError("Failed to save track");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!token) return;
    Alert.alert("Delete track", `Delete "${form.title}"? This can't be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteTrack(Number(id), token);
            router.back();
          } catch {
            setError("Failed to delete track");
            setDeleting(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator color="rgba(255,255,255,0.4)" style={{ marginTop: 80 }} />
      </Screen>
    );
  }

  if (notFound) {
    return (
      <Screen scroll={false}>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-white/50 text-sm">Track not found.</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View className="px-6 pt-4 gap-5 pb-10">
        <Text className="text-2xl font-light text-white/90 mb-2">{isNew ? "Upload Track" : "Edit Track"}</Text>

        <Field label="Title" value={form.title} onChangeText={set("title")} />
        <Field label="Artist" value={form.artist} onChangeText={set("artist")} />
        <Field label="Genre" value={form.genre} onChangeText={set("genre")} />
        <Field label="Mood tags" value={form.mood} onChangeText={set("mood")} placeholder="e.g. melancholic, late night" />
        <Field label="Short description" value={form.description} onChangeText={set("description")} />

        <View>
          <Text className="text-xs tracking-widest uppercase text-white/30 mb-2">Cover Image</Text>
          <View className="flex-row items-center gap-4">
            <Pressable
              onPress={pickCover}
              disabled={uploadingImage}
              className="flex-1 bg-white/5 border border-white/10 rounded px-4 py-2.5"
            >
              <Text className="text-sm text-white/50">{uploadingImage ? "Uploading…" : "Choose image…"}</Text>
            </Pressable>
            {form.coverImageUrl ? (
              <Image source={{ uri: form.coverImageUrl }} style={{ width: 48, height: 48, borderRadius: 6 }} />
            ) : null}
          </View>
        </View>

        <View>
          <Text className="text-xs tracking-widest uppercase text-white/30 mb-2">Audio File</Text>
          {isNew ? (
            <Pressable
              onPress={pickAudio}
              disabled={uploadingAudio}
              className="bg-white/5 border border-white/10 rounded px-4 py-2.5"
            >
              <Text className="text-sm text-white/50">
                {uploadingAudio ? "Uploading…" : form.audioUrl ? `Selected · ${form.duration}` : "Choose audio file…"}
              </Text>
            </Pressable>
          ) : (
            <Text className="text-xs text-white/25">Audio cannot be changed after upload.</Text>
          )}
        </View>

        <View>
          <Text className="text-xs tracking-widest uppercase text-white/30 mb-2">Liner Notes</Text>
          <TextInput
            value={form.story}
            onChangeText={set("story")}
            multiline
            numberOfLines={4}
            placeholderTextColor="rgba(255,255,255,0.25)"
            className="bg-white/5 border border-white/10 rounded px-4 py-3 text-sm text-white/75 font-sans"
            style={{ textAlignVertical: "top", minHeight: 90 }}
          />
        </View>

        <View className="flex-row gap-6">
          <Pressable
            onPress={() => setForm((p) => ({ ...p, isFeatured: !p.isFeatured }))}
            className="flex-row items-center gap-2"
          >
            <View className={`w-4 h-4 rounded border ${form.isFeatured ? "bg-white border-white" : "border-white/30"}`} />
            <Text className="text-sm text-white/50">Featured</Text>
          </Pressable>
          <Pressable
            onPress={() => setForm((p) => ({ ...p, isPublished: !p.isPublished }))}
            className="flex-row items-center gap-2"
          >
            <View className={`w-4 h-4 rounded border ${form.isPublished ? "bg-white border-white" : "border-white/30"}`} />
            <Text className="text-sm text-white/50">Published</Text>
          </Pressable>
        </View>

        {error ? <Text className="text-sm text-red-400/80">{error}</Text> : null}

        <View className="flex-row gap-4 pt-2">
          <Pressable
            onPress={handleSave}
            disabled={saving || uploadingImage || uploadingAudio}
            className="bg-white rounded px-5 py-2.5"
            style={{ opacity: saving || uploadingImage || uploadingAudio ? 0.5 : 1 }}
          >
            <Text className="text-black text-sm font-medium">{saving ? "Saving…" : isNew ? "Upload" : "Save changes"}</Text>
          </Pressable>
          <Pressable onPress={() => router.back()} className="justify-center">
            <Text className="text-sm text-white/40">Cancel</Text>
          </Pressable>
        </View>

        {!isNew && (
          <View className="mt-8 pt-6 border-t border-white/8">
            <Pressable onPress={handleDelete} disabled={deleting} className="items-center py-2">
              <Text className="text-xs text-red-400/50">{deleting ? "Deleting…" : "Delete this track"}</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Screen>
  );
}
