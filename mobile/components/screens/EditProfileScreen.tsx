import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import Screen from "@/components/Screen";
import { useAuth } from "@/contexts/AuthContext";
import { uploadImage } from "@/lib/api";

export default function EditProfileScreen() {
  const { user, token, loading, logout, updateProfile } = useAuth();
  const [form, setForm] = useState({ displayName: "", bio: "", avatarUrl: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user) setForm({ displayName: user.displayName, bio: user.bio ?? "", avatarUrl: user.avatarUrl ?? "" });
  }, [user]);

  const pickAvatar = async () => {
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
    setUploading(true);
    setError("");
    try {
      const url = await uploadImage(asset.uri, asset.fileName ?? "avatar.jpg", asset.mimeType ?? "image/jpeg", token);
      setForm((p) => ({ ...p, avatarUrl: url }));
    } catch {
      setError("Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setError("");
    setSaving(true);
    try {
      await updateProfile(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Failed to update profile");
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

  if (!user) {
    return (
      <Screen scroll={false}>
        <View className="flex-1 items-center justify-center px-6 gap-4">
          <Text className="text-xl font-light text-white/90">You&apos;re not signed in</Text>
          <Text className="text-sm text-white/40 text-center mb-2">Sign in to view and edit your profile.</Text>
          <Pressable onPress={() => router.push("/login")} className="bg-white rounded px-6 py-3 w-full items-center">
            <Text className="text-black text-sm font-medium">Sign in</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/register")} className="border border-white/20 rounded px-6 py-3 w-full items-center">
            <Text className="text-white/70 text-sm font-medium">Create an account</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View className="px-6 pt-8 pb-8">
        <Text className="text-xs tracking-widest uppercase text-white/30 mb-3">Account</Text>
        <Text className="text-3xl font-light text-white/90">Your Profile</Text>
      </View>

      <View className="mx-6 mb-10 p-5 rounded-lg border border-white/8 bg-white/[0.02] flex-row items-center gap-4">
        {user.avatarUrl ? (
          <Image source={{ uri: user.avatarUrl }} style={{ width: 56, height: 56, borderRadius: 28 }} />
        ) : (
          <View className="w-14 h-14 rounded-full bg-white/10 items-center justify-center">
            <Text className="text-xl text-white/50">{user.displayName[0]?.toUpperCase()}</Text>
          </View>
        )}
        <View>
          <Text className="text-base font-medium text-white/90">{user.displayName}</Text>
          <Text className="text-sm text-white/40">@{user.username}</Text>
          <Text className="text-xs text-white/25 mt-0.5">{user.email}</Text>
        </View>
      </View>

      <View className="px-6 gap-5">
        <View>
          <Text className="text-xs tracking-widest uppercase text-white/35 mb-2">Display Name</Text>
          <TextInput
            value={form.displayName}
            onChangeText={(v) => setForm((p) => ({ ...p, displayName: v }))}
            className="bg-white/5 border border-white/10 rounded px-4 py-3 text-sm text-white/80 font-sans"
          />
        </View>
        <View>
          <Text className="text-xs tracking-widest uppercase text-white/35 mb-2">Bio</Text>
          <TextInput
            value={form.bio}
            onChangeText={(v) => setForm((p) => ({ ...p, bio: v }))}
            multiline
            numberOfLines={3}
            placeholder="Tell us a bit about yourself"
            placeholderTextColor="rgba(255,255,255,0.2)"
            className="bg-white/5 border border-white/10 rounded px-4 py-3 text-sm text-white/80 font-sans"
            style={{ textAlignVertical: "top", minHeight: 80 }}
          />
        </View>
        <View>
          <Text className="text-xs tracking-widest uppercase text-white/35 mb-2">Avatar</Text>
          <View className="flex-row items-center gap-4">
            <Pressable
              onPress={pickAvatar}
              disabled={uploading}
              className="flex-1 bg-white/5 border border-white/10 rounded px-4 py-3"
            >
              <Text className="text-sm text-white/50">{uploading ? "Uploading…" : "Choose image…"}</Text>
            </Pressable>
            {form.avatarUrl ? (
              <Image source={{ uri: form.avatarUrl }} style={{ width: 56, height: 56, borderRadius: 28 }} />
            ) : null}
          </View>
        </View>

        {error ? <Text className="text-sm text-red-400/80">{error}</Text> : null}
        {saved ? <Text className="text-sm text-green-400/80">Profile updated.</Text> : null}

        <Pressable
          onPress={handleSave}
          disabled={saving || uploading}
          className="bg-white rounded px-6 py-3 items-center"
          style={{ opacity: saving || uploading ? 0.5 : 1 }}
        >
          <Text className="text-black text-sm font-medium">{saving ? "Saving…" : "Save changes"}</Text>
        </Pressable>

        <Pressable onPress={logout} className="items-center py-4">
          <Text className="text-xs text-white/40">Logout</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
