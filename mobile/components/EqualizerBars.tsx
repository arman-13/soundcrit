import { useEffect, useRef } from "react";
import { Animated, View } from "react-native";

export default function EqualizerBars({ heights = [12, 7, 14, 9], barWidth = 3 }: { heights?: number[]; barWidth?: number }) {
  const anims = useRef(heights.map(() => new Animated.Value(0.4))).current;

  useEffect(() => {
    const loops = anims.map((a, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(a, { toValue: 1, duration: 350, delay: i * 100, useNativeDriver: true }),
          Animated.timing(a, { toValue: 0.4, duration: 350, useNativeDriver: true }),
        ])
      )
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [anims]);

  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 2 }}>
      {heights.map((h, i) => (
        <Animated.View
          key={i}
          style={{ width: barWidth, height: h, borderRadius: 2, backgroundColor: "#fff", opacity: anims[i] }}
        />
      ))}
    </View>
  );
}
