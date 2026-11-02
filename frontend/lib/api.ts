import { Album, AlbumWithTracks, Comment, EventComment, EventRequest, EventSync, EventTrack, LiveEvent, LiveEventDetail, PagedResponse, PublicUserDto, TeamMember, Track } from "@/types";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000").trim();

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, options);
  } catch (err) {
    // Logged here because a great many call sites end in `.catch(() => {})`.
    // A failing request used to leave no trace anywhere — that is exactly how
    // the My Music albums bug stayed invisible, sending an unauthenticated
    // request on every page load with nothing reported.
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[api] ${options?.method ?? "GET"} ${path} failed to reach the server:`, err);
    }
    throw err;
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (process.env.NODE_ENV !== "production") {
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

export const getTrack = (id: number) =>
  fetchApi<Track>(`/api/tracks/${id}`);

export const getFeaturedTracks = () =>
  fetchApi<Track[]>(`/api/tracks/featured`);

export const getChartedTracks = () =>
  fetchApi<Track[]>(`/api/tracks/charted`);

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
  fetch(`${API_URL}/api/tracks/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });

export const getAllTracksAdmin = (token: string) =>
  fetchApi<PagedResponse<Track>>(`/api/tracks?pageSize=100&all=true`, {
    headers: authHeaders(token),
    cache: "no-store",
  });

// ── Albums ───────────────────────────────────────────────────────────────────
export const getAlbums = () =>
  fetchApi<Album[]>(`/api/albums`);

export const getMyAlbums = (token: string) =>
  fetchApi<Album[]>(`/api/albums?mine=true`, { headers: { Authorization: `Bearer ${token}` } });

export const getAlbum = (id: number) =>
  fetchApi<AlbumWithTracks>(`/api/albums/${id}`);

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
  fetch(`${API_URL}/api/albums/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });

export const addTrackToAlbum = (albumId: number, trackId: number, trackNumber: number, token: string) =>
  fetch(`${API_URL}/api/albums/${albumId}/tracks`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ trackId, trackNumber }),
  });

export const reorderAlbumTracks = (albumId: number, items: { trackId: number; trackNumber: number }[], token: string) =>
  fetch(`${API_URL}/api/albums/${albumId}/tracks/reorder`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(items),
  });

export const removeTrackFromAlbum = (albumId: number, trackId: number, token: string) =>
  fetch(`${API_URL}/api/albums/${albumId}/tracks/${trackId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });

// ── Artist (public) ───────────────────────────────────────────────────────────
export const getArtists = (take = 20) =>
  fetchApi<PublicUserDto[]>(`/api/users/artists?take=${take}`);

export const getArtistProfile = (name: string) =>
  fetchApi<PublicUserDto>(`/api/users/${encodeURIComponent(name)}`);

export const getArtistTracks = (artist: string) =>
  fetchApi<PagedResponse<Track>>(`/api/tracks?artist=${encodeURIComponent(artist)}&pageSize=100`);

export const getArtistAlbums = (artist: string) =>
  fetchApi<Album[]>(`/api/albums?artist=${encodeURIComponent(artist)}`);

export const getArtistEvents = (userId: string) =>
  fetchApi<LiveEvent[]>(`/api/events/by-user/${encodeURIComponent(userId)}`);

// ── Comments ─────────────────────────────────────────────────────────────────
export const getComments = (trackId: number) =>
  fetchApi<Comment[]>(`/api/tracks/${trackId}/comments`);

export const postComment = (trackId: number, content: string, songTimestamp: number | null, token: string) =>
  fetchApi<Comment>(`/api/tracks/${trackId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ content, songTimestamp }),
  });

export const deleteComment = (trackId: number, commentId: number, token: string) =>
  fetchApi<void>(`/api/tracks/${trackId}/comments/${commentId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

export const getAlbumComments = (albumId: number) =>
  fetchApi<Comment[]>(`/api/albums/${albumId}/comments`);

export const postAlbumComment = (albumId: number, content: string, token: string) =>
  fetchApi<Comment>(`/api/albums/${albumId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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

// ── Team ─────────────────────────────────────────────────────────────────────
export const getTeam = () =>
  fetchApi<TeamMember[]>(`/api/team`);

// ── Events ────────────────────────────────────────────────────────────────────
export const getEvents = () =>
  fetchApi<LiveEvent[]>(`/api/events`);

export const getEvent = (id: number) =>
  fetchApi<LiveEventDetail>(`/api/events/${id}`);

export const createEvent = (data: { title: string; description?: string; coverImageUrl?: string; scheduledAt: string }, token: string) =>
  fetchApi<{ id: number }>(`/api/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });

export const updateEvent = (id: number, data: { title: string; description?: string; coverImageUrl?: string; scheduledAt: string }, token: string) =>
  fetchApi<void>(`/api/events/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });

export const deleteEvent = (id: number, token: string) =>
  fetchApi<void>(`/api/events/${id}`, {
    method: "DELETE",
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

export const getEventRequests = (eventId: number, token: string) =>
  fetchApi<EventRequest[]>(`/api/events/${eventId}/requests`, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const updateRequestStatus = (eventId: number, requestId: number, status: string, token: string) =>
  fetchApi<void>(`/api/events/${eventId}/requests/${requestId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status }),
  });

export const submitEventTrack = (eventId: number, trackId: number, uploadToProfile: boolean, token: string) =>
  fetchApi<void>(`/api/events/${eventId}/tracks`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ trackId, uploadToProfile }),
  });

export const getEventTracks = (eventId: number, token: string) =>
  fetchApi<EventTrack[]>(`/api/events/${eventId}/tracks`, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const updateEventTrack = (eventId: number, trackId: number, status: string, order: number, token: string) =>
  fetchApi<void>(`/api/events/${eventId}/tracks/${trackId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status, order }),
  });

export const deleteEventTrack = (eventId: number, trackId: number, token: string) =>
  fetchApi<void>(`/api/events/${eventId}/tracks/${trackId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

export const reorderEventTracks = (eventId: number, items: { id: number; order: number }[], token: string) =>
  fetchApi<void>(`/api/events/${eventId}/tracks/reorder`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });

export const getEventSync = (eventId: number) =>
  fetchApi<EventSync>(`/api/events/${eventId}/sync`);

export const postEventComment = (eventId: number, body: { content: string; eventTrackId: number; trackTimestamp: number; isAnonymous: boolean }, token: string) =>
  fetchApi<EventComment>(`/api/events/${eventId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });

export const getEventComments = (eventId: number, eventTrackId: number) =>
  fetchApi<EventComment[]>(`/api/events/${eventId}/comments/${eventTrackId}`);

// ── AI ────────────────────────────────────────────────────────────────────────
export const getArtistRecap = (token: string) =>
  fetchApi<{ recap: string | null; generatedAt: string | null }>(`/api/ai/artist-recap`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

export const generateArtistRecap = (token: string) =>
  fetchApi<{ recap: string; generatedAt: string }>(`/api/ai/artist-recap/generate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

export const getEventSummary = (eventId: number) =>
  fetchApi<{ summary: string | null; generatedAt: string | null; hasNewComments: boolean }>(
    `/api/ai/event-summary/${eventId}`
  );

export const regenerateEventSummary = (eventId: number, token: string) =>
  fetchApi<{ summary: string }>(`/api/ai/event-summary/${eventId}/regenerate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

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
