import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";

type Phase = "ended" | "preparing" | "ready";

export default function EventEndingView({ eventTitle, onDone }: { eventTitle: string; onDone: () => void }) {
  const [phase, setPhase] = useState<Phase>("ended");
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("preparing"), 2000);
    const t2 = setTimeout(() => setPhase("ready"), 5500);
    const t3 = setTimeout(() => onDoneRef.current(), 7500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return (
    <View className="flex-1 bg-bg items-center justify-center px-6 gap-4">
      {phase === "ended" && (
        <>
          <Text className="text-xs tracking-[3px] uppercase text-white/30">Session ended</Text>
          <Text className="text-2xl font-light text-white text-center">{eventTitle}</Text>
        </>
      )}
      {phase === "preparing" && (
        <>
          <Text className="text-xs tracking-[3px] uppercase text-white/30">Preparing archive</Text>
          <Text className="text-xs text-white/20">Saving comments and ratings…</Text>
        </>
      )}
      {phase === "ready" && <Text className="text-sm text-white/50">Archive is ready</Text>}
    </View>
  );
}
