export interface StoryBlock {
  id: string;
  type: "text" | "image" | "image_pair" | "video" | "quote" | "divider";
  timestamp?: number | null;
  content?: string;
  url?: string;
  caption?: string;
  images?: { url: string; caption?: string }[];
}

export interface Track {
  id: number;
  title: string;
  albumTitle: string;
  artist: string;
  genre: string;
  duration: string;
  coverImageUrl: string;
  audioUrl: string;
  publishedAt: string;
  isPublished: boolean;
  playCount: number;
  isFeatured: boolean;
  description?: string;
  story?: string;
  mood?: string;
  storyBlocks?: string | null;
}

export interface Album {
  id: number;
  title: string;
  coverImageUrl: string;
  description?: string;
  releasedAt: string;
  isPublished: boolean;
  trackCount?: number;
}

export interface PublicUserDto {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
}

export interface AlbumTrackDto {
  trackId: number;
  trackNumber: number;
  title: string;
  artist: string;
  duration: string;
  coverImageUrl: string;
  audioUrl: string;
  mood?: string;
  playCount: number;
}

export interface AlbumWithTracks extends Album {
  tracks: AlbumTrackDto[];
}

export interface TeamMember {
  id: number;
  fullName: string;
  role: string;
  bio: string;
  avatarUrl: string;
  email: string;
  phone?: string;
  gitHub?: string;
  linkedIn?: string;
  displayOrder: number;
  isActive: boolean;
}

export interface UserDto {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  createdAt: string;
}

export interface Comment {
  id: number;
  userId: string;
  displayName: string;
  content: string;
  songTimestamp?: number | null;
  createdAt: string;
}

export interface PagedResponse<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface LiveEvent {
  id: number;
  title: string;
  description?: string;
  coverImageUrl?: string;
  scheduledAt: string;
  status: "Upcoming" | "Live" | "Ended";
  hostId: string;
  trackCount: number;
  genres: string[];
}

export interface LiveEventDetail extends LiveEvent {
  hostDisplayName: string;
  hostAvatarUrl?: string;
  tracks: EventTrack[];
  playbackState: PlaybackState;
}

export interface EventTrack {
  id: number;
  trackId: number;
  title: string;
  artist: string;
  duration: string;
  audioUrl: string;
  coverImageUrl: string;
  genre?: string;
  mood?: string;
  order: number;
  status: string;
  userId: string;
  uploadToProfile: boolean;
  description?: string;
}

export interface PlaybackState {
  status: string;
  currentTrackIndex: number;
  currentTrackStartedAt?: string;
  countdownStartedAt?: string;
  serverTime: string;
}

export interface EventSync {
  status: string;
  currentTrackIndex: number;
  elapsedSeconds: number;
  countdownSeconds: number;
  serverTime: string;
}

export interface EventRequest {
  id: number;
  userId: string;
  displayName?: string;
  message?: string;
  status: string;
  requestedAt: string;
}

export interface EventComment {
  id: number;
  eventTrackId: number;
  userId: string;
  displayName: string;
  content: string;
  trackTimestamp: number;
  createdAt: string;
  isAnonymous: boolean;
}
