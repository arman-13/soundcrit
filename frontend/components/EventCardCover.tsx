"use client";

import { useAudioPlayer } from "@/lib/AudioPlayerContext";
import Image from "next/image";

interface Props {
  eventId: number;
  coverImageUrl: string | null | undefined;
  alt: string;
  className?: string;
  containerClassName?: string;
}

export default function EventCardCover({ eventId, coverImageUrl, alt, className, containerClassName }: Props) {
  const { currentTrack, liveEventId, isCountdown } = useAudioPlayer();

  // Show the live track art only for the event currently playing, and not during countdown
  const isPlayingThisEvent = liveEventId === eventId && currentTrack !== null && !isCountdown;
  const displayUrl = isPlayingThisEvent ? currentTrack!.coverImageUrl : coverImageUrl;

  if (!displayUrl) return null;

  return (
    <div className={containerClassName}>
      <Image
        key={displayUrl}
        src={displayUrl}
        alt={alt}
        fill
        className={`${className} transition-opacity duration-700`}
      />
    </div>
  );
}
