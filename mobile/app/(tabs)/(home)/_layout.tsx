import { View } from "react-native";
import { Stack } from "expo-router";
import TopBar from "@/components/TopBar";

export default function HomeStackLayout() {
  return (
    <View style={{ flex: 1 }}>
      <TopBar rootPath="/" />
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#0a0a0a" } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="music" />
          <Stack.Screen name="albums/index" />
          <Stack.Screen name="albums/[id]" />
          <Stack.Screen name="tracks/[id]" />
          <Stack.Screen name="artists/[username]" />
          <Stack.Screen name="charted" />
        </Stack>
      </View>
    </View>
  );
}
