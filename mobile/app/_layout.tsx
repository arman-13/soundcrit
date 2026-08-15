import "@/global.css";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as Font from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { AuthProvider } from "@/contexts/AuthContext";
import { AudioPlayerProvider } from "@/lib/AudioPlayerContext";
import { LogoMark } from "@/components/icons";

SplashScreen.preventAutoHideAsync().catch(() => {});

const modalHeaderOptions = {
  headerShown: true,
  headerStyle: { backgroundColor: "#0a0a0a" },
  headerTintColor: "#fff",
  headerTitleStyle: { fontFamily: "Geist-Medium", fontSize: 15 },
  headerShadowVisible: false,
  headerBackTitleVisible: false,
  contentStyle: { backgroundColor: "#0a0a0a" },
  title: "",
  presentation: "modal",
} as const;

export default function RootLayout() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    Font.loadAsync({
      "Geist-Light": require("@/assets/fonts/Geist-Light.ttf"),
      "Geist-Regular": require("@/assets/fonts/Geist-Regular.ttf"),
      "Geist-Medium": require("@/assets/fonts/Geist-Medium.ttf"),
      "Geist-SemiBold": require("@/assets/fonts/Geist-SemiBold.ttf"),
    })
      .then(() => setFontsLoaded(true))
      .finally(() => SplashScreen.hideAsync().catch(() => {}));
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0a0a0a", alignItems: "center", justifyContent: "center" }}>
        <LogoMark size={48} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AudioPlayerProvider>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="login" options={modalHeaderOptions} />
            <Stack.Screen name="register" options={modalHeaderOptions} />
          </Stack>
        </AudioPlayerProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
