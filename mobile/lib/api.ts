import {
  Album,
  AlbumWithTracks,
  Comment,
  EventComment,
  EventRequest,
  EventSync,
  EventTrack,
  LiveEvent,
  LiveEventDetail,
  PagedResponse,
  PublicUserDto,
  SuggestedArtist,
  TeamMember,
  Track,
} from "@/types";

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:5000").trim();

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, options);
  } catch (err) {
    // Logged here because many call sites end in `.catch(() => {})`, which left
    // failing requests with no trace anywhere. Dev builds only.
    if (__DEV__) {
      console.warn(`[api] ${options?.method ?? "GET"} ${path} failed to reach the server:`, err);
    }
    throw err;
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (__DEV__) {
      console.warn(`[api] ${options?.method ?? "GET"} ${path} → ${res.status}`, body);
    }
    throw new Error(`API error: ${res.status} — ${body}`);
  }
  if (res.status === 204) return null as T;
  const text = await res.text();
  if (!text) return null as T;
  return JSON.parse(text);
}

function authHeaders(token: string) {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

// ── Tracks ──────────────────────────────────────────────────────────────────
export const getTracks = (page = 1, pageSize = 20) =>
  fetchApi<PagedResponse<Track>>(`/api/tracks?page=${page}&pageSize=${pageSize}`);

export const getTrack = (id: number) => fetchApi<Track>(`/api/tracks/${id}`);

export const getFeaturedTracks = () => fetchApi<Track[]>(`/api/tracks/featured`);

export const getChartedTracks = () => fetchApi<Track[]>(`/api/tracks/charted`);

export const getAlbumTracks = (albumId: number) =>
  fetchApi<PagedResponse<Track>>(`/api/tracks?albumId=${albumId}&pageSize=50`);

export const incrementPlay = (id: number) =>
  fetch(`${API_URL}/api/tracks/${id}/play`, { method: "POST" });

export const createTrack = (data: Partial<Track>, token: string) =>
  fetchApi<Track>(`/api/tracks`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });

export const updateTrack = (id: number, data: Partial<Track>, token: string) =>
  fetchApi<Track>(`/api/tracks/${id}`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify({ id, ...data }),
  });

export const deleteTrack = (id: number, token: string) =>
  fetchApi<void>(`/api/tracks/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });

export const getAllTracksAdmin = (token: string) =>
  fetchApi<PagedResponse<Track>>(`/api/tracks?pageSize=100&all=true`, {
    headers: authHeaders(token),
  });

export const getTracksFollowing = (token: string, page = 1, pageSize = 10) =>
  fetchApi<PagedResponse<Track>>(`/api/tracks/following?page=${page}&pageSize=${pageSize}`, {
    headers: authHeaders(token),
  });

// ── Albums ───────────────────────────────────────────────────────────────────
export const getAlbums = () => fetchApi<Album[]>(`/api/albums`);

export const getMyAlbums = (token: string) =>
  fetchApi<Album[]>(`/api/albums?mine=true`, { headers: { Authorization: `Bearer ${token}` } });

export const getAlbum = (id: number) => fetchApi<AlbumWithTracks>(`/api/albums/${id}`);

export const createAlbum = (data: Partial<Album>, token: string) =>
  fetchApi<Album>(`/api/albums`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });

export const updateAlbum = (id: number, data: Partial<Album>, token: string) =>
  fetchApi<Album>(`/api/albums/${id}`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify({ id, ...data }),
  });

export const deleteAlbum = (id: number, token: string) =>
  fetchApi<void>(`/api/albums/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });

export const addTrackToAlbum = (albumId: number, trackId: number, trackNumber: number, token: string) =>
  fetchApi<void>(`/api/albums/${albumId}/tracks`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ trackId, trackNumber }),
  });

export const reorderAlbumTracks = (albumId: number, items: { trackId: number; trackNumber: number }[], token: string) =>
  fetchApi<void>(`/api/albums/${albumId}/tracks/reorder`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(items),
  });

export const removeTrackFromAlbum = (albumId: number, trackId: number, token: string) =>
  fetchApi<void>(`/api/albums/${albumId}/tracks/${trackId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });

// ── Artist (public) ───────────────────────────────────────────────────────────
export const getArtistProfile = (name: string) =>
  fetchApi<PublicUserDto>(`/api/users/${encodeURIComponent(name)}`);

export const getArtistTracks = (artist: string) =>
  fetchApi<PagedResponse<Track>>(`/api/tracks?artist=${encodeURIComponent(artist)}&pageSize=100`);

export const getArtistAlbums = (artist: string) =>
  fetchApi<Album[]>(`/api/albums?artist=${encodeURIComponent(artist)}`);

export const getArtistEvents = (userId: string) =>
  fetchApi<LiveEvent[]>(`/api/events/by-user/${encodeURIComponent(userId)}`);

// ── Comments ─────────────────────────────────────────────────────────────────
export const getComments = (trackId: number) => fetchApi<Comment[]>(`/api/tracks/${trackId}/comments`);

export const postComment = (trackId: number, content: string, songTimestamp: number | null, token: string) =>
  fetchApi<Comment>(`/api/tracks/${trackId}/comments`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ content, songTimestamp }),
  });

export const deleteComment = (trackId: number, commentId: number, token: string) =>
  fetchApi<void>(`/api/tracks/${trackId}/comments/${commentId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

export const getAlbumComments = (albumId: number) => fetchApi<Comment[]>(`/api/albums/${albumId}/comments`);

export const postAlbumComment = (albumId: number, content: string, token: string) =>
  fetchApi<Comment>(`/api/albums/${albumId}/comments`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ content, songTimestamp: null }),
  });

