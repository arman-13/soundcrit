import { Album, AlbumWithTracks, PagedResponse, TeamMember, Track } from "@/types";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000").trim();

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    next: { revalidate: 60 },
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
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
  fetchApi<PagedResponse<Track>>(`/api/tracks?pageSize=100`, {
    headers: authHeaders(token),
    cache: "no-store",
  });

// ── Albums ───────────────────────────────────────────────────────────────────
export const getAlbums = () =>
  fetchApi<Album[]>(`/api/albums`);

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

export const removeTrackFromAlbum = (albumId: number, trackId: number, token: string) =>
  fetch(`${API_URL}/api/albums/${albumId}/tracks/${trackId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });

// ── Team ─────────────────────────────────────────────────────────────────────
export const getTeam = () =>
  fetchApi<TeamMember[]>(`/api/team`);
