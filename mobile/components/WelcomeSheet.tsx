import { Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function WelcomeSheet({ visible, onDismiss }: { visible: boolean; onDismiss: () => void }) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <View className="flex-1 justify-end bg-black/55">
        <View style={{ paddingBottom: insets.bottom + 24 }} className="bg-player rounded-t-2xl px-6 pt-3">
          <View className="w-9 h-1 rounded-full bg-white/15 self-center mb-5" />

          <Text className="text-2xl font-medium text-white/90 mb-3.5">Music with a story</Text>

          <Text className="text-sm text-white/50 leading-relaxed mb-4">
            Real feedback on your music — from working artists and industry pros.
          </Text>

          <View className="flex-row gap-2.5 p-3 bg-white/[0.04] border border-white/[0.08] rounded-lg mb-3">
            <View className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
            <Text className="flex-1 text-[12.5px] text-white/55 leading-[19px]">
              <Text className="text-white/80 font-medium">Sessions</Text> put that critique live — a shared listen,
              judged as it happens.
            </Text>
          </View>

          <View className="flex-row gap-2.5 p-3 bg-white/[0.04] border border-white/[0.08] rounded-lg mb-5">
            <View className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
            <Text className="flex-1 text-[12.5px] text-white/55 leading-[19px]">
              Follow the right people, and the right sessions and artists find you.
            </Text>
          </View>

          <Pressable onPress={onDismiss} className="bg-white rounded-lg py-3.5 items-center">
            <Text className="text-black text-sm font-medium">Get started</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
