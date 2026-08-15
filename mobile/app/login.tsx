import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import PasswordInput from "@/components/PasswordInput";

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 bg-bg">
      <View className="flex-1 justify-center px-6">
        <View className="mb-10">
          <Text className="text-2xl font-light text-white/90 mb-2">Welcome back</Text>
          <Text className="text-sm text-white/40">Sign in to your account</Text>
        </View>

        <View className="gap-5">
          <View>
            <Text className="text-xs tracking-widest uppercase text-white/35 mb-2">Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="you@example.com"
              placeholderTextColor="rgba(255,255,255,0.2)"
              className="bg-white/5 border border-white/10 rounded px-4 py-3 text-sm text-white/80 font-sans"
            />
          </View>
          <View>
            <Text className="text-xs tracking-widest uppercase text-white/35 mb-2">Password</Text>
            <PasswordInput value={password} onChangeText={setPassword} />
          </View>

          {error ? <Text className="text-sm text-red-400/80">{error}</Text> : null}

          <Pressable
            onPress={handleSubmit}
            disabled={loading}
            className="bg-white rounded py-3 items-center"
            style={{ opacity: loading ? 0.5 : 1 }}
          >
            <Text className="text-black text-sm font-medium">{loading ? "Signing in…" : "Sign in"}</Text>
          </Pressable>
        </View>

        <View className="mt-8 items-center gap-3">
          <Text className="text-sm text-white/35">
            Don&apos;t have an account?{" "}
            <Text className="text-white/60" onPress={() => router.replace("/register")}>
              Sign up
            </Text>
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