export const deleteAlbumComment = (albumId: number, commentId: number, token: string) =>
  fetchApi<void>(`/api/albums/${albumId}/comments/${commentId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

// ── Follow ────────────────────────────────────────────────────────────────────
export const getFollowers = (userId: string, token?: string) =>
  fetchApi<{ count: number; isFollowing: boolean }>(`/api/users/${userId}/followers`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

export const getFollowing = (userId: string) => fetchApi<PublicUserDto[]>(`/api/users/${userId}/following`);

export const followUser = (userId: string, token: string) =>
  fetchApi<void>(`/api/users/${userId}/follow`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

export const unfollowUser = (userId: string, token: string) =>
  fetchApi<void>(`/api/users/${userId}/follow`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

export const getSuggestedArtists = (token?: string | null, take = 10) =>
  fetchApi<SuggestedArtist[]>(`/api/artists/suggested?take=${take}`, {
    headers: token ? authHeaders(token) : {},
  });

// ── Team ─────────────────────────────────────────────────────────────────────
export const getTeam = () => fetchApi<TeamMember[]>(`/api/team`);

// ── Events ──────────────────────────────────────────────────────────────────
export const getEvents = () => fetchApi<LiveEvent[]>(`/api/events`);

export const getEventsForYou = (token: string) =>
  fetchApi<LiveEvent[]>(`/api/events/for-you`, {
    headers: authHeaders(token),
  });

// ── Search ───────────────────────────────────────────────────────────────────
export const searchTracks = (q: string) =>
  fetchApi<PagedResponse<Track>>(`/api/tracks?search=${encodeURIComponent(q)}&pageSize=20`);

export const searchAlbums = (q: string) => fetchApi<Album[]>(`/api/albums?search=${encodeURIComponent(q)}`);

export const searchArtists = (q: string) => fetchApi<PublicUserDto[]>(`/api/users/search?q=${encodeURIComponent(q)}`);

export const searchEvents = (q: string) => fetchApi<LiveEvent[]>(`/api/events?search=${encodeURIComponent(q)}`);

export const getEvent = (id: number) => fetchApi<LiveEventDetail>(`/api/events/${id}`);

export const getEventSync = (eventId: number) => fetchApi<EventSync>(`/api/events/${eventId}/sync`);

export const getEventRequests = (eventId: number, token: string) =>
  fetchApi<EventRequest[]>(`/api/events/${eventId}/requests`, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const getMyEventRequest = (eventId: number, token: string) =>
  fetchApi<{ status: string | null }>(`/api/events/${eventId}/requests/mine`, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const submitJoinRequest = (eventId: number, message: string | undefined, token: string) =>
  fetchApi<void>(`/api/events/${eventId}/requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ message }),
  });

export const getEventComments = (eventId: number, eventTrackId: number) =>
  fetchApi<EventComment[]>(`/api/events/${eventId}/comments/${eventTrackId}`);

export const postEventComment = (
  eventId: number,
  body: { content: string; eventTrackId: number; trackTimestamp: number; isAnonymous: boolean },
  token: string
) =>
  fetchApi<EventComment>(`/api/events/${eventId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });

export const getEventTracks = (eventId: number, token: string) =>
  fetchApi<EventTrack[]>(`/api/events/${eventId}/tracks`, {
    headers: { Authorization: `Bearer ${token}` },
  });

// ── Auth-adjacent ──────────────────────────────────────────────────────────────
export const forgotPassword = (email: string) =>
  fetchApi<void>("/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

export const resetPassword = (email: string, token: string, newPassword: string) =>
  fetchApi<void>("/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, token, newPassword }),
  });

export const verifyEmail = (email: string, token: string) =>
  fetchApi<void>("/api/auth/verify-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, token }),
  });

// ── Upload ─────────────────────────────────────────────────────────────────────
export const uploadImage = async (uri: string, fileName: string, mimeType: string, token: string): Promise<string> => {
  const form = new FormData();
  // @ts-expect-error React Native FormData accepts this shape for file uploads
  form.append("file", { uri, name: fileName, type: mimeType });
  const res = await fetch(`${API_URL}/api/upload/image`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  const { url } = await res.json();
  return url;
};

export const uploadAudio = async (
  uri: string,
  fileName: string,
  mimeType: string,
  token: string
): Promise<{ url: string; duration: string }> => {
  const form = new FormData();
  // @ts-expect-error React Native FormData accepts this shape for file uploads
  form.append("file", { uri, name: fileName, type: mimeType });
  const res = await fetch(`${API_URL}/api/upload/audio`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return res.json();
};
