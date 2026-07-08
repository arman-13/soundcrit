"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useAudioPlayer } from "@/lib/AudioPlayerContext";
import { submitJoinRequest, getEventRequests, updateRequestStatus, getAllTracksAdmin, submitEventTrack, getMyEventRequest, getEventTracks, updateEventTrack, reorderEventTracks, deleteEventTrack, getEvent, updateEvent } from "@/lib/api";
import { useEventHub } from "@/hooks/useEventHub";
import { LiveEventDetail, Track, EventTrack } from "@/types";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import EventLive from "./EventLive";

function BigCountdown({ scheduledAt, onExpire }: { scheduledAt: string; onExpire?: () => void }) {
  const [parts, setParts] = useState({ d: 0, h: 0, m: 0, s: 0 });
  const firedRef = useRef(false);

  useEffect(() => {
    const tick = () => {
      const scheduled = scheduledAt.endsWith("Z") ? scheduledAt : scheduledAt + "Z";
      const diff = Math.max(0, new Date(scheduled).getTime() - Date.now());
      setParts({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
      if (diff === 0 && !firedRef.current) {
        firedRef.current = true;
        onExpire?.();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [scheduledAt, onExpire]);

  return (
    <div className="flex gap-6 justify-center my-12">
      {[["d", parts.d], ["h", parts.h], ["m", parts.m], ["s", parts.s]].map(([label, val]) => (
        <div key={label as string} className="text-center">
          <p className="text-5xl font-light text-white/90 tabular-nums">{String(val).padStart(2, "0")}</p>
          <p className="text-xs text-white/25 uppercase tracking-widest mt-1">{label}</p>
        </div>
      ))}
    </div>
  );
}

export default function EventUpcoming({ event: initialEvent }: { event: LiveEventDetail }) {
  const { token } = useAuth();
  const router = useRouter();
  const [liveEvent, setLiveEvent] = useState<LiveEventDetail | null>(null);
  const onTrackSubmittedRef = useRef<((p: { trackTitle: string; submitterName: string }) => void) | undefined>(undefined);

  const handleEventStarted = useCallback(() => {
    getEvent(initialEvent.id).then((e) => setLiveEvent(e)).catch(() => router.refresh());
  }, [initialEvent.id, router]);

  useEventHub(
    initialEvent.id, token,
    undefined, undefined, undefined,
    handleEventStarted,
    (payload) => onTrackSubmittedRef.current?.(payload),
  );

  if (liveEvent) return <EventLive event={liveEvent} />;
  return <EventUpcomingInner event={initialEvent} onEventStarted={handleEventStarted} onTrackSubmittedRef={onTrackSubmittedRef} />;
}

function EventUpcomingInner({ event, onEventStarted, onTrackSubmittedRef }: { event: LiveEventDetail; onEventStarted: () => void; onTrackSubmittedRef: React.MutableRefObject<((p: { trackTitle: string; submitterName: string }) => void) | undefined> }) {
  const { user, token } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const newTrackId = searchParams.get("newTrackId");
  const [requestStatus, setRequestStatus] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [requests, setRequests] = useState<import("@/types").EventRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [submissions, setSubmissions] = useState<EventTrack[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(true);
  const [myTracks, setMyTracks] = useState<Track[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<number | "">(newTrackId ? Number(newTrackId) : "");
  const [uploadToProfile, setUploadToProfile] = useState(!!newTrackId);
  const [trackSubmitting, setTrackSubmitting] = useState(false);
  const [trackSubmitted, setTrackSubmitted] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(!!newTrackId);
  const [submitMode, setSubmitMode] = useState<"existing" | null>(newTrackId ? "existing" : null);

  const isHost = user?.id === event.hostId;
  const isApproved = !isHost && requestStatus === "Approved";

  useEffect(() => {
    if (!isHost) return;
    onTrackSubmittedRef.current = (payload) =>
      addToast(`New submission: "${payload.trackTitle}" by ${payload.submitterName}`);
    return () => { onTrackSubmittedRef.current = undefined; };
  }, [isHost, onTrackSubmittedRef]);

  const toLocalDatetimeValue = (iso: string) => {
    const d = new Date(iso.endsWith("Z") ? iso : iso + "Z");
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [toasts, setToasts] = useState<{ id: number; message: string }[]>([]);
  const toastId = useRef(0);
  const addToast = (message: string) => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const [editingDate, setEditingDate] = useState(false);
  const [newDateValue, setNewDateValue] = useState("");
  const [dateSaving, setDateSaving] = useState(false);

  const handleDateSave = async () => {
    if (!token || !newDateValue) return;
    setDateSaving(true);
    try {
      const utc = new Date(newDateValue).toISOString();
      await updateEvent(event.id, { title: event.title, description: event.description ?? undefined, coverImageUrl: event.coverImageUrl ?? undefined, scheduledAt: utc }, token);
      event.scheduledAt = utc;
      setEditingDate(false);
    } catch {
      alert("Failed to update date.");
    } finally {
      setDateSaving(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    if (isHost) {
      getEventRequests(event.id, token).then(setRequests).catch(() => {}).finally(() => setRequestsLoading(false));
      getEventTracks(event.id, token).then((tracks) => {
        setSubmissions(tracks);
        if (tracks.some((t) => t.userId === user?.id)) setTrackSubmitted(true);
      }).catch(() => {}).finally(() => setSubmissionsLoading(false));
      getAllTracksAdmin(token).then((res) => setMyTracks(res.data)).catch(() => {});
    } else {
      getMyEventRequest(event.id, token)
        .then(({ status }) => {
          if (status) {
            setRequestStatus(status);
            if (status === "Approved") {
              getAllTracksAdmin(token).then((res) => setMyTracks(res.data)).catch(() => {});
              getEventTracks(event.id, token).then((tracks) => {
                if (tracks.length > 0) setTrackSubmitted(true);
              }).catch(() => {});
            }
          }
        })
        .catch(() => {});
    }
  }, [event.id, token, isHost]);


  const handleTrackSubmit = async () => {
    if (!token || !selectedTrackId) return;
    setTrackSubmitting(true);
    try {
      await submitEventTrack(event.id, Number(selectedTrackId), uploadToProfile, token);
      setTrackSubmitted(true);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to submit track");
    } finally {
      setTrackSubmitting(false);
    }
  };

  const handleRequest = async () => {
    if (!token) return;
    setSubmitting(true);
    try {
      await submitJoinRequest(event.id, message || undefined, token);
      setRequestStatus("Pending");
    } catch {
      setRequestStatus("error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-20 text-center">
      {toasts.length > 0 && (
        <div className="fixed bottom-24 right-6 z-50 flex flex-col gap-2 items-end">
          {toasts.map((t) => (
            <div key={t.id} className="bg-[#1a1a1a] border border-white/10 rounded-lg px-4 py-3 text-sm text-white/70 shadow-xl animate-in fade-in slide-in-from-bottom-2 max-w-xs">
              {t.message}
            </div>
          ))}
        </div>
      )}
      {event.coverImageUrl && (
        <div className="relative w-48 h-48 mx-auto rounded-xl overflow-hidden mb-8">
          <Image src={event.coverImageUrl} alt={event.title} fill className="object-cover opacity-60" />
        </div>
      )}
      <p className="text-xs tracking-widest uppercase text-white/30 mb-3">Upcoming Session</p>
      <h1 className="text-4xl font-light text-white/90 mb-4">{event.title}</h1>
      {event.description && <p className="text-sm text-white/45 leading-relaxed mb-6 max-w-md mx-auto">{event.description}</p>}

      <div className="flex items-center justify-center gap-2 mb-2 text-sm text-white/40">
        {event.hostAvatarUrl && (
          <div className="relative w-5 h-5 rounded-full overflow-hidden">
            <Image src={event.hostAvatarUrl} alt="" fill className="object-cover" />
          </div>
        )}
        <span>Hosted by {event.hostDisplayName}</span>
      </div>

      <BigCountdown scheduledAt={event.scheduledAt} onExpire={onEventStarted} />

      {isHost && (
        <div className="mb-6">
          {editingDate ? (
            <div className="flex items-center justify-center gap-2">
              <input
                type="datetime-local"
                value={newDateValue}
                onChange={(e) => setNewDateValue(e.target.value)}
                className="bg-white/5 border border-white/15 rounded px-3 py-1.5 text-sm text-white/70 focus:outline-none focus:border-white/30 transition-colors"
              />
              <button
                onClick={handleDateSave}
                disabled={dateSaving || !newDateValue}
                className="text-xs px-3 py-1.5 rounded border border-white/20 text-white/60 hover:border-white/40 transition-colors disabled:opacity-40"
              >{dateSaving ? "Saving…" : "Save"}</button>
              <button
                onClick={() => setEditingDate(false)}
                className="text-xs text-white/25 hover:text-white/50 transition-colors"
              >Cancel</button>
            </div>
          ) : (
            <button
              onClick={() => { setNewDateValue(toLocalDatetimeValue(event.scheduledAt)); setEditingDate(true); }}
              className="text-xs text-white/25 hover:text-white/50 transition-colors"
            >
              Edit date & time
            </button>
          )}
        </div>
      )}

      <p className="text-xs text-white/25 mb-10">
        {event.trackCount} tracks{event.genres?.length > 0 ? ` · ${event.genres.slice(0, 3).join(" · ")}` : ""}
      </p>

      {!isHost && user && !requestStatus && (
        <div className="max-w-sm mx-auto space-y-3">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Why do you want to join? (optional)"
            rows={2}
            className="w-full bg-white/5 border border-white/10 rounded px-4 py-2.5 text-sm text-white/75 placeholder:text-white/25 focus:outline-none focus:border-white/25 transition-colors resize-none"
          />
          <button onClick={handleRequest} disabled={submitting}
            className="w-full bg-white text-black text-sm font-medium py-3 rounded hover:bg-white/90 transition-colors disabled:opacity-50">
            {submitting ? "Requesting…" : "Request to Join"}
          </button>
        </div>
      )}
      {requestStatus === "Pending" && <p className="text-sm text-white/40">Request sent — waiting for approval.</p>}
      {requestStatus === "Rejected" && <p className="text-sm text-red-400/60">Your request was not approved.</p>}
      {!user && <Link href="/login" className="text-sm text-white/40 underline underline-offset-2">Sign in to request access</Link>}

      {/* Track submission — for approved members and host */}
      {(isApproved || isHost) && (
        <div className="mt-16 max-w-sm mx-auto text-left border border-white/10 rounded-xl overflow-hidden">
          <button
            onClick={() => { setSubmitOpen((o) => !o); setSubmitMode(null); }}
            className="w-full flex items-center justify-between px-5 py-4 text-sm text-white/60 hover:text-white/80 transition-colors"
          >
            <span className="tracking-widest uppercase text-xs text-white/40">Submit a Track</span>
            <span className={`transition-transform duration-200 ${submitOpen ? "rotate-180" : ""}`}>▾</span>
          </button>

          {submitOpen && (
            <div className="px-5 pb-5 border-t border-white/8">
              {trackSubmitted ? (
                <div className="py-5 text-center space-y-1">
                  <p className="text-2xl">🎧</p>
                  <p className="text-sm text-white/70">You're in the mix.</p>
                  <p className="text-xs text-white/30">Your track is queued — one submission per session.</p>
                </div>
              ) : submitMode === null ? (
                <div className="py-4 space-y-3">
                  <button
                    onClick={() => setSubmitMode("existing")}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-white/[0.03] border border-white/8 hover:border-white/20 transition-colors text-left"
                  >
                    <div>
                      <p className="text-sm text-white/70">Use an existing track</p>
                      <p className="text-xs text-white/30 mt-0.5">Pick from your uploaded songs</p>
                    </div>
                  </button>
                  <Link
                    href={`/my-music?returnTo=/events/${event.id}&upload=1`}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-white/[0.03] border border-white/8 hover:border-white/20 transition-colors text-left"
                  >
                    <div>
                      <p className="text-sm text-white/70">Upload a new track</p>
                      <p className="text-xs text-white/30 mt-0.5">You'll be brought back here after uploading</p>
                    </div>
                  </Link>
                </div>
              ) : (
                <div className="py-4 space-y-4">
                  <button onClick={() => setSubmitMode(null)} className="text-xs text-white/30 hover:text-white/50 transition-colors">← Back</button>
                  <select
                    value={selectedTrackId}
                    onChange={(e) => setSelectedTrackId(e.target.value ? Number(e.target.value) : "")}
                    className="w-full bg-white/5 border border-white/10 rounded px-4 py-2.5 text-sm text-white/75 focus:outline-none focus:border-white/25 transition-colors"
                  >
                    <option value="">Select one of your tracks…</option>
                    {myTracks.map((t) => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>
                  <label className="flex items-center gap-2 text-sm text-white/45 cursor-pointer">
                    <input type="checkbox" checked={uploadToProfile} onChange={(e) => setUploadToProfile(e.target.checked)} className="accent-white" />
                    Publish to my profile after the session
                  </label>
                  <button
                    onClick={handleTrackSubmit}
                    disabled={trackSubmitting || !selectedTrackId}
                    className="w-full bg-white text-black text-sm font-medium py-2.5 rounded hover:bg-white/90 transition-colors disabled:opacity-40"
                  >
                    {trackSubmitting ? "Submitting…" : "Submit Track"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {isHost && (
        <div className="mt-12 text-left space-y-10">
          <div>
            <h2 className="text-xs tracking-widest uppercase text-white/25 mb-4">Join Requests</h2>
            {requestsLoading ? (
              <div className="flex items-center gap-2 py-2">
                <span className="w-3 h-3 rounded-full border border-white/20 border-t-white/60 animate-spin" />
              </div>
            ) : requests.length === 0 ? (
              <p className="text-sm text-white/25">No requests yet.</p>
            ) : (
              <div className="space-y-3">
                {requests.map((r) => (
                  <RequestRow key={r.id} request={r} eventId={event.id} token={token!}
                    onUpdate={(id, status) => setRequests((prev) => prev.map((x) => x.id === id ? { ...x, status } : x))} />
                ))}
              </div>
            )}
          </div>

          <TrackSubmissionsList
            submissions={submissions}
            loading={submissionsLoading}
            eventId={event.id}
            token={token!}
            onUpdate={(id, status) => setSubmissions((prev) => prev.map((x) => x.id === id ? { ...x, status } : x))}
            onReorder={setSubmissions}
            onDelete={(id) => setSubmissions((prev) => prev.filter((x) => x.id !== id))}
          />
        </div>
      )}
    </div>
  );
}

function TrackSubmissionsList({ submissions, loading, eventId, token, onUpdate, onReorder, onDelete }: {
  submissions: EventTrack[];
  loading: boolean;
  eventId: number;
  token: string;
  onUpdate: (id: number, status: string) => void;
  onReorder: (tracks: EventTrack[]) => void;
  onDelete: (id: number) => void;
}) {
  const { playTrack, currentTrack, isPlaying, setIsPlaying } = useAudioPlayer();
  const dragId = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const handlePlay = (t: EventTrack) => {
    const asTrack: Track = {
      id: t.trackId, title: t.title, artist: t.artist, duration: t.duration,
      audioUrl: t.audioUrl, coverImageUrl: t.coverImageUrl, genre: t.genre ?? "",
      mood: t.mood, description: t.description,
      albumTitle: "", publishedAt: "", isPublished: true, playCount: 0, isFeatured: false,
    };
    if (currentTrack?.id === t.trackId) {
      setIsPlaying(!isPlaying);
    } else {
      playTrack(asTrack, [asTrack]);
    }
  };

  const saveOrder = async (reordered: EventTrack[]) => {
    const items = reordered
      .filter((x) => x.status === "Approved")
      .map((x, idx) => ({ id: x.id, order: idx + 1 }));
    await reorderEventTracks(eventId, items, token);
  };

  const handleDrop = async (targetId: number) => {
    if (dragId.current === null || dragId.current === targetId) return;
    const approved = submissions.filter((x) => x.status === "Approved");
    const fromIdx = approved.findIndex((x) => x.id === dragId.current);
    const toIdx = approved.findIndex((x) => x.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;

    const reordered = [...approved];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);

    const pending = submissions.filter((x) => x.status !== "Approved");
    const next = [...reordered, ...pending];
    onReorder(next);
    await saveOrder(reordered);
  };

  return (
    <div>
      <h2 className="text-xs tracking-widest uppercase text-white/25 mb-4">Track Submissions</h2>
      {loading ? (
        <div className="flex items-center gap-2 py-2">
          <span className="w-3 h-3 rounded-full border border-white/20 border-t-white/60 animate-spin" />
        </div>
      ) : submissions.length === 0 ? (
        <p className="text-sm text-white/25">No tracks submitted yet.</p>
      ) : (
        <div className="space-y-3">
          {submissions.map((t, i) => (
            <div
              key={t.id}
              draggable={t.status === "Approved"}
              onDragStart={() => { dragId.current = t.id; }}
              onDragEnd={() => { dragId.current = null; setDragOver(null); }}
              onDragOver={(e) => { if (t.status === "Approved") { e.preventDefault(); setDragOver(t.id); } }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => { e.preventDefault(); setDragOver(null); handleDrop(t.id); }}
              className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                dragOver === t.id && dragId.current !== t.id
                  ? "border-white/30 bg-white/[0.05]"
                  : "border-white/8 bg-white/[0.02]"
              }`}
            >
              {t.status === "Approved" ? (
                <div className="shrink-0 cursor-grab active:cursor-grabbing text-white/20 hover:text-white/50 transition-colors select-none px-0.5">
                  <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor">
                    <circle cx="3" cy="3" r="1.5"/>
                    <circle cx="9" cy="3" r="1.5"/>
                    <circle cx="3" cy="8" r="1.5"/>
                    <circle cx="9" cy="8" r="1.5"/>
                    <circle cx="3" cy="13" r="1.5"/>
                    <circle cx="9" cy="13" r="1.5"/>
                  </svg>
                </div>
              ) : null}
              <button
                onClick={() => handlePlay(t)}
                className="relative w-10 h-10 rounded overflow-hidden shrink-0 bg-white/5 group"
              >
                <Image src={t.coverImageUrl} alt={t.title} fill className="object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                  {currentTrack?.id === t.trackId && isPlaying ? (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="white">
                      <rect x="1" y="1" width="3.5" height="10" rx="1"/>
                      <rect x="7.5" y="1" width="3.5" height="10" rx="1"/>
                    </svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="white">
                      <path d="M2 1.5l9 4.5-9 4.5z"/>
                    </svg>
                  )}
                </div>
                {currentTrack?.id === t.trackId && isPlaying && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  </div>
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/75 truncate">{t.title}</p>
                <p className="text-xs text-white/35">{t.artist} · {t.duration}</p>
              </div>
              <span className={`text-xs shrink-0 ${t.status === "Approved" ? "text-green-400/60" : t.status === "Rejected" ? "text-red-400/60" : "text-white/30"}`}>
                {t.status}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                {t.status === "Pending" && (
                  <>
                    <button
                      onClick={async () => {
                        await updateEventTrack(eventId, t.id, "Approved", i + 1, token);
                        onUpdate(t.id, "Approved");
                      }}
                      className="text-xs px-3 py-1.5 rounded border border-white/20 text-white/60 hover:border-white/40 transition-colors"
                    >Approve</button>
                    <button
                      onClick={async () => {
                        await updateEventTrack(eventId, t.id, "Rejected", i + 1, token);
                        onUpdate(t.id, "Rejected");
                      }}
                      className="text-xs px-3 py-1.5 rounded border border-white/10 text-white/30 hover:text-red-400/70 transition-colors"
                    >Reject</button>
                  </>
                )}
                <button
                  onClick={async () => {
                    await deleteEventTrack(eventId, t.id, token);
                    onDelete(t.id);
                  }}
                  className="text-white/20 hover:text-red-400/70 transition-colors ml-1"
                  aria-label="Remove track"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RequestRow({ request, eventId, token, onUpdate }: {
  request: import("@/types").EventRequest;
  eventId: number; token: string;
  onUpdate: (id: number, status: string) => void;
}) {
  const act = async (status: string) => {
    await updateRequestStatus(eventId, request.id, status, token);
    onUpdate(request.id, status);
  };
  return (
    <div className="flex items-center gap-4 p-4 rounded-lg bg-white/[0.02] border border-white/8">
      {request.username ? (
        <Link href={`/artists/${request.username}`} target="_blank" className="shrink-0 group">
          <div className="relative w-8 h-8 rounded-full overflow-hidden bg-white/10 ring-1 ring-white/10 group-hover:ring-white/30 transition-all">
            {request.avatarUrl ? (
              <Image src={request.avatarUrl} alt={request.displayName ?? ""} fill className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-white/50">
                {(request.displayName ?? request.username)?.[0]?.toUpperCase()}
              </div>
            )}
          </div>
        </Link>
      ) : (
        <div className="w-8 h-8 rounded-full bg-white/10 shrink-0 flex items-center justify-center text-xs text-white/50">
          {(request.displayName ?? request.userId)?.[0]?.toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white/70">{request.displayName ?? request.userId}</p>
        {request.message && <p className="text-xs text-white/40 mt-0.5">{request.message}</p>}
      </div>
      {request.status === "Pending" ? (
        <div className="flex gap-2">
          <button onClick={() => act("Approved")} className="text-xs px-3 py-1.5 rounded border border-white/20 text-white/60 hover:border-white/40 transition-colors">Approve</button>
          <button onClick={() => act("Rejected")} className="text-xs px-3 py-1.5 rounded border border-white/10 text-white/30 hover:text-red-400/70 transition-colors">Reject</button>
        </div>
      ) : (
        <span className={`text-xs ${request.status === "Approved" ? "text-green-400/60" : "text-red-400/60"}`}>{request.status}</span>
      )}
    </div>
  );
}
