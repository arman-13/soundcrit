import { createContext, useContext, useEffect, useRef, useState } from "react";
import { createAudioPlayer, setAudioModeAsync, useAudioPlayerStatus, AudioPlayer } from "expo-audio";
import { incrementPlay } from "@/lib/api";
import { Track } from "@/types";

interface AudioPlayerContextType {
  currentTrack: Track | null;
  queue: Track[];
  isPlaying: boolean;
  isLive: boolean;
  isCountdown: boolean;
  liveEventId: number | null;
  currentTime: number;
  duration: number;
  playTrack: (track: Track, queue?: Track[]) => void;
  setIsPlaying: (v: boolean) => void;
  setIsLive: (v: boolean) => void;
  setIsCountdown: (v: boolean) => void;
  setLiveEventId: (id: number | null) => void;
  dismiss: () => void;
  playNext: () => void;
  playPrev: () => void;
  seekTo: (seconds: number) => void;
  player: AudioPlayer;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | null>(null);

let sharedPlayer: AudioPlayer | null = null;
function getSharedPlayer(): AudioPlayer {
  if (!sharedPlayer) sharedPlayer = createAudioPlayer();
  return sharedPlayer;
}

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const player = useRef(getSharedPlayer()).current;
  const status = useAudioPlayerStatus(player);

  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [isCountdown, setIsCountdown] = useState(false);
  const [liveEventId, setLiveEventId] = useState<number | null>(null);
  const lastTrackId = useRef<number | null>(null);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "doNotMix",
    });
  }, []);

  useEffect(() => {
    if (!currentTrack || currentTrack.id === lastTrackId.current) return;
    lastTrackId.current = currentTrack.id;
    player.replace(currentTrack.audioUrl);
    player.play();
    player.setActiveForLockScreen(true, {
      title: currentTrack.title,
      artist: currentTrack.artist,
      albumTitle: currentTrack.albumTitle || undefined,
      artworkUrl: currentTrack.coverImageUrl,
    });
  }, [currentTrack, player]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!status.didJustFinish || isLive) return;
    playNext();
  }, [status.didJustFinish]);

  const playTrack = (track: Track, newQueue?: Track[]) => {
    if (newQueue) setQueue(newQueue);
    incrementPlay(track.id).catch(() => {});

    // Re-selecting the track that is already loaded (typically replaying one that
    // has run to the end) must restart it here: the load effect below de-dupes on
    // lastTrackId and would skip it, leaving the tap with no effect at all.
    if (currentTrack?.id === track.id) {
      player.seekTo(0);
      player.play();
      return;
    }
    setCurrentTrack(track);
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
    player.seekTo(seconds);
    if (!player.playing) player.play();
  };

  const setIsPlaying = (v: boolean) => (v ? player.play() : player.pause());

  const dismiss = () => {
    player.pause();
    player.clearLockScreenControls();
    lastTrackId.current = null;
    setCurrentTrack(null);
    setIsCountdown(false);
    setIsLive(false);
    setLiveEventId(null);
    setQueue([]);
  };

  return (
    <AudioPlayerContext.Provider
      value={{
        currentTrack,
        queue,
        isPlaying: status.playing,
        isLive,
        isCountdown,
        liveEventId,
        currentTime: status.currentTime,
        duration: status.duration,
        playTrack,
        setIsPlaying,
        setIsLive,
        setIsCountdown,
        setLiveEventId,
        playNext,
        playPrev,
        seekTo,
        dismiss,
        player,
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer() {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) throw new Error("useAudioPlayer must be used within AudioPlayerProvider");
  return ctx;
}
