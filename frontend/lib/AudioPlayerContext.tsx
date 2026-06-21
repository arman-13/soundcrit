"use client";

import { incrementPlay } from "@/lib/api";
import { Track } from "@/types";
import { createContext, useContext, useRef, useState } from "react";

interface AudioPlayerContextType {
  currentTrack: Track | null;
  queue: Track[];
  isPlaying: boolean;
  isLive: boolean;
  playTrack: (track: Track, queue?: Track[]) => void;
  setIsPlaying: (v: boolean) => void;
  setIsLive: (v: boolean) => void;
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
  playTrack: () => {},
  setIsPlaying: () => {},
  setIsLive: () => {},
  playNext: () => {},
  playPrev: () => {},
  seekTo: () => {},
  audioRef: { current: null },
});

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
    audio.play().catch(() => {});
  };

  return (
    <AudioPlayerContext.Provider value={{ currentTrack, queue, isPlaying, isLive, playTrack, setIsPlaying, setIsLive, playNext, playPrev, seekTo, audioRef }}>
      {children}
    </AudioPlayerContext.Provider>
  );
}

export const useAudioPlayer = () => useContext(AudioPlayerContext);
