import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import Screen from "@/components/Screen";
import { useAuth } from "@/contexts/AuthContext";
import {
  addTrackToAlbum,
  createAlbum,
  deleteAlbum,
  getAlbum,
  getAllTracksAdmin,
  getMyAlbums,
  removeTrackFromAlbum,
  reorderAlbumTracks,
  updateAlbum,
  uploadImage,
} from "@/lib/api";
import { AlbumTrackDto, Track } from "@/types";

type FormState = {
  title: string;
  coverImageUrl: string;
  description: string;
  releasedAt: string;
  isPublished: boolean;
};

function emptyForm(): FormState {
  return {
    title: "",
    coverImageUrl: "",
    description: "",
    releasedAt: new Date().toISOString().slice(0, 10),
    isPublished: false,
  };
}

export default function AlbumFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === "new";
  const { token } = useAuth();
  const [form, setForm] = useState<FormState>(emptyForm());
  const [albumTracks, setAlbumTracks] = useState<AlbumTrackDto[]>([]);
  const [myTracks, setMyTracks] = useState<Track[]>([]);
  const [showAddTrack, setShowAddTrack] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [notFound, setNotFound] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isNew || !token) return;
    getMyAlbums(token)
      .then((albums) => {
        const a = albums.find((x) => x.id === Number(id));
        if (!a) {
          setNotFound(true);
          return;
        }
        setForm({
          title: a.title,
          coverImageUrl: a.coverImageUrl,
          description: a.description ?? "",
          releasedAt: a.releasedAt.slice(0, 10),
          isPublished: a.isPublished,
        });
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
    getAlbum(Number(id))
      .then((a) => setAlbumTracks([...a.tracks].sort((x, y) => x.trackNumber - y.trackNumber)))
      .catch(() => {});
    getAllTracksAdmin(token)
      .then((res) => setMyTracks(res.data))
      .catch(() => {});
  }, [id, isNew, token]);

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
    setUploadingCover(true);
    setError("");
    try {
      const url = await uploadImage(asset.uri, asset.fileName ?? "cover.jpg", asset.mimeType ?? "image/jpeg", token);
      setForm((p) => ({ ...p, coverImageUrl: url }));
    } catch {
      setError("Image upload failed");
    } finally {
      setUploadingCover(false);
    }
  };

  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= albumTracks.length || !token) return;
    const reordered = [...albumTracks];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    const withNumbers = reordered.map((t, i) => ({ ...t, trackNumber: i + 1 }));
    setAlbumTracks(withNumbers);
    await reorderAlbumTracks(Number(id), withNumbers.map((t) => ({ trackId: t.trackId, trackNumber: t.trackNumber })), token);
  };

  const handleRemoveTrack = async (trackId: number) => {
    if (!token) return;
    await removeTrackFromAlbum(Number(id), trackId, token);
    setAlbumTracks((prev) => prev.filter((t) => t.trackId !== trackId).map((t, i) => ({ ...t, trackNumber: i + 1 })));
  };

  const handleAddTrack = async (track: Track) => {
    if (!token) return;
    setShowAddTrack(false);
    await addTrackToAlbum(Number(id), track.id, albumTracks.length + 1, token);
    setAlbumTracks((prev) => [
      ...prev,
      {
        trackId: track.id,
        trackNumber: prev.length + 1,
        title: track.title,
        artist: track.artist,
        duration: track.duration,
        coverImageUrl: track.coverImageUrl,
        audioUrl: track.audioUrl,
        mood: track.mood,
        playCount: track.playCount,
      },
    ]);
  };

  const handleDelete = () => {
    if (!token) return;
    Alert.alert("Delete album", `Delete "${form.title}"? This can't be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteAlbum(Number(id), token);
            router.back();
          } catch {
            setError("Failed to delete album");
            setDeleting(false);
          }
        },
      },
    ]);
  };

  const handleSave = async () => {
    if (!token || !form.title.trim()) return;
    setSaving(true);
    setError("");
    try {
      const data = { ...form, releasedAt: new Date(form.releasedAt).toISOString() };
      if (isNew) await createAlbum(data, token);
      else await updateAlbum(Number(id), data, token);
      router.back();
    } catch {
      setError("Failed to save album");
    } finally {
      setSaving(false);
    }
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
          <Text className="text-white/50 text-sm">Album not found.</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View className="px-6 pt-4 gap-5 pb-10">
        <Text className="text-2xl font-light text-white/90 mb-2">{isNew ? "Create Album" : "Edit Album"}</Text>

        <View>
          <Text className="text-xs tracking-widest uppercase text-white/30 mb-2">Title</Text>
          <TextInput
            value={form.title}
            onChangeText={(v) => setForm((p) => ({ ...p, title: v }))}
            className="bg-white/5 border border-white/10 rounded px-4 py-2.5 text-sm text-white/75 font-sans"
          />
        </View>

        <View>
          <Text className="text-xs tracking-widest uppercase text-white/30 mb-2">Cover Image</Text>
          <View className="flex-row items-center gap-4">
            <Pressable
              onPress={pickCover}
              disabled={uploadingCover}
              className="flex-1 bg-white/5 border border-white/10 rounded px-4 py-2.5"
            >
              <Text className="text-sm text-white/50">{uploadingCover ? "Uploading…" : "Choose image…"}</Text>
            </Pressable>
            {form.coverImageUrl ? (
              <Image source={{ uri: form.coverImageUrl }} style={{ width: 48, height: 48, borderRadius: 6 }} />
            ) : null}
          </View>
        </View>

        {!isNew && (
          <View>
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-xs tracking-widest uppercase text-white/30">Tracks</Text>
              <Pressable onPress={() => setShowAddTrack((v) => !v)}>
                <Text className="text-xs text-white/40">+ Add track</Text>
              </Pressable>
            </View>

            {showAddTrack && (
              <View className="gap-1.5 mb-4">
                {myTracks.filter((t) => !albumTracks.some((at) => at.trackId === t.id)).length === 0 ? (
                  <Text className="text-xs text-white/25">No more tracks to add.</Text>
                ) : (
                  myTracks
                    .filter((t) => !albumTracks.some((at) => at.trackId === t.id))
                    .map((t) => (
                      <Pressable
                        key={t.id}
                        onPress={() => handleAddTrack(t)}
                        className="bg-white/5 border border-white/10 rounded px-3 py-2"
                      >
                        <Text className="text-xs text-white/60">{t.title}</Text>
                      </Pressable>
                    ))
                )}
              </View>
            )}

            {albumTracks.length > 0 && (
              <View className="gap-1.5">
                {albumTracks.map((t, i) => (
                  <View key={t.trackId} className="flex-row items-center gap-3 py-2">
                    <Text className="w-5 text-xs text-white/25 text-right">{t.trackNumber}</Text>
                    <View className="w-8 h-8 rounded overflow-hidden bg-white/5 shrink-0">
                      {t.coverImageUrl ? (
                        <Image source={{ uri: t.coverImageUrl }} style={{ width: 32, height: 32 }} contentFit="cover" />
                      ) : null}
                    </View>
                    <View className="flex-1 min-w-0">
                      <Text numberOfLines={1} className="text-sm text-white/75">
                        {t.title}
                      </Text>
                    </View>
                    <Pressable onPress={() => move(i, -1)} disabled={i === 0} hitSlop={6}>
                      <Text className={`text-sm ${i === 0 ? "text-white/10" : "text-white/40"}`}>↑</Text>
                    </Pressable>
                    <Pressable onPress={() => move(i, 1)} disabled={i === albumTracks.length - 1} hitSlop={6}>
                      <Text className={`text-sm ${i === albumTracks.length - 1 ? "text-white/10" : "text-white/40"}`}>↓</Text>
                    </Pressable>
                    <Pressable onPress={() => handleRemoveTrack(t.trackId)} hitSlop={6}>
                      <Text className="text-xs text-red-400/50 ml-1">Remove</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        <View>
          <Text className="text-xs tracking-widest uppercase text-white/30 mb-2">Description</Text>
          <TextInput
            value={form.description}
            onChangeText={(v) => setForm((p) => ({ ...p, description: v }))}
            multiline
            numberOfLines={3}
            placeholderTextColor="rgba(255,255,255,0.25)"
            className="bg-white/5 border border-white/10 rounded px-4 py-3 text-sm text-white/75 font-sans"
            style={{ textAlignVertical: "top", minHeight: 76 }}
          />
        </View>

        <View>
          <Text className="text-xs tracking-widest uppercase text-white/30 mb-2">Release Date</Text>
          <TextInput
            value={form.releasedAt}
            onChangeText={(v) => setForm((p) => ({ ...p, releasedAt: v }))}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="rgba(255,255,255,0.25)"
            className="bg-white/5 border border-white/10 rounded px-4 py-2.5 text-sm text-white/75 font-sans"
          />
        </View>

        <Pressable
          onPress={() => setForm((p) => ({ ...p, isPublished: !p.isPublished }))}
          className="flex-row items-center gap-2"
        >
          <View className={`w-4 h-4 rounded border ${form.isPublished ? "bg-white border-white" : "border-white/30"}`} />
          <Text className="text-sm text-white/50">Published</Text>
        </Pressable>

        {error ? <Text className="text-sm text-red-400/80">{error}</Text> : null}

        <View className="flex-row gap-4 pt-2">
          <Pressable
            onPress={handleSave}
            disabled={saving || uploadingCover}
            className="bg-white rounded px-5 py-2.5"
            style={{ opacity: saving || uploadingCover ? 0.5 : 1 }}
          >
            <Text className="text-black text-sm font-medium">{saving ? "Saving…" : isNew ? "Create" : "Save changes"}</Text>
          </Pressable>
          <Pressable onPress={() => router.back()} className="justify-center">
            <Text className="text-sm text-white/40">Cancel</Text>
          </Pressable>
        </View>

        {!isNew && (
          <View className="mt-8 pt-6 border-t border-white/8">
            <Pressable onPress={handleDelete} disabled={deleting} className="items-center py-2">
              <Text className="text-xs text-red-400/50">{deleting ? "Deleting…" : "Delete this album"}</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Screen>
  );
}
