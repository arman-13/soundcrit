import { View } from "react-native";
import { Stack } from "expo-router";
import TopBar from "@/components/TopBar";

export default function StudioStackLayout() {
  return (
    <View style={{ flex: 1 }}>
      <TopBar rootPath="/studio" />
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#0a0a0a" } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="albums/index" />
          <Stack.Screen name="track/[id]" />
          <Stack.Screen name="album/[id]" />
        </Stack>
      </View>
    </View>
  );
}
