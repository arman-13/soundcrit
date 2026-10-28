"use client";

import { useAudioPlayer } from "@/lib/AudioPlayerContext";
import Image from "next/image";
import { useState } from "react";

interface Props {
  eventId: number;
  coverImageUrl: string | null | undefined;
  alt: string;
  className?: string;
  containerClassName?: string;
}

export default function EventCardCover({ eventId, coverImageUrl, alt, className, containerClassName }: Props) {
  const { currentTrack, liveEventId, isCountdown } = useAudioPlayer();
  const [loaded, setLoaded] = useState(false);

  const isPlayingThisEvent = liveEventId === eventId && currentTrack !== null && !isCountdown;
  const displayUrl = isPlayingThisEvent ? currentTrack!.coverImageUrl : coverImageUrl;

  if (!displayUrl) return null;

  // Strip transition-* from className until loaded so the image snaps to its
  // target opacity instead of animating from full brightness on mount.
  const cls = loaded
    ? className
    : (className ?? "").replace(/transition-\S+/g, "").replace(/duration-\S+/g, "").trim();

  return (
    <div className={containerClassName}>
      <Image
        key={displayUrl}
        src={displayUrl}
        alt={alt}
        fill
        className={cls}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}
