import { View } from "react-native";
import { Stack } from "expo-router";
import TopBar from "@/components/TopBar";

export default function SearchStackLayout() {
  return (
    <View style={{ flex: 1 }}>
      <TopBar rootPath="/search" />
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#0a0a0a" } }}>
          <Stack.Screen name="index" />
        </Stack>
      </View>
    </View>
  );
}
