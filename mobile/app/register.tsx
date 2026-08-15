import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import PasswordInput from "@/components/PasswordInput";

export default function RegisterScreen() {
  const { register } = useAuth();
  const [form, setForm] = useState({ email: "", username: "", displayName: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (field: keyof typeof form) => (v: string) => setForm((prev) => ({ ...prev, [field]: v }));

  const handleSubmit = async () => {
    setError("");
    if (form.password !== form.confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await register(form.email, form.username, form.displayName, form.password);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 bg-bg">
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }} className="px-6">
        <View className="mb-10">
          <Text className="text-2xl font-light text-white/90 mb-2">Create an account</Text>
          <Text className="text-sm text-white/40">Join the platform</Text>
        </View>

        <View className="gap-5">
          <View>
            <Text className="text-xs tracking-widest uppercase text-white/35 mb-2">Email</Text>
            <TextInput
              value={form.email}
              onChangeText={set("email")}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="you@example.com"
              placeholderTextColor="rgba(255,255,255,0.2)"
              className="bg-white/5 border border-white/10 rounded px-4 py-3 text-sm text-white/80 font-sans"
            />
          </View>
          <View>
            <Text className="text-xs tracking-widest uppercase text-white/35 mb-2">Username</Text>
            <TextInput
              value={form.username}
              onChangeText={set("username")}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="yourhandle"
              placeholderTextColor="rgba(255,255,255,0.2)"
              className="bg-white/5 border border-white/10 rounded px-4 py-3 text-sm text-white/80 font-sans"
            />
          </View>
          <View>
            <Text className="text-xs tracking-widest uppercase text-white/35 mb-2">Display Name</Text>
            <TextInput
              value={form.displayName}
              onChangeText={set("displayName")}
              placeholder="Your Name"
              placeholderTextColor="rgba(255,255,255,0.2)"
              className="bg-white/5 border border-white/10 rounded px-4 py-3 text-sm text-white/80 font-sans"
            />
          </View>
          <View>
            <Text className="text-xs tracking-widest uppercase text-white/35 mb-2">Password</Text>
            <PasswordInput value={form.password} onChangeText={set("password")} placeholder="Min 6 characters" />
          </View>
          <View>
            <Text className="text-xs tracking-widest uppercase text-white/35 mb-2">Confirm Password</Text>
            <PasswordInput value={form.confirm} onChangeText={set("confirm")} />
          </View>

          {error ? <Text className="text-sm text-red-400/80">{error}</Text> : null}

          <Pressable
            onPress={handleSubmit}
            disabled={loading}
            className="bg-white rounded py-3 items-center"
            style={{ opacity: loading ? 0.5 : 1 }}
          >
            <Text className="text-black text-sm font-medium">{loading ? "Creating account…" : "Create account"}</Text>
          </Pressable>
        </View>

        <Text className="mt-8 text-sm text-white/35 text-center mb-8">
          Already have an account?{" "}
          <Text className="text-white/60" onPress={() => router.replace("/login")}>
            Sign in
          </Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
