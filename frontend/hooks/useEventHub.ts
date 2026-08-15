"use client";

import * as signalR from "@microsoft/signalr";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { EventComment } from "@/types";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000").trim();

export interface HubTrack {
  index: number;
  eventTrackId: number;
  trackId: number;
  title: string;
  artist: string;
  audioUrl: string;
  coverImageUrl: string;
  duration: string;
  genre: string | null;
  startedAt: string;
}

export function useEventHub(
  eventId: number,
  token?: string | null,
  onNewComment?: (comment: EventComment) => void,
  onCountdownStarted?: (seconds: number) => void,
  onTrackChanged?: (track: HubTrack) => void,
  onEventStarted?: () => void,
  onTrackSubmitted?: (payload: { trackTitle: string; submitterName: string }) => void,
  onEventEnded?: () => void,
) {
  const [eventStatus, setEventStatus] = useState<string | null>(null);
  const [approvedUserId, setApprovedUserId] = useState<string | null>(null);
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  // Effect Events always see the latest props without becoming effect dependencies,
  // so the hub connection is never torn down just because a parent re-rendered.
  const emitNewComment = useEffectEvent((comment: EventComment) => onNewComment?.(comment));
  const emitCountdownStarted = useEffectEvent((seconds: number) => onCountdownStarted?.(seconds));
  const emitTrackChanged = useEffectEvent((track: HubTrack) => onTrackChanged?.(track));
  const emitEventStarted = useEffectEvent(() => onEventStarted?.());
  const emitTrackSubmitted = useEffectEvent(
    (payload: { trackTitle: string; submitterName: string }) => onTrackSubmitted?.(payload),
  );
  const emitEventEnded = useEffectEvent(() => onEventEnded?.());

  useEffect(() => {
    const builder = new signalR.HubConnectionBuilder()
      .withUrl(`${API_URL}/hubs/event`, {
        ...(token ? { accessTokenFactory: () => token } : {}),
        transport: signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect()
      .withServerTimeout(120000)
      .withKeepAliveInterval(30000)
      .build();

    builder.on("TrackChanged", (track: HubTrack) => {
      emitTrackChanged(track);
    });

    builder.on("CountdownStarted", (seconds: number) => {
      emitCountdownStarted(seconds);
    });

    builder.on("EventStarted", () => {
      emitEventStarted();
    });

    builder.on("EventEnded", () => {
      setEventStatus("Ended");
      emitEventEnded();
    });

    builder.on("NewComment", (comment: EventComment) => {
      emitNewComment(comment);
    });

    builder.on("RequestApproved", (userId: string) => {
      setApprovedUserId(userId);
    });

    builder.on("TrackSubmitted", (payload: { trackTitle: string; submitterName: string }) => {
      emitTrackSubmitted(payload);
    });

    builder.onreconnected(() => {
      builder.invoke("JoinEvent", eventId).catch(() => {});
    });

    let stopped = false;
    builder.start()
      .then(() => {
        if (stopped) { builder.stop(); return; }
        return builder.invoke("JoinEvent", eventId);
      })
      .catch((err) => console.error("[SignalR] Connection failed:", err));

    connectionRef.current = builder;

    return () => {
      stopped = true;
      if (builder.state !== signalR.HubConnectionState.Connecting) {
        builder.invoke("LeaveEvent", eventId).catch(() => {});
      }
      builder.stop();
    };
  }, [eventId, token]);

  return { eventStatus, approvedUserId };
}
