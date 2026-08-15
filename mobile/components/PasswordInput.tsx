import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { EyeIcon, EyeOffIcon } from "@/components/icons";

interface Props {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
}

export default function PasswordInput({ value, onChangeText, placeholder = "••••••••" }: Props) {
  const [show, setShow] = useState(false);

  return (
    <View className="relative justify-center">
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!show}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.2)"
        autoCapitalize="none"
        autoCorrect={false}
        className="w-full bg-white/5 border border-white/10 rounded px-4 py-3 pr-11 text-sm text-white/80 font-sans"
      />
      <Pressable onPress={() => setShow((s) => !s)} className="absolute right-3" hitSlop={8}>
        {show ? <EyeOffIcon size={18} color="rgba(255,255,255,0.5)" /> : <EyeIcon size={18} color="rgba(255,255,255,0.4)" />}
      </Pressable>
    </View>
  );
}
