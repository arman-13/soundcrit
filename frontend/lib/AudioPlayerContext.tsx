"use client";

import { incrementPlay } from "@/lib/api";
import { Track } from "@/types";
import { createContext, useContext, useEffect, useRef, useState } from "react";

interface AudioPlayerContextType {
  currentTrack: Track | null;
  queue: Track[];
  isPlaying: boolean;
  isLive: boolean;
  isCountdown: boolean;
  liveEventId: number | null;
  playTrack: (track: Track, queue?: Track[]) => void;
  setIsPlaying: (v: boolean) => void;
  setIsLive: (v: boolean) => void;
  setIsCountdown: (v: boolean) => void;
  setLiveEventId: (id: number | null) => void;
  dismiss: () => void;
  playNext: () => void;
  playPrev: () => void;
  seekTo: (seconds: number) => void;
  audioRef: React.RefObject<HTMLAudioElement | null>;
}

const AudioPlayerContext = createContext<AudioPlayerContextType>({
  currentTrack: null,
  queue: [],
  isPlaying: false,
  isLive: false,
  isCountdown: false,
  liveEventId: null,
  playTrack: () => {},
  setIsPlaying: () => {},
  setIsLive: () => {},
  setIsCountdown: () => {},
  setLiveEventId: () => {},
  playNext: () => {},
  playPrev: () => {},
  seekTo: () => {},
  dismiss: () => {},
  audioRef: { current: null },
});

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [isCountdown, setIsCountdown] = useState(false);
  const [liveEventId, setLiveEventId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const unlockedRef = useRef(false);

  // Unlock audio on first user interaction so autoplay works without gesture later
  useEffect(() => {
    const unlock = () => {
      if (unlockedRef.current) return;
      const audio = audioRef.current;
      if (audio) {
        unlockedRef.current = true;
        if (audio.paused) {
          audio.muted = true;
          audio.play().then(() => { audio.pause(); audio.muted = false; audio.currentTime = 0; }).catch(() => {});
        }
      }
      document.removeEventListener("click", unlock);
      document.removeEventListener("touchstart", unlock);
    };
    document.addEventListener("click", unlock, { once: true });
    document.addEventListener("touchstart", unlock, { once: true });
    return () => {
      document.removeEventListener("click", unlock);
      document.removeEventListener("touchstart", unlock);
    };
  }, []);

  const playTrack = (track: Track, newQueue?: Track[]) => {
    setCurrentTrack(track);
    setIsPlaying(true);
    if (newQueue) setQueue(newQueue);
    incrementPlay(track.id);
  };

  const playNext = () => {
    if (!currentTrack || queue.length === 0) return;
    const idx = queue.findIndex((t) => t.id === currentTrack.id);
    const next = queue[idx + 1];
    if (next) playTrack(next, queue);
  };

  const playPrev = () => {
    if (!currentTrack || queue.length === 0) return;
    const idx = queue.findIndex((t) => t.id === currentTrack.id);
    const prev = queue[idx - 1];
    if (prev) playTrack(prev, queue);
  };

  const seekTo = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = seconds;
    if (audio.paused) audio.play().catch(() => {});
  };

  const dismiss = () => {
    const audio = audioRef.current;
    if (audio) { audio.pause(); audio.src = ""; }
    setCurrentTrack(null);
    setIsPlaying(false);
    setIsCountdown(false);
    setIsLive(false);
    setLiveEventId(null);
    setQueue([]);
  };

  return (
    <AudioPlayerContext.Provider value={{
      currentTrack, queue, isPlaying, isLive, isCountdown, liveEventId,
      playTrack, setIsPlaying, setIsLive, setIsCountdown, setLiveEventId,
      playNext, playPrev, seekTo, dismiss, audioRef,
    }}>
      {children}
    </AudioPlayerContext.Provider>
  );
}

export const useAudioPlayer = () => useContext(AudioPlayerContext);
