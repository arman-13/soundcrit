import { View } from "react-native";
import { Stack } from "expo-router";
import TopBar from "@/components/TopBar";

export default function SessionsStackLayout() {
  return (
    <View style={{ flex: 1 }}>
      <TopBar rootPath="/sessions" />
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#0a0a0a" } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="events/[id]" />
        </Stack>
      </View>
    </View>
  );
}
