import { View } from "react-native";
import { Stack } from "expo-router";
import TopBar from "@/components/TopBar";

export default function ProfileStackLayout() {
  return (
    <View style={{ flex: 1 }}>
      <TopBar rootPath="/profile" />
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#0a0a0a" } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="edit" />
        </Stack>
      </View>
    </View>
  );
}
