import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { followUser, getFollowers, unfollowUser } from "@/lib/api";

export default function FollowButton({ artistId }: { artistId: string }) {
  const { user, token } = useAuth();
  const [count, setCount] = useState(0);
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getFollowers(artistId, token ?? undefined)
      .then(({ count, isFollowing }) => {
        setCount(count);
        setFollowing(isFollowing);
      })
      .catch(() => {});
  }, [artistId, token]);

  const toggle = async () => {
    if (!token || busy) return;
    setBusy(true);
    try {
      if (following) {
        await unfollowUser(artistId, token);
        setFollowing(false);
        setCount((c) => c - 1);
      } else {
        await followUser(artistId, token);
        setFollowing(true);
        setCount((c) => c + 1);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="items-center gap-2">
      {user && user.id !== artistId ? (
        <Pressable
          onPress={toggle}
          disabled={busy}
          className={`px-6 py-2 rounded-full border ${following ? "border-white/30" : "border-white/50"}`}
          style={{ opacity: busy ? 0.5 : 1 }}
        >
          <Text className={`text-sm ${following ? "text-white/70" : "text-white/80"}`}>
            {following ? "Following" : "Follow"}
          </Text>
        </Pressable>
      ) : null}
      {count > 0 && (
        <Text className="text-xs text-white/25">
          {count} follower{count !== 1 ? "s" : ""}
        </Text>
      )}
    </View>
  );
}
