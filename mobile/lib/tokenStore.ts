import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const KEY = "token";

export async function getToken(): Promise<string | null> {
  if (Platform.OS === "web") return globalThis.localStorage?.getItem(KEY) ?? null;
  return SecureStore.getItemAsync(KEY);
}

export async function setToken(value: string): Promise<void> {
  if (Platform.OS === "web") { globalThis.localStorage?.setItem(KEY, value); return; }
  await SecureStore.setItemAsync(KEY, value);
}

export async function deleteToken(): Promise<void> {
  if (Platform.OS === "web") { globalThis.localStorage?.removeItem(KEY); return; }
  await SecureStore.deleteItemAsync(KEY);
}
