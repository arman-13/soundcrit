import { ReactNode } from "react";
import { RefreshControl, ScrollView, View, ViewStyle } from "react-native";

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export default function Screen({ children, scroll = true, contentStyle, onRefresh, refreshing }: ScreenProps) {
  return (
    <View className="flex-1 bg-bg">
      {scroll ? (
        <ScrollView
          contentContainerStyle={[{ paddingBottom: 24 }, contentStyle]}
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor="rgba(255,255,255,0.5)" />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1, paddingBottom: 24 }, contentStyle]}>{children}</View>
      )}
    </View>
  );
}
