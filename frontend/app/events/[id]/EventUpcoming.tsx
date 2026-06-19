"use client";

import { useAuth } from "@/contexts/AuthContext";
import { submitJoinRequest, getEventRequests, updateRequestStatus } from "@/lib/api";
import { LiveEventDetail } from "@/types";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

function BigCountdown({ scheduledAt }: { scheduledAt: string }) {
  const [parts, setParts] = useState({ d: 0, h: 0, m: 0, s: 0 });

  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, new Date(scheduledAt).getTime() - Date.now());
      setParts({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [scheduledAt]);

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

export default function EventUpcoming({ event }: { event: LiveEventDetail }) {
  const { user, token } = useAuth();
  const [requestStatus, setRequestStatus] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [requests, setRequests] = useState<import("@/types").EventRequest[]>([]);
  const isHost = user?.id === event.hostId;

  useEffect(() => {
    if (!token) return;
    if (isHost) {
      getEventRequests(event.id, token).then(setRequests).catch(() => {});
    }
  }, [event.id, token, isHost]);

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

      <BigCountdown scheduledAt={event.scheduledAt} />

      <p className="text-xs text-white/25 mb-10">
        {event.trackCount} tracks · {event.genres.slice(0, 3).join(" · ")}
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
      {!user && <Link href="/login" className="text-sm text-white/40 underline underline-offset-2">Sign in to request access</Link>}

      {isHost && requests.length > 0 && (
        <div className="mt-12 text-left">
          <h2 className="text-xs tracking-widests uppercase text-white/25 mb-6">Join Requests</h2>
          <div className="space-y-3">
            {requests.map((r) => (
              <RequestRow key={r.id} request={r} eventId={event.id} token={token!}
                onUpdate={(id, status) => setRequests((prev) => prev.map((x) => x.id === id ? { ...x, status } : x))} />
            ))}
          </div>
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
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white/70">{request.userId}</p>
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
