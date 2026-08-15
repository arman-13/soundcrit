import { Pressable, Text, View } from "react-native";
import { router, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BackChevronIcon } from "@/components/icons";

export default function TopBar({ rootPath }: { rootPath: string }) {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const isRoot = pathname === rootPath;

  return (
    <View style={{ paddingTop: insets.top }} className="bg-bg">
      <View className="h-11 items-center justify-center px-4">
        <Text style={{ fontFamily: "Geist-SemiBold", fontSize: 13, letterSpacing: 2, color: "rgba(255,255,255,0.9)" }}>
          SOUNDCRITIC
        </Text>
        {!isRoot && (
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            style={{ position: "absolute", left: 16, top: 0, bottom: 0, justifyContent: "center" }}
          >
            <BackChevronIcon size={18} color="#fff" />
          </Pressable>
        )}
      </View>
    </View>
  );
}
