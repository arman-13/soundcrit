"use client";

import { useAuth } from "@/contexts/AuthContext";
import { getFollowers, followUser, unfollowUser } from "@/lib/api";
import { useEffect, useState } from "react";

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
    <div className="flex flex-col items-center gap-2">
      {user && user.id !== artistId ? (
        <button
          onClick={toggle}
          disabled={busy}
          className={`text-sm px-6 py-2 rounded-full border transition-colors disabled:opacity-50 ${
            following
              ? "border-white/30 text-white/70 hover:border-white/15 hover:text-white/35"
              : "border-white/50 text-white/80 hover:border-white hover:text-white"
          }`}
        >
          {following ? "Following" : "Follow"}
        </button>
      ) : null}
      {count > 0 && (
        <p className="text-xs text-white/25">{count} follower{count !== 1 ? "s" : ""}</p>
      )}
    </div>
  );
}
