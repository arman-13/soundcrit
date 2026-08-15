import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const KEY = "hasSeenWelcome";

export async function getHasSeenWelcome(): Promise<boolean> {
  if (Platform.OS === "web") return globalThis.localStorage?.getItem(KEY) === "1";
  return (await SecureStore.getItemAsync(KEY)) === "1";
}

export async function setHasSeenWelcome(): Promise<void> {
  if (Platform.OS === "web") { globalThis.localStorage?.setItem(KEY, "1"); return; }
  await SecureStore.setItemAsync(KEY, "1");
}
