import { Pressable, Text } from "react-native";
import { Tabs, TabList, TabTrigger, TabSlot } from "expo-router/ui";
import type { TabTriggerSlotProps } from "expo-router/ui";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MiniPlayer from "@/components/MiniPlayer";
import { HomeIcon, ProfileIcon, SearchIcon, SessionsIcon, StudioIcon } from "@/components/icons";

export const unstable_settings = {
  initialRouteName: "(home)",
};

type TabButtonProps = TabTriggerSlotProps & { label: string; Icon: typeof HomeIcon };

function TabButton({ label, Icon, isFocused, ...props }: TabButtonProps) {
  const color = isFocused ? "#ffffff" : "rgba(255,255,255,0.4)";
  return (
    <Pressable
      {...props}
      style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 8, paddingBottom: 6, gap: 4 }}
    >
      <Icon size={22} color={color} />
      <Text style={{ color, fontFamily: "Geist-Regular", fontSize: 11 }}>{label}</Text>
    </Pressable>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      <TabSlot />
      <MiniPlayer />
      <TabList style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.1)", backgroundColor: "#0a0a0a", paddingBottom: insets.bottom }}>
        <TabTrigger name="home" href="/" asChild>
          <TabButton label="Home" Icon={HomeIcon} />
        </TabTrigger>
        <TabTrigger name="sessions" href="/sessions" asChild>
          <TabButton label="Sessions" Icon={SessionsIcon} />
        </TabTrigger>
        <TabTrigger name="studio" href="/studio" asChild>
          <TabButton label="Studio" Icon={StudioIcon} />
        </TabTrigger>
        <TabTrigger name="profile" href="/profile" asChild>
          <TabButton label="My Profile" Icon={ProfileIcon} />
        </TabTrigger>
        <TabTrigger name="search" href="/search" asChild>
          <TabButton label="Search" Icon={SearchIcon} />
        </TabTrigger>
      </TabList>
    </Tabs>
  );
}
